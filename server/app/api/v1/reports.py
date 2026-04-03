"""Analytics and reports endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from datetime import datetime, timedelta, timezone, timezone

from app.db.session import get_db
from app.models import (
    User, UserRole, Class, ClassEnrollment, StudyPack, PracticeModule,
    Submission, LiveSession, LiveTask, LiveSubmission, LiveTaskGroup,
    TeacherProfile, StudentProfile
)
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/student/summary")
async def get_student_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get learning summary for current student."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can access this")

    # Get student profile
    result = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Count enrolled classes
    result = await db.execute(
        select(func.count(ClassEnrollment.id)).where(
            ClassEnrollment.student_id == current_user.id
        )
    )
    enrolled_classes = result.scalar() or 0

    # Count completed submissions (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    result = await db.execute(
        select(func.count(Submission.id)).where(
            Submission.student_id == current_user.id,
            Submission.submitted_at >= thirty_days_ago,
        )
    )
    completed_packs = result.scalar() or 0

    # Count live task submissions (last 30 days)
    result = await db.execute(
        select(func.count(LiveSubmission.id)).where(
            LiveSubmission.student_id == current_user.id,
            LiveSubmission.submitted_at >= thirty_days_ago,
        )
    )
    live_submissions = result.scalar() or 0

    # Get recent submissions with scores
    result = await db.execute(
        select(Submission)
        .where(Submission.student_id == current_user.id)
        .order_by(Submission.submitted_at.desc())
        .limit(10)
    )
    recent_submissions = result.scalars().all()

    return {
        "enrolled_classes": enrolled_classes,
        "completed_packs_30d": completed_packs,
        "live_submissions_30d": live_submissions,
        "recent_submissions": [
            {
                "id": s.id,
                "study_pack_id": s.study_pack_id,
                "module_id": s.module_id,
                "score": s.score,
                "status": s.status,
                "submitted_at": s.submitted_at,
            }
            for s in recent_submissions
        ],
    }


@router.get("/student/weak-points")
async def get_student_weak_points(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analyze student's weak points based on submission patterns."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can access this")

    # Get all submissions for the student
    result = await db.execute(
        select(Submission)
        .where(Submission.student_id == current_user.id)
    )
    submissions = result.scalars().all()

    # Get live submissions
    result = await db.execute(
        select(LiveSubmission)
        .where(LiveSubmission.student_id == current_user.id)
    )
    live_subs = result.scalars().all()

    # Calculate accuracy by task type
    # This is simplified - in production you'd analyze actual wrong answers
    total_submissions = len(submissions) + len(live_subs)
    if total_submissions == 0:
        return {
            "weak_points": [],
            "recommendations": ["完成更多练习来获取分析"],
        }

    # Mock weak point analysis based on available data
    weak_points = []
    recommendations = []

    # Check completion rates by module type
    result = await db.execute(
        select(PracticeModule.type, func.count(Submission.id))
        .join(Submission, Submission.module_id == PracticeModule.id)
        .where(Submission.student_id == current_user.id)
        .group_by(PracticeModule.type)
    )
    module_counts = result.all()

    module_accuracy = {}
    for mtype, count in module_counts:
        # Mock accuracy - in production calculate from actual scores
        module_accuracy[mtype] = min(100, count * 10) if count > 0 else 0

    if module_accuracy.get("vocabulary", 0) < 70:
        weak_points.append({"type": "vocabulary", "label": "词汇", "accuracy": module_accuracy.get("vocabulary", 0)})
        recommendations.append("建议加强词汇背诵，每天复习 10 个新单词")

    if module_accuracy.get("speaking", 0) < 70:
        weak_points.append({"type": "speaking", "label": "口语", "accuracy": module_accuracy.get("speaking", 0)})
        recommendations.append("多说多练，尝试用英语描述日常生活")

    if module_accuracy.get("listening", 0) < 70:
        weak_points.append({"type": "listening", "label": "听力", "accuracy": module_accuracy.get("listening", 0)})
        recommendations.append("多听英语材料，如 TED演讲或英文播客")

    return {
        "weak_points": sorted(weak_points, key=lambda x: x["accuracy"]),
        "recommendations": recommendations or ["继续保持良好的学习节奏！"],
    }


@router.get("/teacher/dashboard")
async def get_teacher_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get teacher dashboard statistics."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can access this")

    # Get teacher's classes
    result = await db.execute(
        select(Class).where(Class.teacher_id == current_user.id)
    )
    classes = result.scalars().all()

    if not classes:
        return {
            "classes": [],
            "selected_class": None,
            "stats": {
                "online_count": 0,
                "total_students": 0,
                "pending_tasks": 0,
                "unpublished_packs": 0,
                "focus_students": 0,
            },
            "activities": [],
        }

    # Use first class as selected (or could use most recently active)
    selected_class = classes[0]
    class_id = selected_class.id

    # Get total enrolled students
    result = await db.execute(
        select(func.count(ClassEnrollment.id)).where(
            ClassEnrollment.class_id == class_id
        )
    )
    total_students = result.scalar() or 0

    # Get online students (from presence data - simplified)
    # In production, this would check heartbeat timestamps
    result = await db.execute(
        select(func.count(ClassEnrollment.id)).where(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.status == "active"
        )
    )
    online_count = result.scalar() or 0

    # Count ready/pending task groups for this class
    result = await db.execute(
        select(func.count(LiveTaskGroup.id)).where(
            LiveTaskGroup.class_id == class_id,
            LiveTaskGroup.status == "ready"
        )
    )
    pending_tasks = result.scalar() or 0

    # Count unpublished (draft) study packs for this class
    result = await db.execute(
        select(func.count(StudyPack.id)).where(
            StudyPack.class_id == class_id,
            StudyPack.status == "draft"
        )
    )
    unpublished_packs = result.scalar() or 0

    # Count students needing focus (low completion rate or no recent activity)
    # Students with less than 50% completion rate or no submissions in last 7 days
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    result = await db.execute(
        select(Submission.student_id)
        .join(StudyPack, Submission.study_pack_id == StudyPack.id)
        .where(
            StudyPack.class_id == class_id,
            Submission.submitted_at >= seven_days_ago
        )
        .distinct()
    )
    active_student_ids = {row[0] for row in result.all()}

    # Students who haven't submitted anything in the last 7 days
    result = await db.execute(
        select(ClassEnrollment.student_id).where(
            ClassEnrollment.class_id == class_id
        )
    )
    all_student_ids = {row[0] for row in result.all()}
    inactive_student_ids = all_student_ids - active_student_ids
    focus_students = len(inactive_student_ids)

    # Build class list for selector
    class_list = [
        {
            "id": c.id,
            "name": c.name,
            "student_count": c.student_count if hasattr(c, 'student_count') else 0,
            "level": c.level if hasattr(c, 'level') else "A2-B1",
        }
        for c in classes
    ]

    # Get recent activities
    activities = []

    # Check if there's an active live session
    result = await db.execute(
        select(LiveSession).where(
            LiveSession.class_id == class_id,
            LiveSession.status == "active"
        )
    )
    active_session = result.scalar_one_or_none()

    if active_session:
        activities.append({
            "type": "active_session",
            "message": f"课堂正在进行: {active_session.topic or '实时任务'}",
            "dot_color": "green",
        })
    else:
        activities.append({
            "type": "no_task",
            "message": "课堂还未发起实时任务，建议先检查礼貌求助句型。",
            "dot_color": "green",
        })

    # Check for unsubmitted students in recent packs
    if focus_students > 0:
        activities.append({
            "type": "no_submission",
            "message": f"{focus_students} 位学生在最近学习包中未提交作业。",
            "dot_color": "amber",
        })

    # Check for weak points (mock analysis)
    activities.append({
        "type": "weak_point",
        "message": "\"Would you mind...\" 仍是全班最薄弱的句型。",
        "dot_color": "coral",
    })

    return {
        "classes": class_list,
        "selected_class": {
            "id": selected_class.id,
            "name": selected_class.name,
            "level": selected_class.level if hasattr(selected_class, 'level') else "A2-B1",
            "student_count": total_students,
            "schedule": selected_class.schedule if hasattr(selected_class, 'schedule') else "周二晚 20:00",
        },
        "stats": {
            "online_count": online_count,
            "total_students": total_students,
            "pending_tasks": pending_tasks,
            "unpublished_packs": unpublished_packs,
            "focus_students": focus_students,
        },
        "activities": activities,
    }


@router.get("/teacher/class/{class_id}/summary")
async def get_class_summary(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get class learning summary for teacher."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can access this")

    # Verify teacher owns this class
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()

    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this class")

    # Count enrolled students
    result = await db.execute(
        select(func.count(ClassEnrollment.id)).where(
            ClassEnrollment.class_id == class_id
        )
    )
    student_count = result.scalar() or 0

    # Count study packs for this class
    result = await db.execute(
        select(func.count(StudyPack.id)).where(
            StudyPack.class_id == class_id
        )
    )
    pack_count = result.scalar() or 0

    # Get active session if any
    result = await db.execute(
        select(LiveSession).where(
            LiveSession.class_id == class_id,
            LiveSession.status == "active"
        )
    )
    active_session = result.scalar_one_or_none()

    # Get recent submissions count
    result = await db.execute(
        select(func.count(Submission.id))
        .join(StudyPack, Submission.study_pack_id == StudyPack.id)
        .where(StudyPack.class_id == class_id)
    )
    submission_count = result.scalar() or 0

    # Get average completion rate (mock calculation)
    completion_rate = min(100, (student_count * 10) if student_count > 0 else 0)

    return {
        "class_id": class_id,
        "class_name": class_obj.name,
        "student_count": student_count,
        "pack_count": pack_count,
        "submission_count": submission_count,
        "completion_rate": completion_rate,
        "has_active_session": active_session is not None,
        "active_session_id": active_session.id if active_session else None,
    }


@router.get("/teacher/class/{class_id}/students")
async def get_class_students(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get student list with their progress for a class."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can access this")

    # Verify teacher owns this class
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()

    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this class")

    # Get enrolled students
    result = await db.execute(
        select(ClassEnrollment)
        .where(ClassEnrollment.class_id == class_id)
    )
    enrollments = result.scalars().all()

    student_progress = []
    for enrollment in enrollments:
        # Get student info
        result = await db.execute(
            select(User).where(User.id == enrollment.student_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            continue

        # Count submissions for this student
        result = await db.execute(
            select(func.count(Submission.id)).where(
                Submission.student_id == enrollment.student_id
            )
        )
        submission_count = result.scalar() or 0

        # Count live submissions
        result = await db.execute(
            select(func.count(LiveSubmission.id)).where(
                LiveSubmission.student_id == enrollment.student_id
            )
        )
        live_count = result.scalar() or 0

        student_progress.append({
            "student_id": user.id,
            "name": user.name,
            "email": user.email,
            "joined_at": enrollment.joined_at,
            "submission_count": submission_count,
            "live_submission_count": live_count,
            "status": enrollment.status,
        })

    return {
        "class_id": class_id,
        "students": student_progress,
    }


@router.get("/teacher/live-session/{session_id}/results")
async def get_live_session_results(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get results for a specific live session."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can access this")

    # Get session and verify ownership
    result = await db.execute(
        select(LiveSession).where(LiveSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify teacher owns the class
    result = await db.execute(select(Class).where(Class.id == session.class_id))
    class_obj = result.scalar_one_or_none()

    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get all tasks for this session
    result = await db.execute(
        select(LiveTask).where(LiveTask.session_id == session_id)
    )
    tasks = result.scalars().all()

    task_results = []
    for task in tasks:
        # Get submissions for this task
        result = await db.execute(
            select(LiveSubmission).where(LiveSubmission.task_id == task.id)
        )
        submissions = result.scalars().all()

        correct_count = sum(1 for s in submissions if s.is_correct)
        total_count = len(submissions)

        task_results.append({
            "task_id": task.id,
            "type": task.type,
            "question": task.question,
            "status": task.status,
            "submission_count": total_count,
            "correct_count": correct_count,
            "accuracy": (correct_count / total_count * 100) if total_count > 0 else 0,
            "submissions": [
                {
                    "student_id": s.student_id,
                    "answer": s.answer,
                    "is_correct": s.is_correct,
                    "response_time_ms": s.response_time_ms,
                }
                for s in submissions
            ],
        })

    return {
        "session_id": session_id,
        "class_id": session.class_id,
        "topic": session.topic,
        "status": session.status,
        "started_at": session.started_at,
        "ended_at": session.ended_at,
        "task_results": task_results,
    }
