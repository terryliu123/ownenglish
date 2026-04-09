from enum import Enum
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum, ForeignKey, JSON, Integer, Float, Text, text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.db.session import Base


class UserRole(str, Enum):
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=True)
    username = Column(String(50), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    name = Column(String(100), nullable=False)
    role = Column(SQLEnum(UserRole, values_callable=lambda x: [e.value for e in x]), nullable=False)
    is_active = Column(Boolean, default=True)
    is_guest = Column(Boolean, default=False)
    invitation_code_id = Column(String(36), nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    teacher_profile = relationship("TeacherProfile", back_populates="user", uselist=False)
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)


class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"

    user_id = Column(String(36), ForeignKey("users.id"), primary_key=True, nullable=False)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    settings = Column(JSON, nullable=True)

    # Relationships
    user = relationship("User", back_populates="teacher_profile")
    courses = relationship("Course", back_populates="teacher")
    classes = relationship("Class", back_populates="teacher")
    membership = relationship("TeacherMembership", back_populates="teacher", uselist=False, cascade="all, delete-orphan")
    payment_orders = relationship("PaymentOrder", back_populates="teacher", cascade="all, delete-orphan")


class MembershipPlan(Base):
    __tablename__ = "membership_plans"

    code = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price_cents = Column(Integer, nullable=False, default=0)
    duration_days = Column(Integer, nullable=True)
    max_classes = Column(Integer, nullable=True)
    max_students_per_class = Column(Integer, nullable=True)
    max_task_groups = Column(Integer, nullable=True)
    max_study_packs = Column(Integer, nullable=True)
    can_use_ai = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    memberships = relationship("TeacherMembership", back_populates="plan")
    payment_orders = relationship("PaymentOrder", back_populates="plan")


class TeacherMembership(Base):
    __tablename__ = "teacher_memberships"

    teacher_id = Column(String(36), ForeignKey("teacher_profiles.user_id"), primary_key=True, nullable=False)
    plan_code = Column(String(50), ForeignKey("membership_plans.code"), nullable=False)
    status = Column(String(50), default="free")  # free, trial, active, expired
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    source = Column(String(50), default="system")  # system, trial, wechat_pay, admin
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    teacher = relationship("TeacherProfile", back_populates="membership")
    plan = relationship("MembershipPlan", back_populates="memberships")


class PaymentOrder(Base):
    __tablename__ = "payment_orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_no = Column(String(64), unique=True, index=True, nullable=False)
    teacher_id = Column(String(36), ForeignKey("teacher_profiles.user_id"), nullable=False, index=True)
    plan_code = Column(String(50), ForeignKey("membership_plans.code"), nullable=False)
    amount = Column(Integer, nullable=False)
    status = Column(String(50), default="pending")  # pending, paid, failed, cancelled, expired
    payment_channel = Column(String(50), default="wechat_pay")
    wechat_prepay_id = Column(String(100), nullable=True)
    wechat_h5_url = Column(String(1000), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    raw_notify_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    teacher = relationship("TeacherProfile", back_populates="payment_orders")
    plan = relationship("MembershipPlan", back_populates="payment_orders")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, default="general", index=True)
    is_secret = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class TeachingAid(Base):
    __tablename__ = "teaching_aids"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    slug = Column(String(120), unique=True, index=True, nullable=False)
    category_code = Column(String(50), nullable=False, index=True)
    category_label = Column(String(100), nullable=False)
    summary = Column(Text, nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    diagram_image_url = Column(String(500), nullable=True)
    entry_file = Column(String(255), nullable=False, default="index.html")
    storage_path = Column(String(500), nullable=False)
    source_filename = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="draft")  # draft, active, archived
    tags = Column(JSON, nullable=False, default=list)
    source_type = Column(String(50), nullable=False, default="batch_import")  # manual_import, batch_import, ai_generated
    teacher_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)  # 创建者教师ID
    share_code = Column(String(16), unique=True, nullable=True, index=True)  # 分享码
    is_public = Column(Boolean, nullable=False, default=False)  # 是否公开到公共库（教师创建的不公开）
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    sessions = relationship("TeachingAidSession", back_populates="teaching_aid", cascade="all, delete-orphan")
    teacher = relationship("User")


