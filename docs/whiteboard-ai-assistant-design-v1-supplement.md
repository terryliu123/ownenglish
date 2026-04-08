# 白板 AI 助手设计稿 v1 补充

## 1. 后端 API 设计

### 1.1 主接口

```
POST /api/v1/whiteboard-ai/respond
```

**请求体：**
```json
{
  "action": "explain | summarize | key_points | quiz | followup | review | free_question",
  "question": "老师的自由提问（可选）",
  "context": {
    "whiteboard_text": "白板上的文本内容",
    "task_title": "当前任务标题",
    "task_questions": ["题目1", "题目2"],
    "class_id": "班级ID",
    "session_id": "课堂会话ID"
  },
  "stream": true
}
```

**响应（流式）：**
```
data: {"type": "start", "content": ""}
data: {"type": "delta", "content": "正在分析"}
data: {"type": "delta", "content": "板书内容"}
data: {"type": "done", "content": "这是完整回答"}
```

**响应（非流式）：**
```json
{
  "type": "structured | text",
  "content": "完整回答内容",
  "title": "结构化标题（仅structured类型）",
  "key_points": ["重点1", "重点2"],
  "quiz_questions": [{"question": "题目", "options": ["A","B","C","D"], "answer": "A"}],
  "followup_questions": ["追问1", "追问2"]
}
```

### 1.2 错误响应

```json
{
  "error": {
    "code": "NO_CONTEXT | AI_SERVICE_ERROR | TIMEOUT | RATE_LIMITED | INVALID_ACTION",
    "message": "友好的中文错误提示",
    "detail": "技术细节（仅开发环境）"
  }
}
```

**错误码说明：**
- `NO_CONTEXT`：当前白板没有可用内容（提示老师先添加内容）
- `AI_SERVICE_ERROR`：AI 服务调用失败（稍后重试）
- `TIMEOUT`：响应超时（3分钟内未完成）
- `RATE_LIMITED`：请求过于频繁（提示等待）
- `INVALID_ACTION`：不支持的 action 类型

## 2. 上下文获取

### 2.1 上下文构造器

```typescript
interface WhiteboardAiContext {
  whiteboard_text: string   // 白板文本框内容
  task_title: string        // 当前任务标题
  task_questions: string[]  // 当前任务题目列表
  current_interaction: string  // 当前进行中的互动内容
  class_id: string
  session_id: string
}
```

**读取方式：**
- 通过 `useWhiteboardLive()` hook 获取 `activeTaskGroup`
- 白板文本内容需要白板组件暴露获取方法
- 不需要改动现有状态管理

### 2.2 上下文为空判断

满足以下任一条件视为空上下文：
- `whiteboard_text` 为空
- 且 `task_questions` 为空
- 且没有进行中的互动

处理：返回友好提示，不调用 AI

## 3. 前端状态管理

### 3.1 useWhiteboardAi Hook

```typescript
interface WhiteboardAiState {
  isOpen: boolean
  isLoading: boolean
  error: AiError | null
  messages: AiMessage[]           // 最近的对话记录（最多10条）
  cachedResults: Map<string, AiCachedResult>  // 动作结果缓存
}

interface AiMessage {
  role: 'user' | 'assistant'
  content: string
  action?: string
  timestamp: number
}

interface AiCachedResult {
  action: string
  content: string
  timestamp: number
  ttl: number  // 缓存有效期(ms)
}
```

### 3.2 缓存策略

- 快捷动作结果缓存 5 分钟
- 同一动作在缓存期内不重复请求
- 展开面板时恢复最近一次结果
- 关闭面板不清除缓存

## 4. 防抖节流策略

### 4.1 自由提问输入

- 输入框防抖：500ms（用户停止输入后才发请求）
- 防止输入过程中频繁请求

### 4.2 快捷动作按钮

- 节流：2秒内不能重复点击同一动作
- 视觉反馈：加载中状态禁用按钮
- 防止老师手快重复触发

### 4.3 流式响应

- 支持逐字显示 AI 输出
- 网络慢时显示"正在思考..."
- 中途可取消（关闭面板时中断请求）

## 5. UI 展开方式

### 5.1 布局结构

```
┌─────────────────────────────────────────────┐
│                 白板区域                      │
│                                             │
│                              ┌────────────┐ │
│                              │  AI 面板   │ │
│                              │  (悬浮)    │ │
│                              └────────────┘ │
│  ○ AI                                           │
└─────────────────────────────────────────────┘
```

- AI 悬浮球固定在白板右下角
- 点击展开后，面板在悬浮球上方显示（不遮挡白板内容）
- 使用 z-index 确保在最上层
- 可拖动或有关闭按钮

### 5.2 面板尺寸

- 宽度：360px
- 最大高度： calc(100vh - 200px)
- 超出可滚动

## 6. 流式输出前端处理

### 6.1 实现方式

```typescript
async function streamResponse(prompt: string) {
  const response = await fetch('/api/v1/whiteboard-ai/respond', {
    method: 'POST',
    body: JSON.stringify({ ... }),
    headers: { 'Accept': 'text/event-stream' }
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    // 解析 SSE 格式: data: {"type": "delta", "content": "xxx"}
    processChunk(chunk)
  }
}
```

### 6.2 UX 处理

- 开始：显示"AI 正在分析..."
- 进行中：逐字追加显示
- 完成：显示完整结果，启用操作按钮
- 错误：显示错误提示，提供重试按钮

## 7. 实施顺序更新

### 第一步（基础设施）
1. 创建 API endpoint `POST /api/v1/whiteboard-ai/respond`
2. 创建 `useWhiteboardAi` hook 基础结构
3. 创建 AI 服务层调用

### 第二步（UI 框架）
4. 创建 `WhiteboardAiLauncher` 悬浮球组件
5. 创建 `WhiteboardAiPanel` 面板组件（基础布局）
6. 集成到 `WhiteboardMode.tsx`

### 第三步（核心功能）
7. 实现 6 个快捷动作
8. 实现流式输出
9. 实现上下文构造器
10. 实现缓存逻辑

### 第四步（完善）
11. 错误处理细化
12. 防抖节流
13. 结果操作（复制、插入白板）
