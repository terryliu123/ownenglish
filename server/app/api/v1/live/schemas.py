"""Pydantic schemas for live classroom API."""
from typing import Any, Optional, List
from pydantic import BaseModel


class TaskQuestionData(BaseModel):
    """题目数据 - 格式由题型决定，这里只做基础验证"""
    pass


class LiveTaskCreate(BaseModel):
    """创建题目"""
    type: str  # 题型标识符
    question: dict  # 题目内容
    countdown_seconds: int = 30
    correct_answer: Optional[Any] = None


class LiveTaskUpdate(BaseModel):
    """更新题目"""
    type: Optional[str] = None
    question: Optional[dict] = None
    countdown_seconds: Optional[int] = None
    correct_answer: Optional[Any] = None
    order: Optional[int] = None


class LiveTaskGroupCreate(BaseModel):
    """创建任务组"""
    class_id: str
    title: str


class LiveTaskGroupUpdate(BaseModel):
    """更新任务组"""
    title: Optional[str] = None
    status: Optional[str] = None


class ReorderTasksRequest(BaseModel):
    """重排序题目"""
    task_ids: List[str]


class AiImportTaskGroupRequest(BaseModel):
    class_id: str
    title: str
    raw_text: str
    target_group_id: Optional[str] = None
    task_mode: str = "objective"
    randomize_answer_position: bool = False


class AiGenerateTaskGroupRequest(BaseModel):
    class_id: str
    title: str
    prompt: str
    target_group_id: Optional[str] = None
    task_mode: str = "objective"
    question_count: int = 5
    difficulty: str = "medium"
    types: Optional[List[str]] = None
    include_explanations: bool = True
    randomize_answer_position: bool = False


class ShareTaskGroupRequest(BaseModel):
    """分享任务组请求"""
    share_name: str
    share_description: Optional[str] = None
    expires_days: Optional[int] = None  # 多少天后过期，null表示永不过期


class ImportSharedTaskGroupRequest(BaseModel):
    """导入分享的任务组请求"""
    share_token: str
    class_id: str
    title: Optional[str] = None  # 如果不提供，使用分享时的名称


# ── WebSocket message validation schemas ──

class WsPublishTaskMessage(BaseModel):
    task_id: str
    class Config:
        extra = "allow"

class WsPublishTaskGroupMessage(BaseModel):
    group_id: str
    class Config:
        extra = "allow"

class WsEndTaskMessage(BaseModel):
    task_id: str
    class Config:
        extra = "allow"

class WsEndTaskGroupMessage(BaseModel):
    group_id: str
    class Config:
        extra = "allow"

class WsStartChallengeMessage(BaseModel):
    challenge_id: str
    class Config:
        extra = "allow"

class WsEndChallengeMessage(BaseModel):
    challenge_id: str
    class Config:
        extra = "allow"

class WsApproveShareMessage(BaseModel):
    share_id: str
    class Config:
        extra = "allow"

class WsRejectShareMessage(BaseModel):
    share_id: str
    class Config:
        extra = "allow"

class WsDanmuSendMessage(BaseModel):
    content: str
    class Config:
        extra = "allow"

class WsDanmuConfigMessage(BaseModel):
    enabled: Optional[bool] = None
    showStudent: Optional[bool] = None
    showSource: Optional[bool] = None
    speed: Optional[str] = None
    density: Optional[str] = None
    area: Optional[str] = None
    class Config:
        extra = "allow"

class WsAtmosphereEffectMessage(BaseModel):
    effect: str
    class Config:
        extra = "allow"


class WsTaskGroupAnswerItem(BaseModel):
    task_id: str
    answer: Any

class WsSubmitTaskGroupMessage(BaseModel):
    group_id: str
    answers: List[WsTaskGroupAnswerItem]
    session_id: Optional[str] = None

    class Config:
        extra = "allow"

class WsSubmitAnswerMessage(BaseModel):
    answer: Any
    start_time: Optional[str] = None

    class Config:
        extra = "allow"

class WsSubmitChallengeMessage(BaseModel):
    challenge_id: str
    answers: List[Any]

    class Config:
        extra = "allow"

class WsChallengeProgressMessage(BaseModel):
    challenge_id: str
    # progress fields are dynamic - allow any extra fields
    class Config:
        extra = "allow"

class WsStudentShareRequestMessage(BaseModel):
    content_type: str  # 'text' or 'image'
    content: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        extra = "allow"


# Mapping: msg_type → Pydantic model for validation
WS_TEACHER_MESSAGE_SCHEMAS = {
    "publish_task": WsPublishTaskMessage,
    "publish_task_group": WsPublishTaskGroupMessage,
    "end_task": WsEndTaskMessage,
    "end_task_group": WsEndTaskGroupMessage,
    "start_challenge": WsStartChallengeMessage,
    "end_challenge": WsEndChallengeMessage,
    "approve_share": WsApproveShareMessage,
    "reject_share": WsRejectShareMessage,
    "danmu_trigger": WsDanmuSendMessage,
    "danmu_config": WsDanmuConfigMessage,
    "atmosphere_effect": WsAtmosphereEffectMessage,
}

WS_STUDENT_MESSAGE_SCHEMAS = {
    "submit_task_group": WsSubmitTaskGroupMessage,
    "submit_answer": WsSubmitAnswerMessage,
    "submit_challenge": WsSubmitChallengeMessage,
    "challenge_progress": WsChallengeProgressMessage,
    "student_share_request": WsStudentShareRequestMessage,
    "danmu_send": WsDanmuSendMessage,
}
