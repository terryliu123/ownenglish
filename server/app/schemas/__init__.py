from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# Auth schemas
class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=1)
    role: str  # "teacher" or "student"
    invitation_code: Optional[str] = None


class UserLogin(BaseModel):
    email_or_username: str
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: Optional[str]
    name: str
    role: str
    is_guest: bool = False
    membership: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


class GuestJoinRequest(BaseModel):
    invite_code: str
    student_id_number: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)


class SendVerificationCodeRequest(BaseModel):
    email: EmailStr
    purpose: str = Field(..., pattern="^(register|reset_password)$")


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=4, max_length=10)
    purpose: str = Field(..., pattern="^(register|reset_password)$")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)


# Class schemas
class ClassCreate(BaseModel):
    course_id: Optional[str] = None
    name: str = Field(..., min_length=1)
    invite_code: Optional[str] = None
    start_time: Optional[datetime] = None


class ClassUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    status: Optional[str] = None


class TeacherInfo(BaseModel):
    id: str
    name: str

    model_config = ConfigDict(from_attributes=True)


class ClassResponse(BaseModel):
    id: str
    course_id: Optional[str]
    teacher_id: str
    name: str
    invite_code: str
    status: str
    start_time: Optional[datetime]
    created_at: datetime
    teacher: Optional[TeacherInfo] = None
    student_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# Study Pack schemas
class PracticeModuleType(str, Enum):
    VOCABULARY = "vocabulary"
    SENTENCE = "sentence"
    LISTENING = "listening"
    READING = "reading"
    SPEAKING = "speaking"


class PracticeModuleCreate(BaseModel):
    type: PracticeModuleType
    content: dict
    order: int
    estimated_minutes: Optional[int] = None


class StudyPackCreate(BaseModel):
    class_id: str
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    modules: Optional[list[PracticeModuleCreate]] = None


class StudyPackUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    modules: Optional[list[PracticeModuleCreate]] = None


class PracticeModuleResponse(BaseModel):
    id: str
    study_pack_id: str
    type: str
    content: dict
    order: int
    estimated_minutes: Optional[int]

    model_config = ConfigDict(from_attributes=True)


class StudyPackResponse(BaseModel):
    id: str
    class_id: str
    title: str
    description: Optional[str]
    status: str
    due_date: Optional[datetime]
    created_by: str
    modules: list[PracticeModuleResponse] = []
    module_count: int = 0
    estimated_total_minutes: int = 0
    class_name: Optional[str] = None
    completed_count: int = 0
    completed_module_ids: list[str] = []
    effective_status: str = "draft"
    assigned_student_count: int = 0
    started_student_count: int = 0
    completed_student_count: int = 0
    completion_rate: float = 0
    latest_submissions: list["SubmissionResponse"] = []

    model_config = ConfigDict(from_attributes=True)


# Submission schemas
class SubmissionCreate(BaseModel):
    study_pack_id: str
    module_id: str
    answers: dict


class SubmissionResponse(BaseModel):
    id: str
    study_pack_id: str
    student_id: str
    module_id: Optional[str]
    answers: dict
    score: Optional[float]
    status: str
    submitted_at: datetime
    result: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


StudyPackResponse.update_forward_refs()


# Live task schemas
class LiveTaskType(str, Enum):
    SINGLE_CHOICE = "single_choice"
    TRUE_FALSE = "true_false"
    MATCHING = "matching"
    FILL_BLANK = "fill_blank"


class LiveTaskCreate(BaseModel):
    type: LiveTaskType
    question: dict
    countdown_seconds: int = 30
    correct_answer: Optional[dict] = None


class LiveTaskResponse(BaseModel):
    id: str
    session_id: str
    type: str
    question: dict
    countdown_seconds: int
    status: str
    correct_answer: Optional[dict]

    model_config = ConfigDict(from_attributes=True)


class LiveSubmissionCreate(BaseModel):
    task_id: str
    answer: dict


class LiveSubmissionResponse(BaseModel):
    id: str
    task_id: str
    student_id: str
    answer: dict
    is_correct: Optional[bool]
    response_time_ms: Optional[int]
    submitted_at: datetime

    model_config = ConfigDict(from_attributes=True)
