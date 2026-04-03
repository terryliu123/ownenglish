"""Live classroom API module.

This module provides endpoints for real-time classroom management including:
- Task groups CRUD and management
- Live sessions and room state
- Challenge/competition mode
- Student submissions
- AI-powered task import and generation
- WebSocket endpoint for real-time communication
"""
from fastapi import APIRouter, WebSocket, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession

# Import sub-routers
from .task_groups import router as task_groups_router
from .sessions import router as sessions_router
from .challenges import router as challenges_router
from .submissions import router as submissions_router

# Import WebSocket handlers
from .websocket_handlers import (
    get_user_from_token,
    handle_teacher_connection,
    handle_student_connection,
    get_db_session,
)

# Create the main router
router = APIRouter(tags=["Live Classroom"])

# Include all HTTP endpoints from sub-modules
router.include_router(task_groups_router)
router.include_router(sessions_router)
router.include_router(challenges_router)
router.include_router(submissions_router)


@router.websocket("/live/ws")
async def live_classroom_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    class_id: str = Query(...),
    db: AsyncSession = Depends(get_db_session),
):
    """WebSocket endpoint for real-time classroom."""
    import logging
    from app.models import UserRole, Class, ClassEnrollment
    from sqlalchemy import select

    logger = logging.getLogger(__name__)
    user = None
    logger.info(f"[WebSocket] New connection attempt - class_id: {class_id}, token length: {len(token) if token else 0}")

    try:
        user = await get_user_from_token(token, db)
        logger.info(f"[WebSocket] User authenticated: {user.id}, role: {user.role}")

        # Verify user has access to this class
        if user.role == UserRole.TEACHER:
            result = await db.execute(select(Class).where(Class.id == class_id))
            class_obj = result.scalar_one_or_none()
            if not class_obj:
                logger.warning(f"[WebSocket] Class not found: {class_id}")
                await websocket.close(code=4001, reason="Class not found")
                return
            if class_obj.teacher_id != user.id:
                logger.warning(f"[WebSocket] Teacher {user.id} not authorized for class {class_id}")
                await websocket.close(code=4001, reason="Not authorized for this class")
                return
            logger.info(f"[WebSocket] Teacher authorized for class {class_id}")
        else:
            result = await db.execute(
                select(ClassEnrollment).where(
                    ClassEnrollment.class_id == class_id,
                    ClassEnrollment.student_id == user.id,
                )
            )
            enrollment = result.scalar_one_or_none()
            if not enrollment:
                logger.warning(f"[WebSocket] Student {user.id} not enrolled in class {class_id}")
                await websocket.close(code=4001, reason="Not enrolled in this class")
                return
            logger.info(f"[WebSocket] Student enrolled in class {class_id}")

        await websocket.accept()
        logger.info(f"[WebSocket] Connection accepted for user {user.id}")

        if user.role == UserRole.TEACHER:
            await handle_teacher_connection(websocket, class_id, user.id, db)
        else:
            await handle_student_connection(websocket, class_id, user.id, db)

    except Exception as e:
        logger.error(f"[WebSocket] Error in websocket handler: {e}", exc_info=True)
        try:
            await websocket.close(code=4000, reason=str(e))
        except Exception:
            pass


# Re-export commonly used items for backward compatibility
from .schemas import (
    LiveTaskCreate,
    LiveTaskUpdate,
    LiveTaskGroupCreate,
    LiveTaskGroupUpdate,
    ReorderTasksRequest,
    AiImportTaskGroupRequest,
    AiGenerateTaskGroupRequest,
    ShareTaskGroupRequest,
    ImportSharedTaskGroupRequest,
)

from .utils import log_activity, _answers_match

__all__ = [
    "router",
    "LiveTaskCreate",
    "LiveTaskUpdate",
    "LiveTaskGroupCreate",
    "LiveTaskGroupUpdate",
    "ReorderTasksRequest",
    "AiImportTaskGroupRequest",
    "AiGenerateTaskGroupRequest",
    "ShareTaskGroupRequest",
    "ImportSharedTaskGroupRequest",
    "log_activity",
    "_answers_match",
]
