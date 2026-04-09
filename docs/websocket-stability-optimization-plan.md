# 互动课堂 WebSocket 稳定性优化方案

## 背景

当前互动课堂（WhiteboardMode）依赖 WebSocket 实现教师-学生实时通信，包括任务发布、答题提交、进度同步、挑战模式等核心功能。由于 WebSocket 连接不稳定（网络波动、token 过期、服务重启等），存在以下风险：

1. 教师发布任务后学生收不到
2. 学生提交答案后教师看不到
3. 服务重启后运行时状态全部丢失
4. 连接断开后无法自动恢复

## 优化方案（按优先级排序）

---

### P0-1：运行时状态快照持久化

**目标**：服务重启后能恢复课堂状态（活跃任务、提交数据、在线学生等）

**存储方案**：PostgreSQL（单实例部署，无需引入 Redis）

**更新策略**：
- **关键事件立即写入**：任务发布、任务结束、挑战开始/结束
- **普通事件 5 秒聚合写入**：学生加入/离开、提交进度更新
- 下课时清理快照数据

**数据结构**：
```sql
CREATE TABLE classroom_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    class_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(36),
    snapshot_type VARCHAR(50) NOT NULL,  -- active_task, challenge, presence, submissions
    snapshot_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_snapshots_class (class_id),
    INDEX idx_snapshots_session (session_id)
);
```

**恢复流程**：
1. WebSocket 重连时检查是否有未结束的 session
2. 从 PostgreSQL 加载快照数据
3. 恢复 activeTaskGroup、currentChallenge、在线学生列表等
4. 向客户端推送恢复后的完整状态

---

### P0-2：统一 WS Token 刷新

**目标**：所有实时客户端（教师白板、学生课堂、大屏活动）在 token 即将过期时统一刷新

**方案**：
- `websocket.ts` 中增加 token 过期检测（解码 JWT 获取 exp）
- 过期前 2 分钟自动调用 `/auth/refresh` 获取新 token
- 刷新成功后断开旧 WS 连接，用新 token 重连
- 刷新失败时提示用户重新登录

**涉及文件**：
- `client/src/services/websocket.ts`
- `client/src/features/whiteboard/hooks/useWhiteboardWebSocket.ts`
- `client/src/features/whiteboard/hooks/useWhiteboardLive.ts`

---

### P0-3：心跳 + 僵尸连接/房间清理

**目标**：及时检测并清理断开的连接和空房间

**心跳机制**：
- 服务端每 30 秒广播 `ping`
- 客户端收到后回复 `pong`
- 连续 3 次 ping 无 pong 回复则断开连接

**清理策略**：
- 连接断开后，从房间中移除该用户
- 房间内无用户时，延迟 5 分钟后清理房间数据
- 教师连接断开后，不立即结束课堂，等待 5 分钟内重连
- 超过 5 分钟未重连，自动保存状态并结束课堂

**涉及文件**：
- `server/app/core/websocket.py` — ConnectionManager 增加心跳和清理逻辑
- `client/src/services/websocket.ts` — 增加 pong 回复逻辑

---

### P0-4：HTTP 降级提交接口

**目标**：当 WebSocket 断连时，学生仍能通过 HTTP 提交答案

**新增接口**：
```
POST /api/v1/live/task-groups/{group_id}/submit
```

**请求体**：
```json
{
  "task_id": "xxx",
  "answer": "A",
  "class_id": "xxx",
  "session_id": "xxx"
}
```

**逻辑**：
1. 验证学生身份和任务状态
2. 将提交写入数据库
3. 如果 WS 可用，同时通过 WS 推送给教师
4. 返回提交结果

**客户端降级流程**：
1. WS 提交失败（超时或断连）
2. 自动切换到 HTTP 接口提交
3. 提交成功后标记为 HTTP 降级模式
4. WS 恢复后切回 WS 模式

**涉及文件**：
- `server/app/api/v1/live/submissions.py` — 新增 HTTP 提交接口
- `client/src/services/api.ts` — 新增 HTTP 提交方法
- `client/src/services/websocket.ts` — 增加降级逻辑

---

### P0-5：关键消息 ACK + 重试

**目标**：确保关键消息（任务发布、提交确认、任务结束、房间关闭）可靠送达

**需要 ACK 的消息类型**：
| 消息方向 | 消息类型 | 说明 |
|---------|---------|------|
| 服务端→学生 | `new_task_group` | 新任务发布 |
| 服务端→教师 | `submission_received` | 收到学生提交 |
| 服务端→全体 | `task_ended` | 任务结束 |
| 服务端→全体 | `room_closed` | 课堂关闭 |
| 服务端→全体 | `challenge_started` | 挑战开始 |
| 服务端→全体 | `challenge_ended` | 挑战结束 |

**ACK 机制**：
1. 服务端发送关键消息时携带 `message_id`
2. 客户端收到后回复 `ack { message_id }`
3. 服务端维护已发送未确认队列
4. 5 秒内未收到 ACK 则重发（最多重试 3 次）
5. 重试 3 次仍失败，标记该客户端为不可达

**涉及文件**：
- `server/app/core/websocket.py` — 增加 ACK 队列和重试逻辑
- `client/src/services/websocket.ts` — 增加 ACK 回复逻辑

---

## 实施计划

| 阶段 | 内容 | 预计改动 |
|------|------|---------|
| 阶段 1 | P0-3 心跳清理 + P0-2 Token 刷新 | 基础稳定性保障 |
| 阶段 2 | P0-4 HTTP 降级提交 | 断连保底方案 |
| 阶段 3 | P0-1 状态快照持久化 | 服务重启恢复 |
| 阶段 4 | P0-5 消息 ACK 重试 | 关键消息可靠投递 |

---

## 已知待修复问题

### 点击已完成任务 404
**现象**：在互动课堂中点击已完成的任务，报 `404 Task group not found`
**原因**：已完成任务使用合成 ID（session_id + group_id），但详情查询使用了原始 group_id，可能因 session 数据清理导致查不到
**优先级**：高
