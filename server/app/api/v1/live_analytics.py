"""Analytics endpoints for live classroom history and task-group results."""

from collections import defaultdict
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models import (
    Class,
    LiveSession,
    LiveTask,
    LiveTaskGroup,
    LiveTaskGroupSubmission,
    User,
    UserRole,
)

router = APIRouter(tags=["Live Classroom Analytics"])


CHOICE_BASED_TYPES = {
    "single_choice",
    "multiple_choice",
    "true_false",
    "image_understanding",
    "error_correction",
    "scenario",
}


def _unwrap_correct_answer(value: Any) -> Any:
    if isinstance(value, dict) and "value" in value:
        return value.get("value")
    return value


def _get_task_metric_mode(task: LiveTask) -> str:
    question = task.question or {}
    correct_value = _unwrap_correct_answer(task.correct_answer)

    if task.type == "reading":
        if question.get("answer_required") is False:
            return "completion"
        if correct_value in (None, "", []):
            return "response"
        return "correctness"

    if task.type in {
        "single_choice",
        "multiple_choice",
        "true_false",
        "fill_blank",
        "matching",
        "sorting",
        "image_understanding",
        "error_correction",
        "scenario",
    }:
        return "correctness"

    return "response"


@router.get("/live/classes/{class_id}/task-history")
async def get_class_task_history(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return persisted classroom history for a teacher."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can view task history")

    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    if class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this class")

    history: List[Dict[str, Any]] = []

    task_count_rows = await db.execute(
        select(LiveTask.group_id, func.count(LiveTask.id))
        .where(LiveTask.group_id.is_not(None))
        .group_by(LiveTask.group_id)
    )
    task_count_map = {group_id: count for group_id, count in task_count_rows.all()}

    session_task_count_rows = await db.execute(
        select(LiveTask.session_id, func.count(LiveTask.id))
        .where(LiveTask.session_id.is_not(None))
        .group_by(LiveTask.session_id)
    )
    session_task_count_map = {session_id: count for session_id, count in session_task_count_rows.all()}

    group_submission_rows = await db.execute(
        select(LiveTaskGroupSubmission.group_id, func.count(func.distinct(LiveTaskGroupSubmission.student_id)))
        .where(LiveTaskGroupSubmission.group_id.is_not(None))
        .group_by(LiveTaskGroupSubmission.group_id)
    )
    group_submission_map = {group_id: count for group_id, count in group_submission_rows.all()}

    session_submission_rows = await db.execute(
        select(LiveTaskGroupSubmission.session_id, func.count(func.distinct(LiveTaskGroupSubmission.student_id)))
        .where(LiveTaskGroupSubmission.session_id.is_not(None))
        .group_by(LiveTaskGroupSubmission.session_id)
    )
    session_submission_map = {session_id: count for session_id, count in session_submission_rows.all()}

    task_group_alias = aliased(LiveTaskGroup)
    result = await db.execute(
        select(LiveSession, task_group_alias)
        .outerjoin(task_group_alias, LiveSession.group_id == task_group_alias.id)
        .where(LiveSession.class_id == class_id)
        .order_by(LiveSession.started_at.desc())
    )
    session_rows = result.all()

    for session, group in session_rows:
        group_id = group.id if group else session.group_id
        title = (group.title if group else None) or session.topic or "课堂任务"
        task_count = session_task_count_map.get(session.id) or (task_count_map.get(group_id) if group_id else 0) or 0
        # 历史列表优先展示当前 session 自己的提交数，避免同一任务组多次使用时
        # 把旧场次的提交结果错误回填到最新场次。
        submission_count = session_submission_map.get(session.id)
        if submission_count is None:
            submission_count = 0

        # Legacy orphan sessions created without a task group or any persisted work
        # should not appear in the classroom history list.
        if group_id is None and task_count == 0 and submission_count == 0:
            continue

        history.append(
            {
                "type": "task_group",
                "session_id": session.id,
                "group_id": group_id,
                "title": title,
                "task_count": task_count,
                "status": "active" if session.status == "active" else "ended",
                "published_at": session.started_at.isoformat() if session.started_at else None,
                "ended_at": session.ended_at.isoformat() if session.ended_at else None,
                "submissions": submission_count,
            }
        )

    result = await db.execute(
        select(LiveTaskGroup)
        .where(
            LiveTaskGroup.class_id == class_id,
            LiveTaskGroup.status == "ready",
        )
        .order_by(LiveTaskGroup.created_at.desc())
    )
    ready_groups = result.scalars().all()

    for group in ready_groups:
        has_session = any(item["group_id"] == group.id for item in history if item["group_id"])
        if has_session:
            continue

        history.append(
            {
                "type": "task_group",
                "session_id": None,
                "group_id": group.id,
                "title": group.title,
                "task_count": task_count_map.get(group.id, 0),
                "status": "ready",
                "published_at": None,
                "ended_at": None,
                "submissions": 0,
            }
        )

    history.sort(
        key=lambda item: item["published_at"] or item["ended_at"] or "",
        reverse=True,
    )

    return {
        "class_id": class_id,
        "total_count": len(history),
        "history": history,
    }


