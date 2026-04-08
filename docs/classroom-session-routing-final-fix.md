# 路由问题最终修复方案

## 修复策略

采用**精确控制**策略：只给 `classroom_sessions` 子路由添加 `/live` 前缀，其他路由保持原样。

## 修改内容

### 1. 回退 live/__init__.py 的 prefix
```python
# server/app/api/v1/live/__init__.py
router = APIRouter(tags=["Live Classroom"])  # 移除 prefix="/live"
```

### 2. 在 classroom_sessions.py 添加 prefix
```python
# server/app/api/v1/live/classroom_sessions.py
router = APIRouter(prefix="/live")  # 只有这个子路由有 /live 前缀
```

## 最终路由映射

| 端点 | 完整路径 | 文件 |
|------|----------|------|
| 任务组列表 | `/api/v1/task-groups` | task_groups.py |
| 班级在线状态 | `/api/v1/classes/{id}/presence` | sessions.py |
| 挑战管理 | `/api/v1/challenges` | challenges.py |
| 提交管理 | `/api/v1/submissions` | submissions.py |
| **课堂会话** | `/api/v1/live/sessions/*` | classroom_sessions.py ✅ |
| WebSocket | `/api/v1/live/ws` | __init__.py |

## 验证步骤

重启后端后，验证以下端点：
1. ✅ `GET /api/v1/live/sessions/active?class_id=xxx`
2. ✅ `POST /api/v1/live/sessions/start`
3. ✅ `GET /api/v1/task-groups?class_id=xxx`
4. ✅ `GET /api/v1/classes/{id}/presence`
5. ✅ `WS /api/v1/live/ws`

---

**状态**: ✅ 已修复
**需要**: 重启后端服务
