# 课堂会话与课堂回顾实施计划 v1.1

## Summary

目标是补齐：

1. 显式开始本节课
2. 显式结束本节课
3. 课堂会话层（技术实现：扩展现有 `LiveSession`）
4. `课堂回顾` 一级菜单

整体策略：

- 不推翻现有白板、互动管理、任务、挑战系统
- 以轻量补层方式接入
- 优先建立会话边界，再做课堂回顾页面
- **技术口径**：复用 `LiveSession`，统一使用 `live_session_id`

## 阶段 1：会话模型与边界

### 目标

扩展 `LiveSession` 模型，新增 `LiveSessionEvent` 模型，定清楚会话边界。

### 任务

1. **扩展 `LiveSession` 数据模型**
   - 新增字段：`teacher_id`, `title`, `entry_mode`, `duration_seconds`, `summary_json`
   - 状态扩展：`active`, `ended`, `cancelled`
   - 编写数据库迁移脚本

2. **新增 `LiveSessionEvent` 数据模型**
   - 字段：`id`, `live_session_id`, `event_type`, `payload_json`, `created_at`
   - 定义事件类型枚举
   - 编写数据库迁移脚本

3. **明确运行对象绑定规则**
   - ✅ `LiveChallengeSession` 添加 `live_session_id`（可空）
   - ✅ `BigscreenActivitySession` 添加 `live_session_id`（可空）
   - ✅ `TeachingAidSession` 添加 `live_session_id`（可空）
   - ❌ `LiveTask` 不添加（已有 session_id）
   - ❌ `LiveTaskGroupSubmission` 不添加（已有 session_id）

4. **定义 WebSocket 改造范围**
   - room 内增加 `live_session_id` 字段
   - `room_info` 返回 `live_session_id`
   - 关键事件透传 `live_session_id`

5. **定义空课堂取消规则**
   - 开始后 3 分钟内无动作且无学生 → 自动 cancelled

### 验收

- 数据库迁移成功执行
- 模型定义完整，字段类型正确
- 会话层边界固定，不需要回头改核心定义

## 阶段 2：开始 / 结束本节课

### 目标

把课堂开始和结束做成清晰动作，建立后端接口和前端交互。

### 任务

1. **后端接口开发**
   - `POST /api/v1/live/sessions/start` - 创建课堂会话
   - `POST /api/v1/live/sessions/{id}/end` - 结束课堂会话
   - `GET /api/v1/live/sessions/active` - 获取当前 active session（按 class_id）
   - 接口支持恢复逻辑（检查是否已有 active session）

2. **WebSocket 房间绑定**
   - 创建房间时绑定 `live_session_id`
   - `room_info` 返回 `live_session_id`
   - 课堂结束时广播 `session_ended` 事件

3. **白板顶部交互**
   - 新增"开始本节课"按钮
   - 新增"结束本节课"按钮
   - 新增课堂计时显示
   - 恢复逻辑：检测到 active session 时显示"恢复本节课"

4. **学生端处理**
   - 接收 `session_ended` 事件
   - 显示课堂已结束提示

5. **互动管理页面调整**
   - 显示当前课堂状态（只读）
   - 不提供开始/结束入口

### 验收

- 老师点击"开始本节课"后生成一条 active LiveSession
- 结束后 status 正确更新为 ended
- 重连时能正确恢复到 active session
- 学生端能收到课堂结束通知

## 阶段 3：运行态绑定会话

### 目标

把挑战、大屏互动、教具等运行态绑定到 `live_session_id`

### 任务

1. **LiveChallengeSession 绑定**
   - 创建挑战时自动关联当前 `live_session_id`
   - 数据库迁移添加字段（可空，兼容历史数据）

2. **BigscreenActivitySession 绑定**
   - 启动大屏互动时自动关联当前 `live_session_id`
   - 数据库迁移添加字段（可空）

3. **TeachingAidSession 绑定**
   - 打开教具时自动关联当前 `live_session_id`
   - 数据库迁移添加字段（可空）

4. **WebSocket 事件透传**
   - `challenge_started` 事件透传 `live_session_id`
   - `challenge_ended` 事件透传 `live_session_id`
   - `bigscreen_started` 事件透传 `live_session_id`
   - `bigscreen_ended` 事件透传 `live_session_id`
   - `task_group_published` 事件透传 `live_session_id`
   - `task_group_ended` 事件透传 `live_session_id`

5. **LiveSessionEvent 记录**
   - 关键动作自动记录到 `LiveSessionEvent` 表
   - 事件类型：session_started, task_published, challenge_started 等