@router.get("/live/task-groups/{group_id}/analytics")
async def get_task_group_analytics(
    group_id: str,
    session_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return analytics for one task group."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can view analytics")

    result = await db.execute(
        select(LiveTaskGroup, Class)
        .join(Class, LiveTaskGroup.class_id == Class.id)
        .where(LiveTaskGroup.id == group_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Task group not found")

    task_group, class_obj = row
    if class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this class")

    result = await db.execute(
        select(LiveTask)
        .where(LiveTask.group_id == group_id)
        .order_by(LiveTask.order)
    )
    tasks = result.scalars().all()

    submission_query = (
        select(LiveTaskGroupSubmission, User.name.label("student_name"))
        .join(User, LiveTaskGroupSubmission.student_id == User.id)
        .where(LiveTaskGroupSubmission.group_id == group_id)
    )
    if session_id:
        submission_query = submission_query.where(LiveTaskGroupSubmission.session_id == session_id)

    result = await db.execute(
        submission_query.order_by(
            LiveTaskGroupSubmission.student_id,
            LiveTaskGroupSubmission.task_id,
            LiveTaskGroupSubmission.submitted_at.desc(),
        )
    )
    all_submissions = result.all()

    if session_id and not all_submissions:
        legacy_count = await db.scalar(
            select(func.count(LiveTaskGroupSubmission.id)).where(
                LiveTaskGroupSubmission.group_id == group_id,
                LiveTaskGroupSubmission.session_id.is_not(None),
            )
        )
        if not legacy_count:
            fallback_query = (
                select(LiveTaskGroupSubmission, User.name.label("student_name"))
                .join(User, LiveTaskGroupSubmission.student_id == User.id)
                .where(LiveTaskGroupSubmission.group_id == group_id)
                .order_by(
                    LiveTaskGroupSubmission.student_id,
                    LiveTaskGroupSubmission.task_id,
                    LiveTaskGroupSubmission.submitted_at.desc(),
                )
            )
            result = await db.execute(fallback_query)
            all_submissions = result.all()

    submissions_map = {}
    for submission, student_name in all_submissions:
        key = (submission.student_id, submission.task_id)
        if key not in submissions_map:
            submissions_map[key] = (submission, student_name)
    submissions = list(submissions_map.values())
    unique_student_ids = {submission.student_id for submission, _student_name in submissions}
    analytics_student_count = len(unique_student_ids)

    task_stats: Dict[str, Dict[str, Any]] = {}
    for task in tasks:
        metric_mode = _get_task_metric_mode(task)
        task_stats[task.id] = {
            "task_id": task.id,
            "type": task.type,
            "question_text": task.question.get("text", "") if task.question else "",
            "options": task.question.get("options", []) if task.question else [],
            "pairs": task.question.get("pairs", []) if task.question else [],
            "answer_required": task.question.get("answer_required") if task.question else None,
            "correct_answer": task.correct_answer,
            "metric_mode": metric_mode,
            "primary_label": "正确率" if metric_mode == "correctness" else ("完成率" if metric_mode == "completion" else "作答率"),
            "supports_distribution": task.type in CHOICE_BASED_TYPES,
            "has_reference_answer": _unwrap_correct_answer(task.correct_answer) not in (None, "", []),
            "total_submissions": 0,
            "correct_count": 0,
            "incorrect_count": 0,
            "completion_count": 0,
            "option_counts": defaultdict(int),
            "answer_distribution": [],
            "sample_answers": [],
        }

    for submission, _student_name in submissions:
        task_id = submission.task_id
        if task_id not in task_stats:
            continue

        stats = task_stats[task_id]
        stats["total_submissions"] += 1
        stats["completion_count"] += 1

        if submission.is_correct:
            stats["correct_count"] += 1
        elif submission.is_correct is False:
            stats["incorrect_count"] += 1

        answer = submission.answer
        if answer:
            if isinstance(answer, list):
                for ans in answer:
                    stats["option_counts"][str(ans)] += 1
            else:
                stats["option_counts"][str(answer)] += 1
            if len(stats["sample_answers"]) < 5:
                stats["sample_answers"].append(
                    {
                        "student_id": submission.student_id,
                        "student_name": _student_name,
                        "answer": answer,
                    }
                )

    for task_id, stats in task_stats.items():
        total = stats["total_submissions"]
        stats["answered_count"] = total
        stats["completion_rate"] = round(stats["completion_count"] / analytics_student_count * 100) if analytics_student_count > 0 else 0
        stats["response_rate"] = round(stats["total_submissions"] / analytics_student_count * 100) if analytics_student_count > 0 else 0
        stats["correct_rate"] = round(stats["correct_count"] / total * 100) if total > 0 else 0

        if stats["metric_mode"] == "correctness":
            stats["primary_rate"] = stats["correct_rate"]
        elif stats["metric_mode"] == "completion":
            stats["primary_rate"] = stats["completion_rate"]
        else:
            stats["primary_rate"] = stats["response_rate"]

        task = next((item for item in tasks if item.id == task_id), None)
        if not task or not task.question:
            continue

        options = task.question.get("options", [])
        correct_answer = task.correct_answer
        correct_value = correct_answer.get("value") if isinstance(correct_answer, dict) else correct_answer

        distribution = []
        if stats["supports_distribution"]:
            for opt in options:
                opt_key = opt.get("key", "")
                opt_text = opt.get("text", "")
                count = stats["option_counts"].get(opt_key, 0)
                percentage = round(count / total * 100) if total > 0 else 0

                if isinstance(correct_value, list):
                    is_correct = opt_key in correct_value
                else:
                    is_correct = opt_key == str(correct_value)

                distribution.append(
                    {
                        "key": opt_key,
                        "text": opt_text,
                        "count": count,
                        "percentage": percentage,
                        "is_correct": is_correct,
                    }
                )

        stats["answer_distribution"] = distribution

        if stats["metric_mode"] != "correctness" or not correct_value:
            continue

        correct_students = []
        if isinstance(correct_value, list):
            correct_set = {str(item) for item in correct_value}
            for submission, student_name in submissions:
                if submission.task_id != task_id or not isinstance(submission.answer, list):
                    continue
                answer_set = {str(item) for item in submission.answer}
                if answer_set == correct_set:
                    correct_students.append(
                        {
                            "student_id": submission.student_id,
                            "student_name": student_name,
                            "answer": submission.answer,
                        }
                    )
        else:
            for submission, student_name in submissions:
                if submission.task_id == task_id and str(submission.answer) == str(correct_value):
                    correct_students.append(
                        {
                            "student_id": submission.student_id,
                            "student_name": student_name,
                            "answer": submission.answer,
                        }
                    )
        stats["correct_students"] = correct_students

    student_stats = defaultdict(
        lambda: {
            "student_id": "",
            "student_name": "",
            "correct_count": 0,
            "total_answered": 0,
            "score": 0,
        }
    )

    for submission, student_name in submissions:
        sid = submission.student_id
        student_stats[sid]["student_id"] = sid
        student_stats[sid]["student_name"] = student_name
        student_stats[sid]["total_answered"] += 1
        if submission.is_correct:
            student_stats[sid]["correct_count"] += 1

    for stats in student_stats.values():
        total = stats["total_answered"]
        correct = stats["correct_count"]
        stats["score"] = round(correct / total * 100) if total > 0 else 0

    scored_tasks = [item for item in task_stats.values() if item["metric_mode"] == "correctness"]
    completion_tasks = [item for item in task_stats.values() if item["metric_mode"] == "completion"]
    response_tasks = [item for item in task_stats.values() if item["metric_mode"] == "response"]

    if scored_tasks:
        summary_label = "平均正确率"
        summary_rate = round(sum(item["primary_rate"] for item in scored_tasks) / len(scored_tasks))
    elif completion_tasks:
        summary_label = "平均完成率"
        summary_rate = round(sum(item["primary_rate"] for item in completion_tasks) / len(completion_tasks))
    elif response_tasks:
        summary_label = "平均作答率"
        summary_rate = round(sum(item["primary_rate"] for item in response_tasks) / len(response_tasks))
    else:
        summary_label = "平均参与率"
        summary_rate = 0

    return {
        "group_id": group_id,
        "session_id": session_id,
        "title": task_group.title,
        "total_students": len(student_stats),
        "total_submissions": len(submissions),
        "summary_label": summary_label,
        "summary_rate": summary_rate,
        "task_analytics": list(task_stats.values()),
        "student_analytics": list(student_stats.values()),
    }
