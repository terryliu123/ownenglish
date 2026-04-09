"""课堂会话接口：开始/结束本节课、课堂回顾列表、时间线和摘要。"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.core.websocket import manager
from app.db.session import get_db
from app.models import (
    Class,
    DanmuRecord,
    LiveChallengeSession,
    LiveSession,
    LiveSessionEvent,
    LiveSubmission,
    LiveTask,
    LiveTaskGroupSubmission,
    User,
    UserRole,
)
from .logging_utils import log_live_transport

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/live")


class StartSessionRequest(BaseModel):
    class_id: str
    title: Optional[str] = None
    entry_mode: str = "whiteboard"


class StartSessionResponse(BaseModel):
    id: str
    class_id: str
    teacher_id: str
    title: Optional[str]
    entry_mode: str
    status: str
    started_at: str
    is_resumed: bool


class EndSessionRequest(BaseModel):
    summary_json: Optional[dict] = None


class EndSessionResponse(BaseModel):
    id: str
    status: str
    ended_at: str
    duration_seconds: int


class ActiveSessionResponse(BaseModel):
    id: str
    class_id: str
    teacher_id: str
    title: Optional[str]
    entry_mode: str
    status: str
    started_at: str


class SessionListItem(BaseModel):
    id: str
    class_id: str
    class_name: str
    title: Optional[str]
    entry_mode: str
    status: str
    started_at: str
    ended_at: Optional[str]
    duration_seconds: Optional[int]
    event_count: int


class SessionDetailResponse(BaseModel):
    id: str
    class_id: str
    class_name: str
    teacher_id: str
    teacher_name: str
    title: Optional[str]
    entry_mode: str
    status: str
    started_at: str
    ended_at: Optional[str]
    duration_seconds: Optional[int]
    summary_json: Optional[dict]


class SessionEventItem(BaseModel):
    id: str
    event_type: str
    payload_json: Optional[dict]
    created_at: str


class SessionStudentInfo(BaseModel):
    student_id: str
    student_name: str
    joined_at: Optional[str]


class TaskGroupSubmissionSummary(BaseModel):
    group_id: str
    submitted_students: int

class SessionStatsResponse(BaseModel):
    total_sessions: int
    total_duration_seconds: int
    total_interactions: int
    total_shares: int
    total_danmu: int


class SessionSummaryResponse(BaseModel):
    session_id: str
    total_students: int
    total_tasks: int
    total_submissions: int
    total_challenges: int
    total_shares: int = 0
    total_danmu: int = 0
    average_accuracy: Optional[float]
    most_active_students: List[dict]
    all_students: List[SessionStudentInfo]
    task_group_submissions: List[TaskGroupSubmissionSummary] = []


async def _require_teacher_class(class_id: str, current_user: User, db: AsyncSession) -> Class:
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=404, detail="班级不存在")
    if current_user.role != UserRole.TEACHER or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问该班级")
    return class_obj


async def _require_teacher_session(session_id: str, current_user: User, db: AsyncSession) -> LiveSession:
    result = await db.execute(select(LiveSession).where(LiveSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="课堂不存在")
    if current_user.role != UserRole.TEACHER or session.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问该课堂")
    return session


async def _get_next_session_number(db: AsyncSession, class_id: str) -> int:
    result = await db.execute(select(func.count(LiveSession.id)).where(LiveSession.class_id == class_id))
    return (result.scalar() or 0) + 1


async def _get_latest_active_session(db: AsyncSession, class_id: str) -> Optional[LiveSession]:
    result = await db.execute(
        select(LiveSession)
        .where(
            and_(
                LiveSession.class_id == class_id,
                LiveSession.status == "active",
            )
        )
        .order_by(LiveSession.started_at.desc())
    )
    sessions = result.scalars().all()
    if len(sessions) > 1:
        logger.warning(
            "[ClassroomSession] Multiple active sessions detected for class %s: %s",
            class_id,
            [session.id for session in sessions],
        )
    return sessions[0] if sessions else None


@router.post("/sessions/start", response_model=StartSessionResponse)
async def start_classroom_session(
    request: StartSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_teacher_class(request.class_id, current_user, db)

    existing_session = await _get_latest_active_session(db, request.class_id)
    if existing_session:
        manager.set_room_live_session_id(request.class_id, existing_session.id)
        log_live_transport(
            logger,
            "classroom_session_resumed",
            class_id=request.class_id,
            live_session_id=existing_session.id,
            teacher_id=current_user.id,
            entry_mode=existing_session.entry_mode,
            transport="http",
        )
        logger.info("[ClassroomSession] Resume active session %s for class %s", existing_session.id, request.class_id)
        return StartSessionResponse(
            id=existing_session.id,
            class_id=existing_session.class_id,
            teacher_id=existing_session.teacher_id or current_user.id,
            title=existing_session.title,
            entry_mode=existing_session.entry_mode or "whiteboard",
            status=existing_session.status,
            started_at=existing_session.started_at.isoformat(),
            is_resumed=True,
        )

    next_session_number = await _get_next_session_number(db, request.class_id)
    session = LiveSession(
        class_id=request.class_id,
        teacher_id=current_user.id,
        title=request.title or f"第 {next_session_number} 节课",
        entry_mode=request.entry_mode,
        status="active",
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.flush()

    db.add(
        LiveSessionEvent(
            live_session_id=session.id,
            event_type="session_started",
            payload_json={
                "class_id": request.class_id,
                "teacher_id": current_user.id,
                "entry_mode": request.entry_mode,
            },
        )
    )
    await db.commit()
    await db.refresh(session)

    manager.set_room_live_session_id(request.class_id, session.id)
    await manager.save_snapshot(request.class_id)
    log_live_transport(
        logger,
        "classroom_session_started",
        class_id=request.class_id,
        live_session_id=session.id,
        teacher_id=current_user.id,
        entry_mode=request.entry_mode,
        transport="http",
    )
    logger.info("[ClassroomSession] Started session %s for class %s", session.id, request.class_id)
    return StartSessionResponse(
        id=session.id,
        class_id=session.class_id,
        teacher_id=session.teacher_id,
        title=session.title,
        entry_mode=session.entry_mode or "whiteboard",
        status=session.status,
        started_at=session.started_at.isoformat(),
        is_resumed=False,
    )


@router.post("/sessions/{session_id}/end", response_model=EndSessionResponse)
async def end_classroom_session(
    session_id: str,
    request: EndSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _require_teacher_session(session_id, current_user, db)
    if session.status != "active":
        raise HTTPException(status_code=400, detail="当前课堂不是进行中状态")

    ended_at = datetime.now(timezone.utc)
    duration_seconds = int((ended_at - session.started_at).total_seconds())

    session.status = "ended"
    session.ended_at = ended_at
    session.duration_seconds = duration_seconds
    if request.summary_json is not None:
        session.summary_json = request.summary_json

    db.add(
        LiveSessionEvent(
            live_session_id=session.id,
            event_type="session_ended",
            payload_json={
                "duration_seconds": duration_seconds,
                "ended_by": current_user.id,
            },
        )
    )
    await db.commit()
    if session.class_id in manager.class_rooms:
        await manager.save_snapshot(session.class_id)
        await manager.close_room(session.class_id)
    else:
        manager.set_room_live_session_id(session.class_id, None)

    log_live_transport(
        logger,
        "classroom_session_ended",
        class_id=session.class_id,
        live_session_id=session.id,
        teacher_id=current_user.id,
        duration_seconds=duration_seconds,
        transport="http",
    )
    logger.info("[ClassroomSession] Ended session %s", session.id)
    return EndSessionResponse(
        id=session.id,
        status=session.status,
        ended_at=ended_at.isoformat(),
        duration_seconds=duration_seconds,
    )


@router.get("/sessions/active", response_model=Optional[ActiveSessionResponse])
async def get_active_session(
    class_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_teacher_class(class_id, current_user, db)

    session = await _get_latest_active_session(db, class_id)
    if not session:
        return None

    return ActiveSessionResponse(
        id=session.id,
        class_id=session.class_id,
        teacher_id=session.teacher_id or current_user.id,
        title=session.title,
        entry_mode=session.entry_mode or "whiteboard",
        status=session.status,
        started_at=session.started_at.isoformat(),
    )


@router.get("/sessions/stats", response_model=SessionStatsResponse)
async def get_session_stats(
    class_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    started_after: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="只有教师可以查看课堂统计")

    query = select(LiveSession).where(
        LiveSession.teacher_id == current_user.id,
        LiveSession.status != "cancelled",
    )
    if class_id:
        query = query.where(LiveSession.class_id == class_id)
    if status:
        query = query.where(LiveSession.status == status)
    if started_after:
        try:
            after_dt = datetime.fromisoformat(started_after.replace("Z", "+00:00"))
            query = query.where(LiveSession.started_at >= after_dt)
        except ValueError:
            pass

    result = await db.execute(query)
    sessions = result.scalars().all()
    session_ids = [s.id for s in sessions]

    total_sessions = len(sessions)
    total_duration_seconds = sum(s.duration_seconds or 0 for s in sessions)

    # Total interactions (events excluding joins/leaves/start/end)
    interactions_result = await db.execute(
        select(func.count(LiveSessionEvent.id)).where(
            and_(
                LiveSessionEvent.live_session_id.in_(session_ids),
                LiveSessionEvent.event_type.notin_(
                    ["student_joined", "student_left", "session_started", "session_ended", "share_requested"]
                ),
            )
        )
    )
    total_interactions = interactions_result.scalar() or 0

    # Total share requests
    shares_result = await db.execute(
        select(func.count(LiveSessionEvent.id)).where(
            and_(
                LiveSessionEvent.live_session_id.in_(session_ids),
                LiveSessionEvent.event_type == "share_requested",
            )
        )
    )
    total_shares = shares_result.scalar() or 0

    # Total danmu
    danmu_result = await db.execute(
        select(func.count(DanmuRecord.id)).where(DanmuRecord.session_id.in_(session_ids))
    )
    total_danmu = danmu_result.scalar() or 0

    return SessionStatsResponse(
        total_sessions=total_sessions,
        total_duration_seconds=total_duration_seconds,
        total_interactions=total_interactions,
        total_shares=total_shares,
        total_danmu=total_danmu,
    )


@router.get("/sessions", response_model=List[SessionListItem])
async def list_classroom_sessions(
    class_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    started_after: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="只有教师可以查看课堂回顾")

    query = select(LiveSession).where(
        LiveSession.teacher_id == current_user.id,
        LiveSession.status != "cancelled",
    )
    if class_id:
        query = query.where(LiveSession.class_id == class_id)
    if status:
        query = query.where(LiveSession.status == status)
    if started_after:
        try:
            after_dt = datetime.fromisoformat(started_after.replace("Z", "+00:00"))
            query = query.where(LiveSession.started_at >= after_dt)
        except ValueError:
            pass

    result = await db.execute(query.order_by(LiveSession.started_at.desc()).limit(limit).offset(offset))
    sessions = result.scalars().all()

    items: List[SessionListItem] = []
    for session in sessions:
        class_result = await db.execute(select(Class).where(Class.id == session.class_id))
        class_obj = class_result.scalar_one_or_none()
        class_name = class_obj.name if class_obj else "未知班级"

        event_count_result = await db.execute(
            select(func.count(LiveSessionEvent.id)).where(
                and_(
                    LiveSessionEvent.live_session_id == session.id,
                    LiveSessionEvent.event_type.notin_(
                        ["student_joined", "student_left", "session_started", "session_ended"]
                    ),
                )
            )
        )
        event_count = event_count_result.scalar() or 0

        items.append(
            SessionListItem(
                id=session.id,
                class_id=session.class_id,
                class_name=class_name,
                title=session.title,
                entry_mode=session.entry_mode or "whiteboard",
                status=session.status,
                started_at=session.started_at.isoformat(),
                ended_at=session.ended_at.isoformat() if session.ended_at else None,
                duration_seconds=session.duration_seconds,
                event_count=event_count,
            )
        )
    return items


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_classroom_session_detail(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _require_teacher_session(session_id, current_user, db)

    class_result = await db.execute(select(Class).where(Class.id == session.class_id))
    class_obj = class_result.scalar_one_or_none()
    class_name = class_obj.name if class_obj else "未知班级"

    teacher_result = await db.execute(select(User).where(User.id == session.teacher_id))
    teacher = teacher_result.scalar_one_or_none()
    teacher_name = teacher.name if teacher else "未知教师"

    return SessionDetailResponse(
        id=session.id,
        class_id=session.class_id,
        class_name=class_name,
        teacher_id=session.teacher_id,
        teacher_name=teacher_name,
        title=session.title,
        entry_mode=session.entry_mode or "whiteboard",
        status=session.status,
        started_at=session.started_at.isoformat(),
        ended_at=session.ended_at.isoformat() if session.ended_at else None,
        duration_seconds=session.duration_seconds,
        summary_json=session.summary_json,
    )


@router.get("/sessions/{session_id}/events", response_model=List[SessionEventItem])
async def get_classroom_session_events(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_teacher_session(session_id, current_user, db)
    result = await db.execute(
        select(LiveSessionEvent)
        .where(LiveSessionEvent.live_session_id == session_id)
        .order_by(LiveSessionEvent.created_at.asc())
    )
    events = result.scalars().all()
    return [
        SessionEventItem(
            id=event.id,
            event_type=event.event_type,
            payload_json=event.payload_json,
            created_at=event.created_at.isoformat(),
        )
        for event in events
    ]


@router.get("/sessions/{session_id}/summary", response_model=SessionSummaryResponse)
async def get_classroom_session_summary(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_teacher_session(session_id, current_user, db)

    challenges_result = await db.execute(
        select(func.count(LiveChallengeSession.id)).where(LiveChallengeSession.live_session_id == session_id)
    )
    total_challenges = challenges_result.scalar() or 0

    danmu_result = await db.execute(
        select(func.count(DanmuRecord.id)).where(DanmuRecord.session_id == session_id)
    )
    total_danmu = danmu_result.scalar() or 0

    tasks_result = await db.execute(select(LiveTask).where(LiveTask.session_id == session_id))
    tasks = tasks_result.scalars().all()
    task_ids = [task.id for task in tasks]
    total_tasks = len(tasks)

    joined_events_result = await db.execute(
        select(LiveSessionEvent)
        .where(
            and_(
                LiveSessionEvent.live_session_id == session_id,
                LiveSessionEvent.event_type == "student_joined",
            )
        )
        .order_by(LiveSessionEvent.created_at.asc())
    )
    joined_events = joined_events_result.scalars().all()

    student_join_map: dict[str, dict] = {}
    for event in joined_events:
        payload = event.payload_json or {}
        student_id = payload.get("student_id")
        if student_id and student_id not in student_join_map:
            student_join_map[student_id] = {
                "student_id": student_id,
                "student_name": payload.get("student_name") or "未知学生",
                "joined_at": event.created_at.isoformat() if event.created_at else None,
            }
    joined_student_ids = set(student_join_map.keys())

    total_submissions = 0
    correct_submissions = 0
    student_submission_counts: dict[str, int] = {}
    if task_ids:
        submissions_result = await db.execute(select(LiveSubmission).where(LiveSubmission.task_id.in_(task_ids)))
        submissions = submissions_result.scalars().all()
        for submission in submissions:
            if submission.student_id not in joined_student_ids:
                continue
            total_submissions += 1
            if submission.is_correct:
                correct_submissions += 1
            student_submission_counts[submission.student_id] = student_submission_counts.get(submission.student_id, 0) + 1

    average_accuracy = None
    if total_submissions > 0:
        average_accuracy = round((correct_submissions / total_submissions) * 100, 2)

    most_active_students: List[dict] = []
    for student_id, count in sorted(student_submission_counts.items(), key=lambda item: item[1], reverse=True)[:5]:
        student_result = await db.execute(select(User).where(User.id == student_id))
        student = student_result.scalar_one_or_none()
        if student:
            most_active_students.append(
                {
                    "student_id": student_id,
                    "student_name": student.name,
                    "submission_count": count,
                }
            )

    # Per-group submission counts
    group_submission_rows = await db.execute(
        select(
            LiveTaskGroupSubmission.group_id,
            func.count(func.distinct(LiveTaskGroupSubmission.student_id)),
        )
        .where(
            LiveTaskGroupSubmission.session_id == session_id,
            LiveTaskGroupSubmission.group_id.is_not(None),
        )
        .group_by(LiveTaskGroupSubmission.group_id)
    )
    task_group_submissions = [
        TaskGroupSubmissionSummary(group_id=gid, submitted_students=count)
        for gid, count in group_submission_rows.all()
    ]

    # Share requests count
    shares_result = await db.execute(
        select(func.count(LiveSessionEvent.id)).where(
            and_(
                LiveSessionEvent.live_session_id == session_id,
                LiveSessionEvent.event_type == "share_requested",
            )
        )
    )
    total_shares = shares_result.scalar() or 0

    return SessionSummaryResponse(
        session_id=session_id,
        total_students=len(student_join_map),
        total_tasks=total_tasks,
        total_submissions=total_submissions,
        total_challenges=total_challenges,
        total_shares=total_shares,
        total_danmu=total_danmu,
        average_accuracy=average_accuracy,
        most_active_students=most_active_students,
        all_students=[SessionStudentInfo(**item) for item in student_join_map.values()],
        task_group_submissions=task_group_submissions,
    )
