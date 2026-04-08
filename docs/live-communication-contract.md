# 课堂通信契约

## 目标
- 固定课堂通信的唯一真相源
- 明确教师端、学生端、后端在课堂链路中的职责
- 避免再次把课堂会话、待发布任务、任务预览、提交同步、课堂回顾混成多套本地真相

后续任何通信相关修改，必须先更新本文件，再修改实现。

## 课堂运行态唯一真相源
课堂运行态统一只认服务端房间态和关键 WebSocket 事件：

- `room_info.live_session_id`
- `room_info.room_state.current_task_group`
- `room_info.room_state.current_challenge`
- `room_info.room_state.task_history`
- `task_group_published`
- `new_task_group`
- `task_group_ended`
- `challenge_started`
- `challenge_progress_updated`
- `challenge_scoreboard_updated`
- `challenge_ended`
- `room_closed`

前端本地状态只允许保存 UI 辅助信息，不得承载业务真相：

- 弹窗开关
- 面板显隐
- 提交中按钮锁
- 预览索引
- 搜索 / 筛选

## 课堂会话绑定规则
- 技术实现继续复用 `LiveSession`
- 一节课 = 一条 `LiveSession`
- 一个班级同一时刻只允许一个活动中的 `live_session_id`
- `room_info.live_session_id` 是“本节课是否已开始”的首要判断依据

教师点击“开始本节课”后，后端负责：
- 创建或恢复 `LiveSession`
- 将当前房间绑定到该 `live_session_id`

教师点击“结束本节课”后，后端负责：
- 结束 `LiveSession`
- 关闭或清空当前课堂房间运行态
- 让学生端回到等待状态

禁止事项：
- 发布任务时自动创建 `LiveSession`
- 前端根据本地页面状态偷偷认定“本节课已开始”

## WebSocket 鉴权规则
- WebSocket 建立连接时必须使用当前有效的 access token
- 前端在建立或重连 WebSocket 前，必须先读取最新 token
- 如果 access token 即将过期，前端必须先调用 refresh 接口再重连 WebSocket
- 不允许继续用已过期 token 重连 WebSocket

原因：
- HTTP 层有 refresh 机制
- WebSocket 不会自动继承 HTTP 的 refresh 结果
- 如果不在连接前主动刷新 token，会出现 HTTP 正常、课堂通信全断的状态

## 待发布任务、预览、历史的边界

### 待发布任务列表
待发布任务列表只能保存摘要数据：

- `group_id`
- `title`
- `status`
- `task_count`

不得要求摘要列表携带完整 `tasks`。

### 预览对象
预览对象必须单独维护完整详情：

- 通过 `getTaskGroup(group_id)` 获取
- 列表刷新不得覆盖完整预览对象

### 已完成任务历史
已完成任务历史只影响历史区域：

- 不得回写待发布列表
- 不得覆盖当前预览对象
- 不得作为发布动作的数据源

## 发布任务契约

### 教师端发送
教师端发布任务组时，只允许发送：

- `type: "publish_task_group"`
- `group_id`
- 可选 `total_countdown`

禁止发送：
- 完整 `tasks`
- 题目内容
- 正确答案

### 后端处理
后端收到发布请求后必须：

1. 校验当前班级存在活动中的 `LiveSession`
2. 若没有活动课堂，明确返回：`请先开始本节课`
3. 按 `group_id` 查询 `LiveTaskGroup` 与组内 `LiveTask`
4. 使用数据库里的题目组装广播 payload
5. 绑定本次发布到当前 `LiveSession`
6. 更新房间内：
   - `current_task_group`
   - `live_session_id`
   - `published_tasks_history`
7. 广播给学生端，并确认回推给教师端

### 广播 payload
`new_task_group` / `task_group_published` 必须稳定包含：

- `group_id`
- `title`
- `tasks`
- `total_countdown`
- `session_id`
- `live_session_id`

## 学生提交契约

### 学生端发送
学生端提交任务组时必须携带：

- `group_id`
- `answers`
- `session_id`

### 后端判重
判重优先级固定为：

1. `session_id + student_id`
2. 若前端未带 `session_id`，再尝试从当前房间 `current_task_group.session_id` 或 `live_session_id` 恢复
3. 只在最后兜底时才按旧口径查询

禁止事项：
- 只按 `group_id + student_id` 判重
- 不区分不同课堂会话下的同一任务组

### 教师端同步
教师端提交人数统一只认服务端：

- `new_task_group_submission`
- `task_group_submission_received`
- `room_info.task_group_submission_count`

## 结束课堂契约
- 结束本节课由后端 API 执行
- 后端负责结束 `LiveSession` 并关闭当前房间
- 学生端只认：
  - `room_closed`
  - 或房间关闭后的等待态恢复

禁止事项：
- 前端只改本地状态，不通知服务端
- 前端假设“点击结束成功 = 学生已经退出”

## 连接状态契约
- UI 中的 `isConnected` / `status` 只表示前端连接表现
- 不得把 UI 连接状态当成课堂运行态真相
- 发布、结束等关键动作必须：
  - 先确保 socket 可用
  - 再等待服务端确认消息或错误消息

禁止事项：
- 只因瞬时 `isConnected === false` 就直接判定发布失败
- 只要 `send()` 成功就视为发布成功

## 课堂回顾挂载规则
课堂回顾继续挂在 `LiveSession` 下聚合，不新增并行 `ClassroomSession` 表。

以下能力继续挂 `live_session_id`：
- 任务发布与结束
- 任务组提交
- 挑战
- 数字化教具
- 大屏互动
- AI 设置
- 弹幕

## 明确禁止事项
以下做法禁止再次出现：

1. 前端发布完整 `tasks`
2. UI 连接状态作为运行态真相
3. 列表摘要覆盖完整预览对象
4. 未开始本节课时后端自动开课
5. 同一概念维护多套本地业务真相
6. 用“刷新总览”同时重写待发布列表、预览对象、已完成历史、课堂会话状态

## 修改流程
后续任何通信相关修改必须按以下顺序执行：

1. 先更新本契约文档
2. 明确影响范围：
   - 教师端
   - 学生端
   - 后端
   - 课堂回顾
3. 确认是否引入新的真相源
4. 再修改实现
5. 至少回归以下主链路：
   - 开始本节课
   - 发布任务
   - 学生接收
   - 学生提交
   - 教师看到提交
   - 结束本节课
   - 学生退出
