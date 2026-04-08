# 阶段6 API 使用示例

## 1. 教师仪表盘 - 按课堂筛选

### 不筛选（查看最近7天数据）
```bash
GET /api/v1/reports/teacher/dashboard
Authorization: Bearer <token>
```

**响应**:
```json
{
  "classes": [...],
  "selected_class": {...},
  "stats": {
    "online_count": 12,
    "total_students": 28,
    "pending_tasks": 3,
    "unpublished_packs": 1,
    "focus_students": 5,
    "total_sessions": 15
  },
  "activities": [...]
}
```

### 按课堂会话筛选
```bash
GET /api/v1/reports/teacher/dashboard?live_session_id=session-123
Authorization: Bearer <token>
```

**响应**:
```json
{
  "classes": [...],
  "selected_class": {...},
  "stats": {
    "online_count": 0,
    "total_students": 28,
    "pending_tasks": 3,
    "unpublished_packs": 1,
    "focus_students": 2,
    "total_sessions": 15
  },
  "activities": [...]
}
```

**说明**: `focus_students` 现在表示该课堂会话中未参与的学生数

## 2. 班级摘要 - 按课堂筛选

### 不筛选（查看所有数据）
```bash
GET /api/v1/reports/teacher/class/class-123/summary
Authorization: Bearer <token>
```

**响应**:
```json
{
  "class_id": "class-123",
  "class_name": "高级英语班",
  "student_count": 28,
  "pack_count": 12,
  "submission_count": 336,
  "completion_rate": 100,
  "has_active_session": false,
  "active_session_id": null,
  "total_sessions": 15,
  "filtered_by_session": null
}
```

### 按课堂会话筛选
```bash
GET /api/v1/reports/teacher/class/class-123/summary?live_session_id=session-123
Authorization: Bearer <token>
```

**响应**:
```json
{
  "class_id": "class-123",
  "class_name": "高级英语班",
  "student_count": 28,
  "pack_count": 12,
  "submission_count": 208,
  "completion_rate": 100,
  "has_active_session": false,
  "active_session_id": null,
  "total_sessions": 15,
  "filtered_by_session": "session-123"
}
```

**说明**: `submission_count` 现在只统计该课堂会话的提交数

## 3. 课堂效果分析

### 获取班级所有课堂会话的效果分析
```bash
GET /api/v1/reports/teacher/class/class-123/session-effectiveness
Authorization: Bearer <token>
```

**响应**:
```json
{
  "class_id": "class-123",
  "class_name": "高级英语班",
  "total_sessions": 15,
  "sessions": [
    {
      "session_id": "session-015",
      "title": "第15节课",
      "started_at": "2026-04-06T10:00:00Z",
      "ended_at": "2026-04-06T10:45:00Z",
      "duration_minutes": 45.0,
      "task_count": 8,
      "challenge_count": 2,
      "bigscreen_count": 1,
      "teaching_aid_count": 3,
      "interaction_count": 14,
      "participating_students": 26,
      "participation_rate": 92.9,
      "submission_count": 208,
      "task_completion_rate": 100.0
    },
    {
      "session_id": "session-014",
      "title": "第14节课",
      "started_at": "2026-04-04T14:00:00Z",
      "ended_at": "2026-04-04T14:40:00Z",
      "duration_minutes": 40.0,
      "task_count": 6,
      "challenge_count": 1,
      "bigscreen_count": 0,
      "teaching_aid_count": 2,
      "interaction_count": 9,
      "participating_students": 24,
      "participation_rate": 85.7,
      "submission_count": 144,
      "task_completion_rate": 100.0
    }
  ],
  "overall_stats": {
    "avg_duration_minutes": 42.3,
    "avg_participation_rate": 88.5,
    "avg_task_completion_rate": 95.2,
    "avg_challenge_count": 1.8,
    "total_interactions": 210
  }
}
```

### 空数据响应（新班级）
```bash
GET /api/v1/reports/teacher/class/new-class/session-effectiveness
Authorization: Bearer <token>
```

**响应**:
```json
{
  "class_id": "new-class",
  "class_name": "新班级",
  "total_sessions": 0,
  "sessions": [],
  "overall_stats": {
    "avg_duration_minutes": 0,
    "avg_participation_rate": 0,
    "avg_task_completion_rate": 0,
    "avg_challenge_count": 0,
    "total_interactions": 0
  }
}
```

## 4. 前端集成示例

