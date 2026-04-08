# 课堂教学通讯健壮性审计评估

日期：2026-04-08

本文件评估“课堂教学通讯健壮性审计报告”中的 12 项建议，判断其是否真实存在、描述是否准确、改动是否有价值，并给出建议优先级。

结论口径：
- `真实存在`：问题成立，建议进入排期
- `部分真实`：问题方向成立，但报告描述已过时或不准确，需要按现状修正
- `当前不成立 / 已修正`：报告所述问题与现状不符，不建议按原建议执行

---

## 严重问题

### 1. `broadcast_to_students` 单点故障会中断广播
- 文件：`server/app/core/websocket.py`
- 评估：`当前不成立，但有相邻问题`
- 现状：
  - 当前实现对每个学生连接的 `send_json()` 已经做了 `try/except`
  - 单个学生断连不会阻断后续学生广播
- 真实问题：
  - 断开的学生连接没有在广播失败时及时清理
  - 会造成重复异常、脏连接残留、日志噪声
- 建议：
  - 不需要按“单点阻断广播”修
  - 需要补“广播失败时清理失效 student ws”机制
- 优先级：`中`

### 2. 内存泄漏，房间永不清理
- 文件：`server/app/core/websocket.py`
- 评估：`部分真实，值得修`
- 现状：
  - 正常 `close_room()` 会删除 `class_rooms[class_id]`
  - `leave_room()` 会移除学生连接
  - 但老师异常断线、未显式结束课堂、脏 room 残留时，没有统一 TTL/GC 机制
- 另外：
  - 报告写的 `share_rate_limit`、`danmu_rate_limit` 顶层结构不准确，它们现在主要挂在 room 内
- 建议：
  - 增加房间过期清理策略
  - 增加 stale room 回收
  - 增加断线后 teacher_ws/student_ws 失效清理
- 优先级：`高`

### 3. 学生答题提交 DB 写入与 WebSocket 确认非原子
- 文件：`server/app/api/v1/live/websocket_handlers.py`
- 评估：`真实存在，且有价值`
- 现状：
  - 提交链路本质上是“先持久化，再广播”
  - 如果广播失败，数据库已写入但教师端可能暂时看不到实时结果
- 说明：
  - 这不是传统数据库事务能直接解决的“原子性”问题
  - 更现实的方案是：提交成功后，教师端必须能从 room_info / recovery 路径补齐
- 建议：
  - 提交成功回执要清晰
  - 增加广播失败后的恢复机制 / 重放机制 / room_info 补偿
  - 中长期可考虑 outbox 或事件持久化
- 优先级：`高`

### 4. 老师断线重连时状态不同步
- 文件：`server/app/api/v1/live/websocket_handlers.py`
- 评估：`部分真实，且有价值`
- 现状：
  - 当前实现会尝试 hydrate 运行态并恢复 active session
  - 但逻辑里仍存在：
    - 内存 room 为主
    - DB 恢复不完整
    - 某些分支仍可能隐式创建/复用 `LiveSession`
- 报告中“老师重连后自动创建新 LiveSession”这个说法不完全准确，但状态恢复不稳定这个方向是对的
- 建议：
  - 继续补全 teacher reconnect 恢复
  - 把“room 是缓存、DB 是恢复来源”的边界彻底定清
- 优先级：`高`

---

## 中等问题

### 5. 客户端重连无指数退避、无上限
- 文件：`client/src/services/websocket.ts`
- 评估：`当前不成立，报告已过时`
- 现状：
  - 已有指数退避：`1s, 2s, 4s, 8s, 10s`
  - 也有重连上限：最多 5 次
- 真实可优化点：
  - 没有 jitter
  - 白板专用 hook 与通用 websocket.ts 策略还不统一
- 建议：
  - 不需要按“无指数退避、无上限”修
  - 可以补 jitter，降低同一时刻重连风暴
- 优先级：`低到中`

