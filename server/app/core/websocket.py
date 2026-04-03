"""WebSocket connection manager for live classroom flows."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Set

from fastapi import WebSocket


SHANGHAI_TZ = timezone(timedelta(hours=8))


def shanghai_now() -> datetime:
    return datetime.now(SHANGHAI_TZ)


class ConnectionManager:
    """Manages WebSocket connections and in-memory classroom state."""

    def __init__(self) -> None:
        self.class_rooms: Dict[str, dict] = {}
        self.student_connections: Dict[str, WebSocket] = {}
        self.teacher_connections: Dict[str, WebSocket] = {}
        self.task_submissions: Dict[str, Set[str]] = {}

    async def create_room(self, class_id: str, teacher_id: str, teacher_ws: WebSocket):
        self.class_rooms[class_id] = {
            "teacher_ws": teacher_ws,
            "teacher_id": teacher_id,
            "student_wss": {},
            "current_task": None,
            "current_task_group": None,
            "current_challenge": None,
            "task_submissions": {},
            "task_group_submissions": {},
            "published_tasks_history": [],
            "pending_shares": {},
            "share_rate_limit": {},
            "_recently_ended_challenges": set(),
            "created_at": shanghai_now().isoformat(),
        }
        self.teacher_connections[teacher_id] = teacher_ws
        return self.class_rooms[class_id]

    async def join_room(self, class_id: str, student_id: str, student_ws: WebSocket):
        if class_id not in self.class_rooms:
            return False

        self.class_rooms[class_id]["student_wss"][student_id] = student_ws
        self.student_connections[student_id] = student_ws
        return True

    async def leave_room(self, class_id: str, student_id: str):
        if class_id in self.class_rooms and student_id in self.class_rooms[class_id]["student_wss"]:
            del self.class_rooms[class_id]["student_wss"][student_id]
        self.student_connections.pop(student_id, None)

    async def close_room(self, class_id: str):
        if class_id not in self.class_rooms:
            return

        room = self.class_rooms[class_id]
        for student_id, ws in list(room["student_wss"].items()):
            try:
                await ws.send_json({"type": "room_closed", "message": "老师已结束课堂。"})
                await ws.close()
            except Exception:
                pass
            self.student_connections.pop(student_id, None)

        teacher_id = room["teacher_id"]
        self.teacher_connections.pop(teacher_id, None)
        # Clean up pending shares and rate limits
        room.pop("pending_shares", None)
        room.pop("share_rate_limit", None)
        del self.class_rooms[class_id]

    async def broadcast_to_students(self, class_id: str, message: dict, exclude: Optional[str] = None):
        if class_id not in self.class_rooms:
            return

        for student_id, ws in list(self.class_rooms[class_id]["student_wss"].items()):
            if exclude and student_id == exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def send_to_teacher(self, class_id: str, message: dict):
        room = self.class_rooms.get(class_id)
        if not room:
            return

        teacher_ws = room.get("teacher_ws")
        if not teacher_ws:
            return

        try:
            await teacher_ws.send_json(message)
        except Exception:
            pass

    async def send_to_student(self, class_id: str, student_id: str, message: dict):
        ws = self.class_rooms.get(class_id, {}).get("student_wss", {}).get(student_id)
        if not ws:
            ws = self.student_connections.get(student_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                pass

    def _check_share_rate_limit(self, class_id: str, student_id: str) -> bool:
        """Return True if the student is within rate limit (3 per 60s)."""
        import time
        room = self.class_rooms.get(class_id)
        if not room:
            return False
        key = student_id
        now = time.time()
        timestamps = room.get("share_rate_limit", {}).get(key, [])
        # Keep only timestamps within last 60s
        timestamps = [t for t in timestamps if now - t < 60]
        room.setdefault("share_rate_limit", {})[key] = timestamps
        if len(timestamps) >= 3:
            return False
        timestamps.append(now)
        return True

    async def add_pending_share(self, class_id: str, share_id: str, data: dict):
        room = self.class_rooms.get(class_id)
        if not room:
            return
        room.setdefault("pending_shares", {})[share_id] = data
        await self.send_to_teacher(class_id, data)

    async def approve_and_broadcast(self, class_id: str, share_id: str, broadcast_data: dict):
        room = self.class_rooms.get(class_id)
        if not room:
            return
        share = room.get("pending_shares", {}).pop(share_id, None)
        if not share:
            return
        student_id = share.get("student_id")
        # Broadcast to all students
        await self.broadcast_to_students(class_id, broadcast_data)
        # Also send to teacher so they see it in their feed
        await self.send_to_teacher(class_id, broadcast_data)
        await self.send_to_teacher(
            class_id,
            {
                "type": "share_request_response",
                "share_id": share_id,
                "status": "approved",
                "teacher_comment": broadcast_data.get("teacher_comment"),
            },
        )
        # Notify the originating student of approval
        if student_id:
            await self.send_to_student(
                class_id, student_id,
                {"type": "share_request_response", "share_id": share_id, "status": "approved"},
            )

    async def reject_share(self, class_id: str, share_id: str):
        room = self.class_rooms.get(class_id)
        if not room:
            return
        share = room.get("pending_shares", {}).pop(share_id, None)
        if not share:
            return
        student_id = share.get("student_id")
        await self.send_to_teacher(
            class_id,
            {
                "type": "share_request_response",
                "share_id": share_id,
                "status": "rejected",
            },
        )
        if student_id:
            await self.send_to_student(
                class_id, student_id,
                {"type": "share_request_response", "share_id": share_id, "status": "rejected"},
            )

    async def publish_task(self, class_id: str, task_data: dict):
        if class_id not in self.class_rooms:
            return

        room = self.class_rooms[class_id]
        room["current_task"] = task_data
        room["current_task_group"] = None
        room["current_challenge"] = None
        room["task_submissions"][task_data["task_id"]] = set()

        await self.broadcast_to_students(class_id, {"type": "new_task", "task": task_data})

    async def submit_answer(self, class_id: str, task_id: str, student_id: str, answer: dict):
        if class_id not in self.class_rooms:
            return

        room = self.class_rooms[class_id]
        room["task_submissions"].setdefault(task_id, set()).add(student_id)

        if student_id in self.student_connections:
            await self.student_connections[student_id].send_json(
                {"type": "submission_received", "task_id": task_id, "status": "ok"}
            )

        await self.send_to_teacher(
            class_id,
            {
                "type": "new_submission",
                "task_id": task_id,
                "student_id": student_id,
                "total_submissions": len(room["task_submissions"][task_id]),
            },
        )

    async def end_task(self, class_id: str, task_id: str, correct_answer: dict):
        if class_id not in self.class_rooms:
            return

        room = self.class_rooms[class_id]
        submission_count = len(room["task_submissions"].get(task_id, set()))

        await self.broadcast_to_students(
            class_id,
            {
                "type": "task_ended",
                "task_id": task_id,
                "correct_answer": correct_answer,
                "total_submissions": submission_count,
            },
        )
        await self.send_to_teacher(
            class_id,
            {
                "type": "task_results",
                "task_id": task_id,
                "correct_answer": correct_answer,
                "total_submissions": submission_count,
                "submitted_students": list(room["task_submissions"].get(task_id, set())),
            },
        )

    async def publish_task_group(self, class_id: str, group_id: str, title: str, tasks: list, total_countdown: int):
        if class_id not in self.class_rooms:
            return

        room = self.class_rooms[class_id]
        task_group_data = {
            "group_id": group_id,
            "title": title,
            "tasks": tasks,
            "total_countdown": total_countdown,
            "published_at": shanghai_now().isoformat(),
            "status": "active",
        }
        room["current_task_group"] = task_group_data
        room["current_task"] = None
        room["current_challenge"] = None
        room["task_group_submissions"] = {}
        room["published_tasks_history"].append(
            {
                "type": "task_group",
                "group_id": group_id,
                "title": title,
                "task_count": len(tasks),
                "published_at": task_group_data["published_at"],
                "status": "active",
                "submissions": 0,
            }
        )

        await self.broadcast_to_students(
            class_id,
            {
                "type": "new_task_group",
                "group_id": group_id,
                "title": title,
                "tasks": tasks,
                "total_countdown": total_countdown,
            },
        )

    async def submit_task_group_answer(self, class_id: str, group_id: str, student_id: str, answers: list):
        if class_id not in self.class_rooms:
            return

        room = self.class_rooms[class_id]
        current_group = room.get("current_task_group")
        if not current_group or current_group["group_id"] != group_id:
            return

        room["task_group_submissions"].setdefault(group_id, set()).add(student_id)
        submission_count = len(room["task_group_submissions"][group_id])

        for history_entry in room["published_tasks_history"]:
            if history_entry.get("group_id") == group_id:
                history_entry["submissions"] = submission_count
                break

        if student_id in self.student_connections:
            await self.student_connections[student_id].send_json(
                {"type": "task_group_submission_received", "group_id": group_id, "status": "ok"}
            )

        await self.send_to_teacher(
            class_id,
            {
                "type": "new_task_group_submission",
                "group_id": group_id,
                "student_id": student_id,
                "total_submissions": submission_count,
            },
        )

    async def end_task_group(self, class_id: str, group_id: str):
        if class_id not in self.class_rooms:
            return

        room = self.class_rooms[class_id]
        current_group = room.get("current_task_group")
        if not current_group or current_group["group_id"] != group_id:
            return

        submission_count = len(room.get("task_group_submissions", {}).get(group_id, set()))
        for history_entry in room["published_tasks_history"]:
            if history_entry.get("group_id") == group_id:
                history_entry["status"] = "ended"
                history_entry["submissions"] = submission_count
                history_entry["ended_at"] = shanghai_now().isoformat()
                break

        results = []
        for task in current_group.get("tasks", []):
            correct_answer = task.get("correct_answer") or task.get("question", {}).get("correct_answer")
            if isinstance(correct_answer, dict) and "value" in correct_answer:
                correct_answer = correct_answer["value"]
            results.append({"task_id": task.get("task_id"), "correct_answer": correct_answer})

        await self.broadcast_to_students(
            class_id,
            {"type": "task_group_ended", "group_id": group_id, "results": results},
        )
        await self.send_to_teacher(
            class_id,
            {
                "type": "task_group_results",
                "group_id": group_id,
                "results": results,
                "total_submissions": submission_count,
            },
        )
        room["current_task_group"] = None

    async def start_challenge(self, class_id: str, challenge_data: dict):
        if class_id not in self.class_rooms:
            return

        room = self.class_rooms[class_id]
        room["current_task"] = None
        room["current_task_group"] = None
        room["current_challenge"] = challenge_data

        participant_ids = set(challenge_data.get("participant_ids", []))
        for student_id, ws in list(room["student_wss"].items()):
            try:
                await ws.send_json(
                    {
                        "type": "challenge_started",
                        "challenge": {**challenge_data, "is_participant": student_id in participant_ids},
                    }
                )
            except Exception:
                pass

        await self.send_to_teacher(class_id, {"type": "challenge_started", "challenge": challenge_data})

    async def update_challenge_progress(self, class_id: str, challenge_id: str, student_id: str, progress: dict):
        room = self.class_rooms.get(class_id)
        if not room:
            return

        challenge = room.get("current_challenge")
        if not challenge or challenge.get("id") != challenge_id:
            return

        scoreboard = challenge.get("scoreboard", [])
        for item in scoreboard:
            if item.get("student_id") == student_id:
                incoming_answered = progress.get("answered_count", item.get("answered_count", 0))
                incoming_index = progress.get("current_index", item.get("current_index", 0))
                item["answered_count"] = max(int(item.get("answered_count", 0) or 0), int(incoming_answered or 0))
                item["current_index"] = max(int(item.get("current_index", 0) or 0), int(incoming_index or 0))
                if progress.get("started_at") and not item.get("started_at"):
                    item["started_at"] = progress.get("started_at")
                if isinstance(progress.get("answers"), list):
                    item["draft_answers"] = progress.get("answers")
                item["submitted"] = bool(item.get("submitted", False) or progress.get("submitted", False))
                break

        payload = {
            "type": "challenge_progress_updated",
            "challenge_id": challenge_id,
            "scoreboard": scoreboard,
        }
        await self.broadcast_to_students(class_id, payload)
        await self.send_to_teacher(class_id, payload)

    async def update_challenge_scoreboard(self, class_id: str, challenge_id: str, scoreboard: list[dict], status: str = "active"):
        room = self.class_rooms.get(class_id)
        if not room:
            return

        challenge = room.get("current_challenge")
        if not challenge or challenge.get("id") != challenge_id:
            return

        challenge["scoreboard"] = scoreboard
        challenge["status"] = status
        payload = {
            "type": "challenge_scoreboard_updated",
            "challenge_id": challenge_id,
            "scoreboard": scoreboard,
            "status": status,
        }
        await self.broadcast_to_students(class_id, payload)
        await self.send_to_teacher(class_id, payload)

    async def end_challenge(self, class_id: str, challenge_id: str, scoreboard: list[dict], status: str = "ended"):
        room = self.class_rooms.get(class_id)
        if not room:
            return

        challenge = room.get("current_challenge")
        if not challenge or challenge.get("id") != challenge_id:
            return

        challenge["scoreboard"] = scoreboard
        challenge["status"] = status
        payload = {
            "type": "challenge_ended",
            "challenge": challenge,
            "scoreboard": scoreboard,
            "status": status,
        }
        await self.broadcast_to_students(class_id, payload)
        await self.send_to_teacher(class_id, payload)
        room["current_challenge"] = None
        room.setdefault("_recently_ended_challenges", set()).add(challenge_id)

    def get_room_info(self, class_id: str) -> Optional[dict]:
        room = self.class_rooms.get(class_id)
        if not room:
            return None

        current_task_group = room.get("current_task_group")
        current_task_group_id = current_task_group.get("group_id") if current_task_group else None
        current_challenge = room.get("current_challenge")
        task_group_submission_count = 0
        if current_task_group_id:
            task_group_submission_count = len(room.get("task_group_submissions", {}).get(current_task_group_id, set()))

        return {
            "class_id": class_id,
            "teacher_id": room["teacher_id"],
            "student_count": len(room["student_wss"]),
            "student_ids": list(room["student_wss"].keys()),
            "has_active_task": room["current_task"] is not None,
            "has_active_task_group": current_task_group is not None,
            "has_active_challenge": current_challenge is not None,
            "current_task_group_id": current_task_group_id,
            "current_challenge_id": current_challenge.get("id") if current_challenge else None,
            "task_group_submission_count": task_group_submission_count,
            "created_at": room["created_at"],
        }

    def get_room_state(self, class_id: str) -> Optional[dict]:
        room = self.class_rooms.get(class_id)
        if not room:
            return None

        history = []
        for entry in room.get("published_tasks_history", []):
            history.append(
                {
                    "type": entry.get("type"),
                    "group_id": entry.get("group_id"),
                    "title": entry.get("title"),
                    "task_count": entry.get("task_count"),
                    "published_at": entry.get("published_at"),
                    "status": entry.get("status"),
                    "submissions": entry.get("submissions", 0),
                    "ended_at": entry.get("ended_at"),
                }
            )

        return {
            "class_id": class_id,
            "teacher_id": room["teacher_id"],
            "student_count": len(room["student_wss"]),
            "student_ids": list(room["student_wss"].keys()),
            "current_task": room.get("current_task"),
            "current_task_group": room.get("current_task_group"),
            "current_challenge": room.get("current_challenge"),
            "pending_shares": list(room.get("pending_shares", {}).values()),
            "task_history": history,
            "created_at": room["created_at"],
        }

    def get_student_count(self, class_id: str) -> int:
        room = self.class_rooms.get(class_id)
        return len(room["student_wss"]) if room else 0

    def is_teacher_in_room(self, class_id: str, teacher_id: str) -> bool:
        room = self.class_rooms.get(class_id)
        return bool(room and room.get("teacher_id") == teacher_id and room.get("teacher_ws"))


manager = ConnectionManager()
