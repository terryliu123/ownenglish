# 课堂会话功能 - 下一步操作清单

## 立即可做（5分钟）

### 1. 集成 ClassroomSessionBar 到白板页面

**文件**: `client/src/pages/teacher/WhiteboardMode.tsx`

**步骤**:
```tsx
// 在文件顶部导入区域添加
import { ClassroomSessionBar } from '../../features/whiteboard/components/ClassroomSessionBar'

// 在 return 的 JSX 中，找到最外层容器，在第一个子元素位置添加
return (
  <div className="flex flex-col h-screen bg-gray-100">
    {/* 新增：课堂会话控制条 */}
    <ClassroomSessionBar classId={currentClassId} />

    {/* 原有内容继续 */}
    ...
  </div>
)
```

**验证**:
- 启动前端：`cd client && npm run dev`
- 访问白板模式
- 应该看到顶部有"开始本节课"按钮
- 点击后显示计时器和"结束本节课"按钮

---

## 短期任务（1-2小时）

### 2. 完成阶段3 - 运行态自动关联

**目标**: 创建挑战/大屏/教具时自动关联 live_session_id

**需要修改的文件**:

#### A. 挑战创建
文件: `server/app/api/v1/live/challenges.py`

在创建挑战的接口中添加：
```python
# 获取当前 active session
from app.models import LiveSession
from sqlalchemy import select, and_

result = await db.execute(
    select(LiveSession).where(
        and_(
            LiveSession.class_id == class_id,
            LiveSession.status == "active"
        )
    )
)
active_session = result.scalar_one_or_none()

# 创建挑战时关联
challenge = LiveChallengeSession(
    class_id=class_id,
    task_group_id=task_group_id,
    live_session_id=active_session.id if active_session else None,  # 关联
    ...
)
```

#### B. 大屏互动
文件: `server/app/api/v1/bigscreen_activities.py`

类似逻辑，在启动大屏互动时关联 live_session_id

#### C. 教具打开
文件: `server/app/services/teaching_aids.py`

在创建 TeachingAidSession 时关联 live_session_id

---

## 中期任务（半天）

### 3. 阶段4 - 课堂回顾列表页

#### 后端接口

**文件**: `server/app/api/v1/live/classroom_sessions.py`

添加列表接口：
```python
from typing import List, Optional
from pydantic import BaseModel

class SessionListItem(BaseModel):
    id: str
    class_id: str
    class_name: str
    title: Optional[str]
    started_at: str
    ended_at: Optional[str]
    duration_seconds: Optional[int]
    status: str
    summary_json: Optional[dict]

@router.get("/sessions", response_model=List[SessionListItem])
async def list_classroom_sessions(
    class_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取课堂列表"""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers")

    query = select(LiveSession).where(
        LiveSession.teacher_id == current_user.id,
        LiveSession.status != "cancelled"  # 排除空课堂
    )

    if class_id:
        query = query.where(LiveSession.class_id == class_id)
    if status:
        query = query.where(LiveSession.status == status)

    query = query.order_by(LiveSession.started_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    sessions = result.scalars().all()

    # 关联查询班级名称
    # ... 实现逻辑

    return sessions
```

#### 前端列表页

**新建文件**: `client/src/pages/teacher/ClassroomReview.tsx`

```tsx
import { useState, useEffect } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { api } from '../../services/api'

export default function ClassroomReview() {
  const { t } = useTranslation()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const response = await api.get('/live/sessions')
      setSessions(response.data)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t('classroom.review')}</h1>

      {loading ? (
        <div>加载中...</div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session: any) => (
            <div key={session.id} className="bg-white p-4 rounded shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{session.title}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(session.started_at).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-sm ${
                  session.status === 'active' ? 'bg-green-100 text-green-800' :
                  session.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {session.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**添加路由**: `client/src/App.tsx`

```tsx
import ClassroomReview from './pages/teacher/ClassroomReview'

// 在路由配置中添加
<Route path="/teacher/classroom-review" element={<ClassroomReview />} />
```

**添加菜单**: 在教师端导航中添加"课堂回顾"链接

---

## 测试清单

### 基础功能测试
- [ ] 点击"开始本节课"创建 active session
- [ ] 计时器正常显示并递增
- [ ] 点击"结束本节课"正确结束 session
- [ ] 重新进入白板能恢复 active session
- [ ] 数据库中 live_sessions 表有正确记录
- [ ] live_session_events 表有 session_started 和 session_ended 事件

### WebSocket 测试
- [ ] room_info 返回 live_session_id
- [ ] 发布任务时事件包含 live_session_id
- [ ] 开始挑战时事件包含 live_session_id

### 课堂回顾测试
- [ ] 列表页显示所有已结束的课堂
- [ ] 可以按班级筛选
- [ ] 可以按状态筛选
- [ ] 点击进入详情页（阶段5）

---

## 优先级建议

1. **高优先级** - 立即完成
   - 集成 ClassroomSessionBar（5分钟）
   - 测试开始/结束课堂流程

2. **中优先级** - 本周完成
   - 课堂回顾列表页（半天）
   - 运行态自动关联（1-2小时）

3. **低优先级** - 后续迭代
   - 课堂回顾详情页（阶段5）
   - 数据分析接入课堂周期（阶段6）

---

## 遇到问题？

### 常见问题

**Q: ClassroomSessionBar 不显示？**
A: 检查 currentClassId 是否有值，组件需要 classId 才会渲染

**Q: 开始课堂失败？**
A: 检查后端日志，确认数据库迁移已执行

**Q: WebSocket 事件没有 live_session_id？**
A: 检查 create_room 时是否传递了 live_session_id 参数

**Q: 课堂回顾列表为空？**
A: 确认已经结束过至少一节课，且 status 不是 cancelled

---

**文档位置**: `docs/classroom-session-implementation-progress.md`
**当前进度**: 阶段2末尾（90%）
**预计完成时间**: 阶段4完成需要1-2天
