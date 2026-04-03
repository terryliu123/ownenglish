# OwnEnglish AI 课前准备开发说明 v0.2

- 日期: `2026-03-24`
- 阶段: `直接进入开发`
- 对应页面: `client/src/pages/teacher/TaskGroups.tsx`
- 对应后端: `server/app/api/v1/live.py`

## 1. 当前开发目标

将老师端课前准备页正式升级为 `AI 出题工作台`，替代原先以手工逐题设计为主的路径。

第一阶段开发目标：

1. 支持粘贴题目文本并由 AI 识别生成题组草稿
2. 支持上传 `Word(.docx)` 并由系统抽取文本后生成题组草稿
3. 支持输入出题需求，由 AI 自动生成题组草稿
4. 生成后统一进入预览与修改流程
5. 支持答案位置随机展示配置
6. 支持将题组标记为 `ready` 并进入课堂待发布链路

## 2. 当前实际落点

### 前端

页面文件：

- `client/src/pages/teacher/TaskGroups.tsx`

当前行为：

1. 保留 `/teacher/task-groups` 路由
2. 页面改造为 AI 出题工作台
3. 支持文本导入、Word 导入、需求生成三种入口
4. 支持生成后展开题组查看与编辑题目
5. 支持补充题目、修改题目、删除题目、标记待发布

### 后端

接口文件：

- `server/app/api/v1/live.py`

当前新增接口：

1. `POST /api/v1/live/task-groups/ai-import`
2. `POST /api/v1/live/task-groups/ai-import-docx`
3. `POST /api/v1/live/task-groups/ai-generate`

## 3. 当前接口定义

### 3.1 AI 文本导入识别

`POST /api/v1/live/task-groups/ai-import`

请求体：

```json
{
  "class_id": "string",
  "title": "string",
  "raw_text": "string",
  "randomize_answer_position": true
}
```

说明：

1. 当前先用规则化识别跑通链路
2. 后续替换为真实 AI 识别服务

### 3.2 AI Word 导入识别

`POST /api/v1/live/task-groups/ai-import-docx`

请求方式：

- `multipart/form-data`

表单字段：

1. `class_id`
2. `title`
3. `randomize_answer_position`
4. `file`

当前约束：

1. 仅支持 `.docx`
2. 文件大小上限 `5MB`
3. 服务端从 `word/document.xml` 抽取正文文本
4. 文本抽取后复用与粘贴导入相同的题目切分和结构化逻辑

### 3.3 AI 需求生成

`POST /api/v1/live/task-groups/ai-generate`

请求体：

```json
{
  "class_id": "string",
  "title": "string",
  "prompt": "string",
  "question_count": 5,
  "difficulty": "medium",
  "types": ["single_choice", "multiple_choice", "true_false"],
  "include_explanations": true,
  "randomize_answer_position": true
}
```

说明：

1. 当前先用规则化生成跑通链路
2. 后续替换为真实 AI 生成服务

## 4. 当前前端交互

页面分为 3 个区域：

1. AI 导入区
2. AI 生成区
3. 已生成题组区

AI 导入区支持：

1. 粘贴题目文本
2. 选择 `.docx` 文件
3. 设置题组名称
4. 配置答案随机展示

已生成题组展开后支持：

1. 查看题型
2. 查看 AI 置信度
3. 查看是否开启答案随机展示
4. 进入修改弹窗
5. 补充题目
6. 标记待发布

## 5. 当前技术策略

为了直接推进开发，本轮采用：

1. UI 先接入真实应用
2. 后端先实现可运行的规则化 AI 占位逻辑
3. 统一保留后续替换为真实模型调用的接口形态

这意味着：

1. 页面和接口已经按 AI 工作流搭好
2. 当前 AI 结果是可控开发桩
3. 后续只需替换生成实现，不需要推翻页面和接口

## 6. 当前已完成状态

已完成：

1. 文本导入识别链路
2. Word `.docx` 导入识别链路
3. 需求生成链路
4. 统一题组草稿落库
5. 题组展开查看与题目编辑
6. 答案随机展示配置
7. 标记 `ready` 进入后续课堂发布流程

## 7. 下一步开发顺序

建议按下面顺序继续：

1. 将规则化 AI 替换为真实模型服务
2. 增强导入识别的答案置信度与错误提示
3. 增强题型覆盖与生成质量
4. 接入真实 Word 异常提示和导入预检查
5. 打通发布检查页与课堂模式待发布队列

## 8. 当前结论

课前准备已经从文档讨论阶段进入真实应用开发阶段。

当前状态是：

1. 方案已切换到 AI 驱动
2. 文本导入、Word 导入、需求生成三条入口已接通
3. 老师端页面已进入实际开发实现
4. 后续可以直接继续做真实 AI 集成和发布联调
