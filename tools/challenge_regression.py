import argparse
import asyncio
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Optional

import websockets


DEFAULT_BASE_URL = "http://127.0.0.1:8000/api/v1"
DEFAULT_TEACHER = "teacher@test.com"
DEFAULT_STUDENT_A = "student@test.com"
DEFAULT_STUDENT_B = "regression.duel.student@example.com"
DEFAULT_PASSWORD = "123456"
SUPPORTED_DUEL_TYPES = {
    "single_choice",
    "multiple_choice",
    "fill_blank",
    "true_false",
    "matching",
    "sorting",
    "image_understanding",
}
SUPPORTED_SINGLE_QUESTION_TYPES = {
    "single_choice",
    "true_false",
    "image_understanding",
    "error_correction",
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class HttpClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    def request(
        self,
        method: str,
        path: str,
        *,
        token: Optional[str] = None,
        data: Optional[dict[str, Any]] = None,
        query: Optional[dict[str, Any]] = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        if query:
            url = f"{url}?{urllib.parse.urlencode(query, doseq=True)}"

        body = None
        headers = {"Accept": "application/json"}
        if data is not None:
            body = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if token:
            headers["Authorization"] = f"Bearer {token}"

        req = urllib.request.Request(url, method=method.upper(), data=body, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                payload = resp.read()
                return json.loads(payload.decode("utf-8")) if payload else None
        except urllib.error.HTTPError as exc:
            payload = exc.read().decode("utf-8", errors="replace")
            detail = payload
            try:
                detail = json.loads(payload)
            except Exception:
                pass
            raise RuntimeError(f"{method.upper()} {path} failed: {exc.code} {detail}") from exc


@dataclass
class LoginContext:
    token: str
    user_id: str
    name: str


class WsPeer:
    def __init__(self, *, name: str, class_id: str, token: str, base_url: str) -> None:
        parsed = urllib.parse.urlparse(base_url)
        ws_scheme = "wss" if parsed.scheme == "https" else "ws"
        netloc = parsed.netloc
        self.url = f"{ws_scheme}://{netloc}/api/v1/live/ws?token={urllib.parse.quote(token)}&class_id={urllib.parse.quote(class_id)}"
        self.name = name
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self.history: list[dict[str, Any]] = []
        self._receiver: Optional[asyncio.Task[Any]] = None

    async def connect(self) -> None:
        self.ws = await websockets.connect(self.url, ping_interval=20, ping_timeout=20, close_timeout=5)
        self._receiver = asyncio.create_task(self._receive_loop())
        await self.expect("connected", timeout=8)

    async def _receive_loop(self) -> None:
        assert self.ws is not None
        try:
            async for raw in self.ws:
                data = json.loads(raw)
                self.history.append(data)
                await self.queue.put(data)
        except Exception:
            return

    async def send(self, payload: dict[str, Any]) -> None:
        assert self.ws is not None
        await self.ws.send(json.dumps(payload))

    async def expect(
        self,
        event_type: Optional[str] = None,
        *,
        predicate: Optional[Callable[[dict[str, Any]], bool]] = None,
        timeout: float = 6,
    ) -> dict[str, Any]:
        deadline = time.monotonic() + timeout
        buffered: list[dict[str, Any]] = []
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                for item in buffered:
                    await self.queue.put(item)
                raise TimeoutError(f"{self.name} timed out waiting for {event_type or 'event'}")
            try:
                item = await asyncio.wait_for(self.queue.get(), remaining)
            except asyncio.TimeoutError as exc:
                for entry in buffered:
                    await self.queue.put(entry)
                raise TimeoutError(f"{self.name} timed out waiting for {event_type or 'event'}") from exc
            if (event_type is None or item.get("type") == event_type) and (predicate is None or predicate(item)):
                for entry in buffered:
                    await self.queue.put(entry)
                return item
            buffered.append(item)

    async def close(self) -> None:
        if self.ws is not None:
            await self.ws.close()
            self.ws = None
        if self._receiver is not None:
            self._receiver.cancel()
            try:
                await self._receiver
            except Exception:
                pass
            self._receiver = None


class ChallengeRegression:
    def __init__(self, base_url: str, teacher_login: str, student_a_login: str, student_b_login: str, password: str) -> None:
        self.http = HttpClient(base_url)
        self.base_url = base_url
        self.teacher_login = teacher_login
        self.student_a_login = student_a_login
        self.student_b_login = student_b_login
        self.password = password
        self.teacher: Optional[LoginContext] = None
        self.student_a: Optional[LoginContext] = None
        self.student_b: Optional[LoginContext] = None
        self.class_id: Optional[str] = None
        self.group_id: Optional[str] = None
        self.tasks: list[dict[str, Any]] = []

    def login(self, identifier: str) -> LoginContext:
        token_resp = self.http.request(
            "POST",
            "/auth/login",
            data={"email_or_username": identifier, "password": self.password},
        )
        token = token_resp["access_token"]
        me = self.http.request("GET", "/auth/me", token=token)
        return LoginContext(token=token, user_id=me["id"], name=me["name"])

    def setup(self) -> None:
        self.teacher = self.login(self.teacher_login)
        self.student_a = self.login(self.student_a_login)
        self.student_b = self.login(self.student_b_login)

        teacher_classes = self.http.request("GET", "/classes", token=self.teacher.token)
        if not teacher_classes:
            raise RuntimeError("Teacher has no classes for regression")
        student_a_classes = self.http.request("GET", "/classes", token=self.student_a.token)
        student_b_classes = self.http.request("GET", "/classes", token=self.student_b.token)
        common_class_ids = (
            {item["id"] for item in teacher_classes}
            & {item["id"] for item in student_a_classes}
            & {item["id"] for item in student_b_classes}
        )
        if not common_class_ids:
            raise RuntimeError("No shared class found for teacher and both students")
        self.class_id = next(iter(common_class_ids))
        if not self._reuse_existing_group():
            self._create_temp_group()

    def _reuse_existing_group(self) -> bool:
        groups = self.http.request(
            "GET",
            "/live/task-groups",
            token=self.teacher.token,
            query={"class_id": self.class_id},
        )
        for group in groups:
            detail = self.http.request("GET", f"/live/task-groups/{group['id']}", token=self.teacher.token)
            tasks = detail.get("tasks", [])
            if len(tasks) < 2:
                continue
            if all(task.get("type") in SUPPORTED_DUEL_TYPES for task in tasks) and any(
                task.get("type") in SUPPORTED_SINGLE_QUESTION_TYPES for task in tasks
            ):
                self.group_id = detail["id"]
                self.tasks = tasks
                return True
        return False

    def _create_temp_group(self) -> None:
        title = f"Regression Challenge {int(time.time())}"
        group = self.http.request(
            "POST",
            "/live/task-groups",
            token=self.teacher.token,
            data={"class_id": self.class_id, "title": title},
        )
        self.group_id = group["id"]

        task_payloads = [
            {
                "type": "single_choice",
                "question": {
                    "text": "Which day comes immediately after Wednesday?",
                    "options": [
                        {"key": "A", "text": "Tuesday"},
                        {"key": "B", "text": "Thursday"},
                        {"key": "C", "text": "Friday"},
                        {"key": "D", "text": "Monday"},
                    ],
                },
                "countdown_seconds": 20,
                "correct_answer": {"value": "B"},
            },
            {
                "type": "single_choice",
                "question": {
                    "text": "How many hours are there in one day?",
                    "options": [
                        {"key": "A", "text": "12"},
                        {"key": "B", "text": "18"},
                        {"key": "C", "text": "24"},
                        {"key": "D", "text": "30"},
                    ],
                },
                "countdown_seconds": 20,
                "correct_answer": {"value": "C"},
            },
        ]
        for payload in task_payloads:
            self.http.request(
                "POST",
                f"/live/task-groups/{self.group_id}/tasks",
                token=self.teacher.token,
                data=payload,
            )
        self.http.request(
            "PUT",
            f"/live/task-groups/{self.group_id}",
            token=self.teacher.token,
            data={"status": "ready"},
        )
        group_detail = self.http.request("GET", f"/live/task-groups/{self.group_id}", token=self.teacher.token)
        self.tasks = group_detail["tasks"]

    def create_challenge(self, mode: str, participant_ids: list[str], task_id: Optional[str] = None) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "class_id": self.class_id,
            "task_group_id": self.group_id,
            "mode": mode,
            "participant_ids": participant_ids,
        }
        if task_id:
            payload["task_id"] = task_id
        return self.http.request("POST", "/live/challenges", token=self.teacher.token, data=payload)

    def list_challenges(self) -> list[dict[str, Any]]:
        return self.http.request("GET", f"/live/classes/{self.class_id}/challenges", token=self.teacher.token)

    async def _teacher_connect(self) -> WsPeer:
        peer = WsPeer(name="teacher", class_id=self.class_id, token=self.teacher.token, base_url=self.base_url)
        await peer.connect()
        await self._cleanup_room(peer)
        return peer

    async def _student_connect(self, ctx: LoginContext, name: str) -> WsPeer:
        peer = WsPeer(name=name, class_id=self.class_id, token=ctx.token, base_url=self.base_url)
        await peer.connect()
        return peer

    async def _cleanup_room(self, teacher_ws: WsPeer) -> None:
        await teacher_ws.send({"type": "get_room_info"})
        room_info_event = await teacher_ws.expect("room_info", timeout=6)
        room_info = room_info_event.get("room_info") or {}
        if room_info.get("has_active_task"):
            await teacher_ws.send({"type": "end_session"})
            await teacher_ws.close()
            await teacher_ws.connect()
            return
        current_group_id = room_info.get("current_task_group_id")
        if room_info.get("has_active_task_group") and current_group_id:
            await teacher_ws.send({"type": "end_task_group", "group_id": current_group_id})
            try:
                await teacher_ws.expect("task_group_ended", timeout=6)
            except TimeoutError:
                pass
        current_challenge_id = room_info.get("current_challenge_id")
        if room_info.get("has_active_challenge") and current_challenge_id:
            await teacher_ws.send({"type": "end_challenge", "challenge_id": current_challenge_id})
            try:
                await teacher_ws.expect("challenge_ended", timeout=6)
            except TimeoutError:
                pass

    async def _start_challenge(self, teacher_ws: WsPeer, challenge_id: str) -> None:
        await teacher_ws.send({"type": "start_challenge", "challenge_id": challenge_id})
        event = await teacher_ws.expect(
            None,
            predicate=lambda item: (
                item.get("type") == "error"
                or (
                    item.get("type") == "challenge_started"
                    and item.get("challenge", {}).get("id") == challenge_id
                )
            ),
            timeout=8,
        )
        if event.get("type") == "error":
            raise RuntimeError(f"Teacher failed to start challenge: {event.get('message')}")

    async def scenario_late_join_class_challenge(self) -> dict[str, Any]:
        teacher_ws = await self._teacher_connect()
        student_a_ws = await self._student_connect(self.student_a, "student_a")
        try:
            challenge = self.create_challenge("class_challenge", [self.student_a.user_id, self.student_b.user_id])
            await self._start_challenge(teacher_ws, challenge["id"])
            await student_a_ws.expect("challenge_started", predicate=lambda item: item["challenge"]["id"] == challenge["id"], timeout=8)
            late_ws = await self._student_connect(self.student_b, "student_b_late")
            try:
                late_start = await late_ws.expect("challenge_started", predicate=lambda item: item["challenge"]["id"] == challenge["id"], timeout=8)
                return {
                    "scenario": "late_join_class_challenge",
                    "passed": late_start["challenge"]["id"] == challenge["id"],
                }
            finally:
                await teacher_ws.send({"type": "end_challenge", "challenge_id": challenge["id"]})
                await late_ws.close()
        finally:
            await student_a_ws.close()
            await teacher_ws.close()

    async def scenario_reconnect_duel(self) -> dict[str, Any]:
        teacher_ws = await self._teacher_connect()
        student_a_ws = await self._student_connect(self.student_a, "student_a")
        student_b_ws = await self._student_connect(self.student_b, "student_b")
        try:
            challenge = self.create_challenge("duel", [self.student_a.user_id, self.student_b.user_id])
            await self._start_challenge(teacher_ws, challenge["id"])
            await student_a_ws.expect("challenge_started", predicate=lambda item: item["challenge"]["id"] == challenge["id"], timeout=8)
            await student_b_ws.expect("challenge_started", predicate=lambda item: item["challenge"]["id"] == challenge["id"], timeout=8)
            started_at = utc_now_iso()
            await student_a_ws.send(
                {
                    "type": "challenge_progress",
                    "challenge_id": challenge["id"],
                    "current_index": 1,
                    "answered_count": 1,
                    "started_at": started_at,
                    "submitted": False,
                }
            )
            await teacher_ws.expect(
                "challenge_progress_updated",
                predicate=lambda item: item["challenge_id"] == challenge["id"]
                and any(entry.get("student_id") == self.student_a.user_id and entry.get("answered_count", 0) >= 1 for entry in item["scoreboard"]),
                timeout=8,
            )
            await student_a_ws.close()
            student_a_ws = await self._student_connect(self.student_a, "student_a_reconnected")
            rejoin = await student_a_ws.expect(
                "challenge_started",
                predicate=lambda item: item["challenge"]["id"] == challenge["id"],
                timeout=8,
            )
            my_entry = next(entry for entry in rejoin["challenge"]["scoreboard"] if entry["student_id"] == self.student_a.user_id)
            return {
                "scenario": "reconnect_duel",
                "passed": my_entry.get("answered_count", 0) >= 1 and my_entry.get("current_index", 0) >= 1,
            }
        finally:
            try:
                await teacher_ws.send({"type": "end_challenge", "challenge_id": challenge["id"]})
            except Exception:
                pass
            await student_a_ws.close()
            await student_b_ws.close()
            await teacher_ws.close()

    async def scenario_teacher_early_end(self) -> dict[str, Any]:
        teacher_ws = await self._teacher_connect()
        student_a_ws = await self._student_connect(self.student_a, "student_a")
        student_b_ws = await self._student_connect(self.student_b, "student_b")
        try:
            challenge = self.create_challenge("class_challenge", [self.student_a.user_id, self.student_b.user_id])
            await self._start_challenge(teacher_ws, challenge["id"])
            await student_a_ws.expect("challenge_started", predicate=lambda item: item["challenge"]["id"] == challenge["id"], timeout=8)
            await student_b_ws.expect("challenge_started", predicate=lambda item: item["challenge"]["id"] == challenge["id"], timeout=8)
            await teacher_ws.send({"type": "end_challenge", "challenge_id": challenge["id"]})
            ended_a = await student_a_ws.expect("challenge_ended", predicate=lambda item: item["challenge"]["id"] == challenge["id"], timeout=8)
            ended_b = await student_b_ws.expect("challenge_ended", predicate=lambda item: item["challenge"]["id"] == challenge["id"], timeout=8)
            return {
                "scenario": "teacher_early_end",
                "passed": ended_a["status"] == "ended" and ended_b["status"] == "ended",
            }
        finally:
            await student_a_ws.close()
            await student_b_ws.close()
            await teacher_ws.close()

    async def scenario_duplicate_submit_single_question_duel(self) -> dict[str, Any]:
        teacher_ws = await self._teacher_connect()
        student_a_ws = await self._student_connect(self.student_a, "student_a")
        student_b_ws = await self._student_connect(self.student_b, "student_b")
        challenge_id = None
        try:
            challenge = self.create_challenge(
                "single_question_duel",
                [self.student_a.user_id, self.student_b.user_id],
                task_id=self.tasks[0]["id"],
            )
            challenge_id = challenge["id"]
            await self._start_challenge(teacher_ws, challenge_id)
            await student_a_ws.expect("challenge_started", predicate=lambda item: item["challenge"]["id"] == challenge_id, timeout=8)
            await student_b_ws.expect("challenge_started", predicate=lambda item: item["challenge"]["id"] == challenge_id, timeout=8)

            started_at_a = utc_now_iso()
            await student_a_ws.send({
                "type": "submit_challenge",
                "challenge_id": challenge_id,
                "answers": [{"task_id": self.tasks[0]["id"], "answer": "A"}],
                "started_at": started_at_a,
            })
            await teacher_ws.expect(
                None,
                predicate=lambda item: item.get("type") in {"challenge_scoreboard_updated", "challenge_ended"}
                and (
                    item.get("challenge_id") == challenge_id
                    or item.get("challenge", {}).get("id") == challenge_id
                ),
                timeout=8,
            )

            started_at_b = utc_now_iso()
            await student_b_ws.send({
                "type": "submit_challenge",
                "challenge_id": challenge_id,
                "answers": [{"task_id": self.tasks[0]["id"], "answer": "B"}],
                "started_at": started_at_b,
            })
            ended_b = await student_b_ws.expect("challenge_ended", predicate=lambda item: item["challenge"]["id"] == challenge_id, timeout=8)
            scoreboard_before = ended_b["scoreboard"]

            await student_b_ws.send({
                "type": "submit_challenge",
                "challenge_id": challenge_id,
                "answers": [{"task_id": self.tasks[0]["id"], "answer": "B"}],
                "started_at": started_at_b,
            })
            replay = await student_b_ws.expect("challenge_ended", predicate=lambda item: item["challenge"]["id"] == challenge_id, timeout=8)
            scoreboard_after = replay["scoreboard"]
            latest = next(item for item in self.list_challenges() if item["id"] == challenge_id)
            return {
                "scenario": "duplicate_submit_single_question_duel",
                "passed": scoreboard_before == scoreboard_after == latest["scoreboard"],
            }
        finally:
            if challenge_id:
                try:
                    await teacher_ws.send({"type": "end_challenge", "challenge_id": challenge_id})
                except Exception:
                    pass
            await student_a_ws.close()
            await student_b_ws.close()
            await teacher_ws.close()

    async def run(self) -> int:
        self.setup()
        scenarios = [
            self.scenario_late_join_class_challenge,
            self.scenario_reconnect_duel,
            self.scenario_teacher_early_end,
            self.scenario_duplicate_submit_single_question_duel,
        ]
        results = []
        for scenario in scenarios:
            try:
                result = await scenario()
            except Exception as exc:
                result = {
                    "scenario": scenario.__name__,
                    "passed": False,
                    "error": f"{exc.__class__.__name__}: {exc}",
                }
            results.append(result)
            print(json.dumps(result, ensure_ascii=False))

        failed = [item for item in results if not item.get("passed")]
        print(json.dumps({"summary": {"passed": len(results) - len(failed), "failed": len(failed)}}, ensure_ascii=False))
        return 1 if failed else 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run protocol-level live challenge regression checks.")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--teacher", default=DEFAULT_TEACHER)
    parser.add_argument("--student-a", default=DEFAULT_STUDENT_A)
    parser.add_argument("--student-b", default=DEFAULT_STUDENT_B)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    return parser.parse_args()


async def main() -> int:
    args = parse_args()
    runner = ChallengeRegression(
        base_url=args.base_url,
        teacher_login=args.teacher,
        student_a_login=args.student_a,
        student_b_login=args.student_b,
        password=args.password,
    )
    return await runner.run()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