### 验收

- 刷新、重连、晚加入都能恢复到正确课堂会话
- 挑战、大屏、教具都正确关联到 live_session_id
- 事件记录完整，可追溯课堂时间线

## 阶段 4：课堂回顾一级菜单与列表

### 目标

先做基础版课堂回顾入口和课堂列表。

### 任务

1. **后端接口开发**
   - `GET /api/v1/live/sessions` - 获取课堂列表（支持筛选）
   - `GET /api/v1/live/sessions/{id}` - 获取课堂详情
   - 支持按班级、时间、状态筛选
   - 排除 cancelled 状态的空课堂

2. **前端路由和菜单**
   - 教师端一级菜单新增"课堂回顾"
   - 路由：`/teacher/classroom-review`
   - 权限：仅教师可见

3. **课堂回顾列表页**
   - 展示字段：标题、班级、时间、时长、互动次数、参与人数、状态
   - 支持筛选：班级、时间范围、状态
   - 点击进入详情页

4. **国际化**
   - 添加中文翻译：课堂回顾、开始本节课、结束本节课等

### 验收

- 教师可以从一级菜单进入课堂回顾列表
- 列表正确展示所有有效课堂（排除 cancelled）
- 筛选功能正常工作

## 阶段 5：课堂回顾详情页

### 目标

把一节课内发生的内容按时间线和摘要展示出来。

### 任务

1. **后端接口增强**
   - `GET /api/v1/live/sessions/{id}/events` - 获取课堂事件时间线
   - `GET /api/v1/live/sessions/{id}/summary` - 获取课堂摘要统计
   - 关联查询：任务、挑战、大屏互动、教具

2. **课堂详情页开发**
   - 路由：`/teacher/classroom-review/:id`
   - 4 个区块：
     - 基础信息：班级、时间、时长、老师、入口模式
     - 课堂时间线：事件流展示（开始 -> 任务 -> 挑战 -> 结束）
     - 参与摘要：到课人数、参与人数、提交人数
     - 结果摘要：任务列表、挑战列表、大屏互动、教具使用

3. **链接跳转**
   - 点击任务可跳转到任务详情
   - 点击挑战可跳转到挑战详情
   - 点击大屏互动可跳转到活动详情

### 验收

- 能清晰回答”这节课发生了什么”
- 时间线完整展示课堂流程
- 摘要数据准确

## 阶段 6：分析接入课堂周期

### 目标

让系统分析具备”节课”维度。

### 任务

1. **数据分析页支持按课堂会话聚合**
   - 按课堂维度统计任务完成率
   - 按课堂维度统计学生参与度

2. **课堂详情页展示统计摘要**
   - 自动计算 summary_json 数据
   - 展示课堂效果评估

3. **后续为教学报告预留接口**
   - 设计报告数据结构
   - 预留扩展点

### 验收

- 数据分析不再只有任务和挑战维度
- 可以按课堂周期查看教学效果

## 总体优先级

1. **阶段 1**：会话模型与边界（数据库基础）
2. **阶段 2**：开始 / 结束本节课（核心交互）
3. **阶段 3**：运行态绑定会话（数据关联）
4. **阶段 4**：课堂回顾一级菜单与列表（基础页面）
5. **阶段 5**：课堂回顾详情页（完整功能）
6. **阶段 6**：分析接入课堂周期（数据增强）

## 最小可用版本（MVP）

如果先做最小闭环，只做：

- **阶段 1** - 会话模型与边界
- **阶段 2** - 开始 / 结束本节课
- **阶段 3** - 运行态绑定会话
- **阶段 4** - 课堂回顾列表

即：

- ✅ 有课堂会话（LiveSession 扩展）
- ✅ 有开始/结束（白板顶部按钮）
- ✅ 运行态绑定 live_session_id（挑战、大屏、教具）
- ✅ 有课堂回顾列表（教师端一级菜单）

这已经能解决当前最核心的问题：

1. 课堂边界清晰
2. 数据可按课堂周期聚合
3. 教师可回顾历史课堂

## 技术口径总结

| 概念 | 产品层 | 技术层 |
|------|--------|--------|
| 会话模型 | 课堂会话 | LiveSession（扩展） |
| 事件记录 | 课堂事件 | LiveSessionEvent（新增） |
| 关联字段 | 课堂ID | live_session_id |
| 前端路由 | 课堂回顾 | /teacher/classroom-review |
| 后端API | 课堂会话 | /api/v1/live/sessions |

**核心原则**：复用现有 LiveSession，避免引入新的并行模型，最小化改动范围。
