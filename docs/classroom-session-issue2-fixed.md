# 问题2修复：404 Not Found - /live/sessions/active

## 问题描述
前端请求 `/api/v1/live/sessions/active` 返回 404 错误。

## 根本原因
`live` router 在 `__init__.py` 中创建时没有设置 `prefix="/live"`，导致所有子路由直接挂载到 `/api/v1` 下，而不是 `/api/v1/live` 下。

## 修复方案

### 修改文件: `server/app/api/v1/live/__init__.py`

**修改前**:
```python
router = APIRouter(tags=["Live Classroom"])
```

**修改后**:
```python
router = APIRouter(prefix="/live", tags=["Live Classroom"])
```

## 路由路径对比

### 修复前
- `/api/v1/sessions/active` ❌
- `/api/v1/sessions/start` ❌
- `/api/v1/task-groups` ❌

### 修复后
- `/api/v1/live/sessions/active` ✅
- `/api/v1/live/sessions/start` ✅
- `/api/v1/live/task-groups` ✅

## 影响范围
此修复确保所有 live 模块的路由都正确挂载到 `/api/v1/live` 前缀下，与前端 API 调用路径一致。

---

**修复状态**: ✅ 已完成
**需要重启**: 是（后端服务）