### React Hook - 获取课堂效果分析
```typescript
import { useState, useEffect } from 'react'
import { api } from '../services/api'

interface SessionEffectiveness {
  class_id: string
  class_name: string
  total_sessions: number
  sessions: Array<{
    session_id: string
    title: string
    started_at: string
    ended_at: string
    duration_minutes: number
    task_count: number
    challenge_count: number
    bigscreen_count: number
    teaching_aid_count: number
    interaction_count: number
    participating_students: number
    participation_rate: number
    submission_count: number
    task_completion_rate: number
  }>
  overall_stats: {
    avg_duration_minutes: number
    avg_participation_rate: number
    avg_task_completion_rate: number
    avg_challenge_count: number
    total_interactions: number
  }
}

export function useSessionEffectiveness(classId: string) {
  const [data, setData] = useState<SessionEffectiveness | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await api.get(
          `/reports/teacher/class/${classId}/session-effectiveness`
        )
        setData(response.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (classId) {
      fetchData()
    }
  }, [classId])

  return { data, loading, error }
}
```

### 使用示例
```typescript
function ClassAnalytics({ classId }: { classId: string }) {
  const { data, loading, error } = useSessionEffectiveness(classId)

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error}</div>
  if (!data || data.total_sessions === 0) {
    return <div>暂无课堂数据</div>
  }

  return (
    <div>
      <h2>{data.class_name} - 课堂效果分析</h2>
      <div className="stats">
        <div>总课堂数: {data.total_sessions}</div>
        <div>平均时长: {data.overall_stats.avg_duration_minutes} 分钟</div>
        <div>平均参与率: {data.overall_stats.avg_participation_rate}%</div>
        <div>平均完成率: {data.overall_stats.avg_task_completion_rate}%</div>
      </div>

      <h3>课堂列表</h3>
      <table>
        <thead>
          <tr>
            <th>标题</th>
            <th>时间</th>
            <th>时长</th>
            <th>参与率</th>
            <th>完成率</th>
            <th>互动次数</th>
          </tr>
        </thead>
        <tbody>
          {data.sessions.map(session => (
            <tr key={session.session_id}>
              <td>{session.title}</td>
              <td>{new Date(session.started_at).toLocaleString()}</td>
              <td>{session.duration_minutes} 分钟</td>
              <td>{session.participation_rate}%</td>
              <td>{session.task_completion_rate}%</td>
              <td>{session.interaction_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

## 5. 数据分析场景

### 场景1: 识别低参与率课堂
```typescript
const lowParticipationSessions = data.sessions.filter(
  s => s.participation_rate < 80
)

if (lowParticipationSessions.length > 0) {
  console.log('需要关注的课堂:', lowParticipationSessions)
}
```

### 场景2: 分析时长与参与率关系
```typescript
const durationVsParticipation = data.sessions.map(s => ({
  duration: s.duration_minutes,
  participation: s.participation_rate
}))

// 可以用于绘制散点图
```

### 场景3: 对比不同互动类型的效果
```typescript
const withChallenges = data.sessions.filter(s => s.challenge_count > 0)
const withoutChallenges = data.sessions.filter(s => s.challenge_count === 0)

const avgParticipationWithChallenges =
  withChallenges.reduce((sum, s) => sum + s.participation_rate, 0) /
  withChallenges.length

const avgParticipationWithoutChallenges =
  withoutChallenges.reduce((sum, s) => sum + s.participation_rate, 0) /
  withoutChallenges.length

console.log('有挑战的课堂平均参与率:', avgParticipationWithChallenges)
console.log('无挑战的课堂平均参与率:', avgParticipationWithoutChallenges)
```

## 6. 错误处理

### 401 未授权
```json
{
  "detail": "Not authenticated"
}
```

### 403 权限不足
```json
{
  "detail": "Only teachers can access this"
}
```

或

```json
{
  "detail": "Not authorized for this class"
}
```

### 404 班级不存在
```json
{
  "detail": "Class not found"
}
```

## 7. 性能考虑

### 大数据量优化建议

如果班级有大量课堂会话（>50节），建议：

1. **分页查询**（未来增强）:
```bash
GET /api/v1/reports/teacher/class/{class_id}/session-effectiveness?page=1&limit=20
```

2. **时间范围筛选**（未来增强）:
```bash
GET /api/v1/reports/teacher/class/{class_id}/session-effectiveness?start_date=2026-03-01&end_date=2026-03-31
```

3. **前端缓存**:
```typescript
// 使用 React Query 缓存数据
import { useQuery } from '@tanstack/react-query'

export function useSessionEffectiveness(classId: string) {
  return useQuery({
    queryKey: ['session-effectiveness', classId],
    queryFn: () => api.get(`/reports/teacher/class/${classId}/session-effectiveness`),
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  })
}
```

---

**文档版本**: v1.0
**最后更新**: 2026-04-06