class TeachingAidSession(Base):
    __tablename__ = "teaching_aid_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teaching_aid_id = Column(String(36), ForeignKey("teaching_aids.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    live_session_id = Column(String(36), ForeignKey("live_sessions.id"), nullable=True, index=True)  # 关联课堂会话
    session_token = Column(String(64), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    teaching_aid = relationship("TeachingAid", back_populates="sessions")
    user = relationship("User")
    live_session = relationship("LiveSession")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    user_id = Column(String(36), ForeignKey("users.id"), primary_key=True, nullable=False)
    grade_level = Column(String(50), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    learning_stats = Column(JSON, nullable=True)

    # Relationships
    user = relationship("User", back_populates="student_profile")
    enrollments = relationship("ClassEnrollment", back_populates="student")
    submissions = relationship("Submission", back_populates="student")
    group_submissions = relationship("LiveTaskGroupSubmission", back_populates="student")


class Course(Base):
    __tablename__ = "courses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(36), ForeignKey("teacher_profiles.user_id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    level = Column(String(50), nullable=True)  # A1, A2, B1, B2, etc.

    # Relationships
    teacher = relationship("TeacherProfile", back_populates="courses")
    classes = relationship("Class", back_populates="course")


class Class(Base):
    __tablename__ = "classes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String(36), ForeignKey("courses.id"), nullable=True)
    teacher_id = Column(String(36), ForeignKey("teacher_profiles.user_id"), nullable=False)
    name = Column(String(200), nullable=False)
    invite_code = Column(String(20), unique=True, index=True, nullable=False)
    status = Column(String(50), default="active")  # active, completed, archived
    start_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    ai_settings = Column(JSON, nullable=True)  # 学生端 AI 助手设置

    # Relationships
    course = relationship("Course", back_populates="classes")
    teacher = relationship("TeacherProfile", back_populates="classes")
    enrollments = relationship("ClassEnrollment", back_populates="class_")
    study_packs = relationship("StudyPack", back_populates="class_")
    live_sessions = relationship("LiveSession", back_populates="class_")
    task_groups = relationship("LiveTaskGroup", back_populates="class_", cascade="all, delete-orphan")
    challenge_sessions = relationship("LiveChallengeSession", back_populates="class_", cascade="all, delete-orphan")


class ClassEnrollment(Base):
    __tablename__ = "class_enrollments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False)
    student_id = Column(String(36), ForeignKey("student_profiles.user_id"), nullable=False)
    status = Column(String(50), default="active")  # active, left, removed
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    class_ = relationship("Class", back_populates="enrollments")
    student = relationship("StudentProfile", back_populates="enrollments")


class GuestSession(Base):
    __tablename__ = "guest_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True)
    student_id_number = Column(String(50), nullable=False)  # 学号
    name = Column(String(100), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User")


class StudyPack(Base):
    __tablename__ = "study_packs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="draft")  # draft, published, expired
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(String(36), ForeignKey("teacher_profiles.user_id"), nullable=False)

    # Relationships
    class_ = relationship("Class", back_populates="study_packs")
    modules = relationship("PracticeModule", back_populates="study_pack", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="study_pack")


class PracticeModule(Base):
    __tablename__ = "practice_modules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    study_pack_id = Column(String(36), ForeignKey("study_packs.id"), nullable=False)
    type = Column(String(50), nullable=False)  # vocabulary, sentence, listening, reading, speaking
    content = Column(JSON, nullable=False)
    order = Column(Integer, nullable=False)
    estimated_minutes = Column(Integer, nullable=True)

    # Relationships
    study_pack = relationship("StudyPack", back_populates="modules")
    submissions = relationship("Submission", back_populates="module")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    study_pack_id = Column(String(36), ForeignKey("study_packs.id"), nullable=False)
    student_id = Column(String(36), ForeignKey("student_profiles.user_id"), nullable=False)
    module_id = Column(String(36), ForeignKey("practice_modules.id"), nullable=True)
    answers = Column(JSON, nullable=False)
    score = Column(Float, nullable=True)
    status = Column(String(50), default="pending")  # pending, completed, graded
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    study_pack = relationship("StudyPack", back_populates="submissions")
    student = relationship("StudentProfile", back_populates="submissions")
    module = relationship("PracticeModule", back_populates="submissions")


class LiveTaskGroup(Base):
    """任务组 - 课前准备的题目集合"""
    __tablename__ = "live_task_groups"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False)
    title = Column(String(200), nullable=False)
    status = Column(String(50), default="draft")  # draft, ready, archived
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    class_ = relationship("Class", back_populates="task_groups")
    tasks = relationship("LiveTask", back_populates="task_group", cascade="all, delete-orphan", order_by="LiveTask.order")
    group_submissions = relationship("LiveTaskGroupSubmission", back_populates="task_group", cascade="all, delete-orphan")
    challenge_sessions = relationship("LiveChallengeSession", back_populates="task_group", cascade="all, delete-orphan")


class LiveTask(Base):
    """实时任务/题目 - 支持任意题型扩展"""
    __tablename__ = "live_tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String(36), ForeignKey("live_task_groups.id"), nullable=True)
    session_id = Column(String(36), ForeignKey("live_sessions.id"), nullable=True)
    type = Column(String(50), nullable=False)  # 题型标识符，如 single_choice, true_false, fill_blank, matching 等
    question = Column(JSON, nullable=False)  # 题目内容，格式由题型决定
    countdown_seconds = Column(Integer, default=30)
    order = Column(Integer, default=0)  # 题目顺序
    status = Column(String(50), default="pending")  # pending, active, ended
    correct_answer = Column(JSON, nullable=True)  # 正确答案，格式由题型决定

    # Relationships
    task_group = relationship("LiveTaskGroup", back_populates="tasks")
    session = relationship("LiveSession", back_populates="tasks")
    submissions = relationship("LiveSubmission", back_populates="task", cascade="all, delete-orphan")


class LiveSession(Base):
    """课堂会话 - 上课记录"""
    __tablename__ = "live_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False)
    teacher_id = Column(String(36), ForeignKey("teacher_profiles.user_id"), nullable=True)  # 冗余但有用
    group_id = Column(String(36), ForeignKey("live_task_groups.id"), nullable=True)  # 关联的任务组
    topic = Column(String(200), nullable=True)
    title = Column(String(200), nullable=True)  # 课堂标题
    entry_mode = Column(String(50), nullable=True)  # whiteboard, interaction_management, bigscreen_activity
    status = Column(String(50), default="active")  # active, ended, cancelled
    duration_seconds = Column(Integer, nullable=True)  # 课堂时长（秒）
    summary_json = Column(JSON, nullable=True)  # 课堂摘要统计
    danmu_config = Column(JSON, nullable=True)  # 弹幕配置 {enabled, speed, area, ...}
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    class_ = relationship("Class", back_populates="live_sessions")
    teacher = relationship("TeacherProfile")
    tasks = relationship("LiveTask", back_populates="session", cascade="all, delete-orphan")
    group_submissions = relationship("LiveTaskGroupSubmission", back_populates="session", cascade="all, delete-orphan")
    events = relationship("LiveSessionEvent", back_populates="session", cascade="all, delete-orphan")


class LiveSubmission(Base):
    """学生提交答案"""
    __tablename__ = "live_submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), ForeignKey("live_tasks.id"), nullable=False)
    student_id = Column(String(36), ForeignKey("student_profiles.user_id"), nullable=False)
    answer = Column(JSON, nullable=False)  # 答案格式由题型决定
    is_correct = Column(Boolean, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    task = relationship("LiveTask", back_populates="submissions")


class LiveSessionEvent(Base):
    """课堂会话事件 - 记录课堂内关键事件"""
    __tablename__ = "live_session_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    live_session_id = Column(String(36), ForeignKey("live_sessions.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # session_started, task_published, challenge_started, etc.
    payload_json = Column(JSON, nullable=True)  # 事件详细数据
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    session = relationship("LiveSession", back_populates="events")


class LiveTaskGroupSubmission(Base):
    """任务组提交详情 - 存储每个学生在任务组中每道题的答题情况"""
    __tablename__ = "live_task_group_submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String(36), ForeignKey("live_task_groups.id"), nullable=False)
    session_id = Column(String(36), ForeignKey("live_sessions.id"), nullable=True)
    student_id = Column(String(36), ForeignKey("student_profiles.user_id"), nullable=False)
    task_id = Column(String(36), ForeignKey("live_tasks.id"), nullable=False)
    answer = Column(JSON, nullable=False)  # 学生答案
    is_correct = Column(Boolean, nullable=True)  # 是否正确
    response_time_ms = Column(Integer, nullable=True)  # 响应时间(毫秒)
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    task_group = relationship("LiveTaskGroup", back_populates="group_submissions")
    session = relationship("LiveSession", back_populates="group_submissions")
    task = relationship("LiveTask")
    student = relationship("StudentProfile")


class LiveChallengeSession(Base):
    """课堂竞技会话。"""
    __tablename__ = "live_challenge_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False, index=True)
    task_group_id = Column(String(36), ForeignKey("live_task_groups.id"), nullable=False, index=True)
    live_session_id = Column(String(36), ForeignKey("live_sessions.id"), nullable=True, index=True)  # 关联课堂会话
    mode = Column(String(50), nullable=False)  # duel, class_challenge
    title = Column(String(200), nullable=False)
    participant_ids = Column(JSON, nullable=False, default=list)
    scoreboard = Column(JSON, nullable=False, default=list)
    status = Column(String(50), default="draft")  # draft, active, ended, cancelled
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    class_ = relationship("Class", back_populates="challenge_sessions")
    task_group = relationship("LiveTaskGroup", back_populates="challenge_sessions")
    live_session = relationship("LiveSession")


class VerificationCode(Base):
    """邮箱验证码（注册用）"""
    __tablename__ = "verification_codes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), nullable=False, index=True)
    code = Column(String(10), nullable=False)
    purpose = Column(String(20), nullable=False)  # 'register' | 'reset_password'
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class PasswordResetToken(Base):
    """密码重置令牌"""
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), nullable=False, index=True)
    token = Column(String(64), nullable=False, unique=True, index=True)
    temp_password = Column(String(255), nullable=False)  # 临时密码的哈希
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class TaskGroupShare(Base):
    """任务组分享 - 用于老师间分享任务组"""
    __tablename__ = "task_group_shares"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    share_token = Column(String(64), unique=True, index=True, nullable=False)  # 分享链接token
    task_group_id = Column(String(36), ForeignKey("live_task_groups.id"), nullable=False)
    shared_by = Column(String(36), ForeignKey("teacher_profiles.user_id"), nullable=False)  # 分享者
    share_name = Column(String(200), nullable=False)  # 分享名称（接收者看到的名称）
    share_description = Column(Text, nullable=True)  # 分享描述
    is_active = Column(Boolean, default=True)  # 是否有效
    view_count = Column(Integer, default=0)  # 查看次数
    copy_count = Column(Integer, default=0)  # 被复制次数
    expires_at = Column(DateTime(timezone=True), nullable=True)  # 过期时间，null表示永不过期
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    task_group = relationship("LiveTaskGroup")
    teacher = relationship("TeacherProfile")


class NotificationType(str, Enum):
    SYSTEM = "system"  # 系统通知
    CLASS_ANNOUNCEMENT = "class_announcement"  # 班级公告
    STUDY_PACK_ASSIGNED = "study_pack_assigned"  # 新学习包分配
    STUDY_PACK_DUE = "study_pack_due"  # 学习包即将到期
    LIVE_SESSION_STARTED = "live_session_started"  # 直播课开始
    SUBMISSION_GRADED = "submission_graded"  # 作业已批改
    NEW_STUDENT_JOINED = "new_student_joined"  # 新学生加入班级
    SHARE_IMPORTED = "share_imported"  # 分享的任务组被导入


class Notification(Base):
    """用户通知/消息系统"""
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)  # 接收者
    type = Column(SQLEnum(NotificationType), nullable=False)  # 通知类型
    title = Column(String(200), nullable=False)  # 标题
    content = Column(Text, nullable=True)  # 内容
    data = Column(JSON, nullable=True)  # 附加数据（链接ID等）
    is_read = Column(Boolean, default=False)  # 是否已读
    read_at = Column(DateTime(timezone=True), nullable=True)  # 阅读时间
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User")