### 6. WebSocket 消息无 schema 验证
- 文件：`server/app/api/v1/live/websocket_handlers.py`
- 评估：`真实存在，且有价值`
- 现状：
  - 大量消息处理仍是 `data.get(...)` 直接取值
  - 缺少统一 schema 校验层
- 风险：
  - 错消息导致 handler 内部异常
  - 不利于协议演进
- 建议：
  - 为 teacher / student WS 消息定义 schema
  - 至少对关键消息做结构验证
- 优先级：`中到高`

### 7. 后台任务无追踪无清理
- 文件：`server/app/api/v1/live/websocket_handlers.py`
- 评估：`真实存在，且有价值`
- 现状：
  - 存在 `asyncio.create_task(_bg_persist())`
  - 无集中追踪，无错误汇总
- 风险：
  - 后台持久化失败时可见性差
  - 任务泄漏或沉默失败难排查
- 建议：
  - 对后台任务做追踪与异常日志统一处理
  - 至少增加 done callback / task registry
- 优先级：`中`

### 8. rate_limit 时间戳累积
- 文件：`server/app/core/websocket.py`
- 评估：`部分真实，值得修`
- 现状：
  - 每次检查会清理窗口外时间戳
  - 所以单个列表不会无限增长
- 但问题仍在：
  - key 本身不会因长期不用而清理
  - 长时间运行后 stale student key 仍可能残留
- 建议：
  - 增加空列表 key 清理
  - 房间销毁时彻底清空相关结构
- 优先级：`中`

---

## 轻度问题

### 9. 客户端 pending messages 队列无上限
- 文件：`client/src/services/websocket.ts`
- 评估：`真实存在，值得修`
- 现状：
  - `pendingMessagesRef` 当前没有显式容量上限
  - 断连期间可能持续堆积
- 建议：
  - 增加上限和丢弃策略
  - 对高频消息（如 progress）做去重或覆盖
- 优先级：`中`

### 10. `get_user_from_token` 错误信息不明确
- 文件：`server/app/api/v1/live/websocket_handlers.py`
- 评估：`真实存在，但优先级不高`
- 现状：
  - token 校验失败统一抛 `Invalid token`
  - 不区分过期 / 格式错误 / payload 问题
- 价值：
  - 对排查问题有帮助
  - 对功能正确性影响有限
- 优先级：`低`

### 11. 挑战赛状态清理存在竞态
- 文件：`server/app/api/v1/live/websocket_handlers.py`
- 评估：`方向可能成立，但需要专项核查`
- 现状：
  - 挑战链路本身比较复杂
  - 该问题不如任务发布链路那样已经被明确验证
- 建议：
  - 不直接按报告结论改
  - 先做专项链路回归与日志核查
- 优先级：`中（需验证后再动）`

### 12. Session 查询无分页
- 文件：`server/app/api/v1/live/classroom_sessions.py`
- 评估：`当前不成立`
- 现状：
  - `list_classroom_sessions` 已有：
    - `limit: int = Query(50, le=100)`
    - `offset: int = Query(0)`
- 结论：
  - 该问题报告已过时
- 优先级：`无`

---

## 建议排期

### P0：应尽快进入健壮性排期
1. 老师断线重连状态恢复补全
2. 学生提交后的广播失败补偿机制
3. 房间与 stale state 清理机制

### P1：建议随后进入
4. WebSocket 消息 schema 校验
5. 后台任务追踪与异常可观测性
6. pending messages 队列上限与策略
7. rate-limit key 清理

### P2：确认后再做
8. 挑战赛状态竞态专项核查
9. token 错误类型细分
10. WS 重连 jitter 优化

## 总结
这份审计报告里：
- `真实且值得修`：3、4、6、7、9
- `部分真实，需要按现状修正后再落地`：2、8、11
- `报告已过时或不成立`：1、5、12
- `真实但优先级较低`：10

建议不要照单全收，而是按本评估结论分批进入排期。
