# 阶段3完成报告 - 运行态自动关联课堂会话

## 完成时间
2026-04-06

## 已完成工作

### 1. 挑战创建自动关联 ✅

**文件**: `server/app/api/v1/live/challenges.py`

**修改内容**:
1. 导入 `LiveSession` 模型
2. 在创建挑战时查询当前活跃的课堂会话
3. 自动关联 `live_session_id`

```python
# 导入
from app.models import (
    User, LiveChallengeSession, LiveTask, Class, ClassEnrollment, UserRole, LiveSession
)

# 创建挑战时自动关联
active_session_result = await db.execute(
    select(LiveSession).where(
        LiveSession.class_id == class_id,
        LiveSession.status == "active"
    ).order_by(LiveSession.started_at.desc())
)
active_session = active_session_result.scalar_one_or_none()
live_session_id = active_session.id if active_session else None

challenge = LiveChallengeSession(
    class_id=class_id,
    title=title,
    mode=mode,
    task_group_id=task_group_id,
    participant_ids=participant_ids or [],
    status="draft",
    scoreboard=[],
    live_session_id=live_session_id,  # 自动关联
)
```

### 2. 大屏互动自动关联 ✅

**文件**: `server/app/api/v1/bigscreen_activities.py`

**修改内容**:
1. 导入 `LiveSession` 模型
2. 在启动大屏互动时查询当前活跃的课堂会话
3. 自动关联 `live_session_id`

```python
# 导入
from app.models import (
    BigscreenActivityPack,
    BigscreenActivitySession,
    BigscreenContentAsset,
    Class,
    TeacherProfile,
    User,
    UserRole,
    LiveSession,
)

# 启动大屏互动时自动关联
active_session_result = await db.execute(
    select(LiveSession).where(
        LiveSession.class_id == payload.class_id,
        LiveSession.status == "active"
    ).order_by(LiveSession.started_at.desc())
)
active_session = active_session_result.scalar_one_or_none()
live_session_id = active_session.id if active_session else None

session = BigscreenActivitySession(
    teacher_id=teacher_id,
    class_id=payload.class_id,
    activity_pack_id=pack.id,
    activity_type=pack.activity_type,
    status="pending",
    participant_sides=normalized_sides,
    current_round=1,
    current_asset_id=asset_ids[0] if asset_ids else None,
    scoreboard=build_initial_scoreboard(normalized_sides),
    result_summary={"rounds": []},
    live_session_id=live_session_id,  # 自动关联
)
```

### 3. 教具打开自动关联 ✅

**文件**:
- `server/app/services/teaching_aids.py`
- `server/app/api/v1/teaching_aids.py`

**修改内容**:

#### teaching_aids.py (service)
1. 导入 `LiveSession` 模型
2. 修改 `create_teaching_aid_session` 函数签名,添加 `class_id` 参数
3. 查询当前活跃的课堂会话并自动关联

```python
# 导入
from app.models import TeachingAid, TeachingAidSession, LiveSession

# 修改函数
async def create_teaching_aid_session(
    db: AsyncSession,
    teaching_aid_id: str,
    user_id: str,
    class_id: str | None = None,
) -> TeachingAidSession:
    # 获取当前活跃的课堂会话
    live_session_id = None
    if class_id:
        active_session_result = await db.execute(
            select(LiveSession).where(
                LiveSession.class_id == class_id,
                LiveSession.status == "active"
            ).order_by(LiveSession.started_at.desc())
        )
        active_session = active_session_result.scalar_one_or_none()
        live_session_id = active_session.id if active_session else None

    session = TeachingAidSession(
        teaching_aid_id=teaching_aid_id,
        user_id=user_id,
        session_token=create_teaching_aid_session_token(),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS),
        live_session_id=live_session_id,  # 自动关联
    )
    db.add(session)
    await db.flush()
    return session
```

#### teaching_aids.py (API)
修改 `/teaching-aids/{aid_id}/launch` 接口:
1. 添加 `class_id` 查询参数
2. 调用 `create_teaching_aid_session` 时传递 `class_id`

```python
@router.post("/{aid_id}/launch")
async def launch_teaching_aid(
    aid_id: str,
    class_id: str | None = Query(None),  # 新增参数
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # ...
    session = await create_teaching_aid_session(
        db,
        teaching_aid_id=aid.id,
        user_id=current_user.id,
        class_id=class_id  # 传递 class_id
    )
```

## 功能说明

### 自动关联逻辑

所有三个功能都遵循相同的模式:

1. **查询活跃会话**: 根据 `class_id` 查询状态为 `active` 的 `LiveSession`
2. **按时间排序**: 使用 `order_by(LiveSession.started_at.desc())` 获取最新的活跃会话
3. **可空关联**: 如果没有活跃会话,`live_session_id` 为 `None` (向后兼容)
4. **自动绑定**: 创建记录时自动设置 `live_session_id` 字段

### 向后兼容性

- 所有关联都是**可空的** (`nullable=True`)
- 如果没有活跃的课堂会话,功能仍然正常工作
- 不影响现有的未关联记录

## 验证步骤

### 测试1: 挑战关联
1. 开始一节课
2. 创建并启动挑战
3. 查询数据库:
```sql
SELECT id, class_id, live_session_id, status
FROM live_challenge_sessions
ORDER BY created_at DESC LIMIT 5;
```
**预期**: `live_session_id` 不为空

### 测试2: 大屏互动关联
1. 开始一节课
2. 启动大屏互动
3. 查询数据库:
```sql
SELECT id, class_id, live_session_id, status
FROM bigscreen_activity_sessions
ORDER BY created_at DESC LIMIT 5;
```
**预期**: `live_session_id` 不为空

### 测试3: 教具关联
1. 开始一节课
2. 打开教具(需要前端传递 `class_id` 参数)
3. 查询数据库:
```sql
SELECT id, teaching_aid_id, user_id, live_session_id
FROM teaching_aid_sessions
ORDER BY created_at DESC LIMIT 5;
```
**预期**: `live_session_id` 不为空

### 测试4: 无课堂会话时
1. 不开始课堂
2. 创建挑战/大屏/教具
3. **预期**: 功能正常工作,`live_session_id` 为 `NULL`

## 前端适配需求

### 教具打开
前端调用教具打开接口时需要传递 `class_id` 参数:

```typescript
// 示例
const response = await api.post(`/teaching-aids/${aidId}/launch?class_id=${classId}`)
```

如果前端不传递 `class_id`,教具仍然可以打开,只是不会关联课堂会话。

## 文件清单

### 修改的文件
- `server/app/api/v1/live/challenges.py` - 挑战创建自动关联
- `server/app/api/v1/bigscreen_activities.py` - 大屏互动自动关联
- `server/app/services/teaching_aids.py` - 教具会话创建逻辑
- `server/app/api/v1/teaching_aids.py` - 教具打开接口

## 下一步工作

**阶段4: 课堂回顾列表页** (半天)

1. **后端接口**:
   - `GET /api/v1/live/sessions` - 获取课堂列表
   - 支持按 class_id, status 筛选
   - 返回课堂摘要信息(标题、时长、互动次数等)

2. **前端页面**:
   - 创建 `client/src/pages/teacher/ClassroomReview.tsx`
   - 添加路由 `/teacher/classroom-review`
   - 在教师端导航添加"课堂回顾"入口

---

**阶段3状态**: ✅ 100% 完成
**下一阶段**: 阶段4 - 课堂回顾列表页