class ActivityType(str, Enum):
    CREATE_TASK_GROUP = "create_task_group"       # 创建课前准备
    PUBLISH_TASK = "publish_task"                  # 发布任务
    SHARE_TASK = "share_task"                     # 分享任务
    CREATE_CLASS = "create_class"                 # 创建班级
    CREATE_STUDY_PACK = "create_study_pack"       # 创建学习包
    STUDENT_JOIN_CLASS = "student_join_class"      # 学生加入班级


class ActivityLog(Base):
    """用户活动日志"""
    __tablename__ = "activity_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    type = Column(SQLEnum(ActivityType), nullable=False)
    description = Column(String(500), nullable=False)  # 活动描述
    entity_type = Column(String(50), nullable=True)   # 关联实体类型，如 task_group, class, study_pack
    entity_id = Column(String(36), nullable=True)     # 关联实体ID
    extra_data = Column(JSON, nullable=True)          # 附加信息
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User")


class BigscreenContentAsset(Base):
    __tablename__ = "bigscreen_content_assets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(36), ForeignKey("teacher_profiles.user_id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    content_type = Column(String(50), nullable=False, index=True)
    payload = Column(JSON, nullable=False)
    difficulty = Column(String(50), nullable=True)
    tags = Column(JSON, nullable=False, default=list)
    supports_device_interaction = Column(Boolean, default=False)
    supports_bigscreen_interaction = Column(Boolean, default=True)
    supports_competition = Column(Boolean, default=True)
    source_type = Column(String(50), nullable=False, default="manual")
    status = Column(String(50), nullable=False, default="draft")  # draft, active, archived
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    teacher = relationship("TeacherProfile")


