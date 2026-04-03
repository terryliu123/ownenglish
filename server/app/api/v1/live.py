"""API endpoints for real-time classroom task management.

This module re-exports from the live package for backward compatibility.
All functionality has been moved to the live/ package.
"""
# Re-export everything from the live package
from app.api.v1.live import (
    router,
    LiveTaskCreate,
    LiveTaskUpdate,
    LiveTaskGroupCreate,
    LiveTaskGroupUpdate,
    ReorderTasksRequest,
    AiImportTaskGroupRequest,
    AiGenerateTaskGroupRequest,
    ShareTaskGroupRequest,
    ImportSharedTaskGroupRequest,
    log_activity,
    _answers_match,
)

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
