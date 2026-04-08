# 路由前缀问题完整修复方案

## 问题分析

添加 `prefix="/live"` 后，所有 live 模块的子路由都会自动加上 `/live` 前缀，导致以下路由变化：

### 受影响的路由

| 原路径 | 新路径 | 状态 |
|--------|--------|------|
| `/api/v1/task-groups` | `/api/v1/live/task-groups` | ❌ 404 |
| `/api/v1/classes/{id}/presence` | `/api/v1/live/classes/{id}/presence` | ❌ 404 |
| `/api/v1/sessions/active` | `/api/v1/live/sessions/active` | ✅ 正确 |
| `/api/v1/live/ws` | `/api/v1/live/live/ws` | ❌ 重复 |

## 问题根源

`live/__init__.py` 中的子路由已经包含了完整路径，再加上 `prefix="/live"` 会导致路径重复或错误。

## 解决方案

### 方案A：移除 prefix，保持原有路由结构（推荐）

**优点**：
- 不破坏现有 API 路径
- 前端无需修改
- WebSocket 路径保持不变

**缺点**：
- 路由不够统一

### 方案B：统一使用 /live 前缀，调整所有子路由

**优点**：
- 路由结构统一
- 符合 RESTful 规范

**缺点**：
- 需要修改多个子路由文件
- 前端可能需要调整部分 API 调用

## 推荐实施：方案A

### 1. 回退 prefix 修改

```python
# server/app/api/v1/live/__init__.py
router = APIRouter(tags=["Live Classroom"])  # 移除 prefix="/live"
```

### 2. 调整 classroom_sessions 路由

```python
# server/app/api/v1/live/classroom_sessions.py
router = APIRouter(prefix="/live")  # 在子路由中添加 prefix
```

这样只有 classroom_sessions 的路由会有 `/live` 前缀，其他路由保持不变。

## 当前路由映射

```
/api/v1/task-groups              -> task_groups.py
/api/v1/sessions                 -> sessions.py
/api/v1/challenges               -> challenges.py
/api/v1/submissions              -> submissions.py
/api/v1/live/sessions            -> classroom_sessions.py (新增)
/api/v1/live/ws                  -> __init__.py (WebSocket)
/api/v1/classes/{id}/presence    -> 需要确认位置
```

---

**建议**：采用方案A，回退 prefix 修改，只在 classroom_sessions 中添加 prefix