class BigscreenActivityPack(Base):
    __tablename__ = "bigscreen_activity_packs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(36), ForeignKey("teacher_profiles.user_id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    activity_type = Column(String(50), nullable=False, index=True)
    participant_mode = Column(String(50), nullable=False)
    content_asset_refs = Column(JSON, nullable=False, default=list)
    round_count = Column(Integer, nullable=False, default=1)
    time_limit_seconds = Column(Integer, nullable=True)
    scoring_rule = Column(String(100), nullable=False, default="round_wins_then_time")
    win_rule = Column(String(100), nullable=False, default="highest_score_then_time")
    status = Column(String(50), nullable=False, default="draft")  # draft, active, archived
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    teacher = relationship("TeacherProfile")
    sessions = relationship("BigscreenActivitySession", back_populates="activity_pack", cascade="all, delete-orphan")


class BigscreenActivitySession(Base):
    __tablename__ = "bigscreen_activity_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(36), ForeignKey("teacher_profiles.user_id"), nullable=False, index=True)
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False, index=True)
    activity_pack_id = Column(String(36), ForeignKey("bigscreen_activity_packs.id"), nullable=False, index=True)
    live_session_id = Column(String(36), ForeignKey("live_sessions.id"), nullable=True, index=True)  # 关联课堂会话
    activity_type = Column(String(50), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="pending")  # pending, running, paused, ended, cancelled
    participant_sides = Column(JSON, nullable=False, default=list)
    current_round = Column(Integer, nullable=False, default=1)
    current_asset_id = Column(String(36), ForeignKey("bigscreen_content_assets.id"), nullable=True)
    scoreboard = Column(JSON, nullable=False, default=list)
    result_summary = Column(JSON, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    teacher = relationship("TeacherProfile")
    class_ = relationship("Class")
    activity_pack = relationship("BigscreenActivityPack", back_populates="sessions")
    current_asset = relationship("BigscreenContentAsset")
    live_session = relationship("LiveSession")


class InvitationCode(Base):
    """邀请码"""
    __tablename__ = "invitation_codes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(20), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    used_count = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class DanmuRecord(Base):
    """弹幕记录"""
    __tablename__ = "danmu_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("live_sessions.id"), nullable=False, index=True)
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False, index=True)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    sender_name = Column(String(100), nullable=False)
    content = Column(String(200), nullable=False)
    is_preset = Column(Boolean, nullable=False, default=False)  # 是否预设弹幕
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    session = relationship("LiveSession")
    sender = relationship("User")


class LiveRoomSnapshot(Base):
    """课堂房间运行时快照 - 用于服务器重启后恢复状态"""
    __tablename__ = "live_room_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False, unique=True, index=True)
    teacher_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    live_session_id = Column(String(36), ForeignKey("live_sessions.id"), nullable=True)
    room_state = Column(JSON, nullable=True)  # {current_task_group, current_challenge, danmu_config, published_history}
    version = Column(Integer, default=0, nullable=False)  # 乐观并发控制
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
