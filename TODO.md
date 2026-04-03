# OwnEnglish 待修复问题清单

## 已完成的修复 ✓

1. **匹配题答案映射修复**（关键bug）
   - 文件：`client/src/pages/student/Live.tsx`
   - 修复内容：修复了学生端提交匹配题时，随机化后的答案索引未正确映射回原始索引的问题

2. **分析视图提交人数显示修复**
   - 文件：`client/src/pages/teacher/Live.tsx`
   - 修复内容：优先使用数据库查询的数据，而不是WebSocket内存中的数据

3. **i18n 迁移**
   - 文件：`client/src/pages/teacher/Live.tsx`
   - 状态：已迁移到i18n系统

4. **构建错误修复**
   - 删除了 `TaskGroups_fix.tsx`
   - 修复了 `HomePage.tsx` 的 SVG 问题

5. **通知API 404错误修复**
   - 文件：`server/app/api/v1/classes.py` 第559行
   - 修复内容：将导入从 `app.api.v1.notifications` 改为 `app.services.notifications`，解决循环导入问题

6. **通知API路由注册问题**
   - 原因：服务器未重启导致新路由未加载
   - 解决：重启服务器后 `/api/v1/notifications` 端点将正常工作
   - 验证：已确认路由已正确注册：
     - GET `/api/v1/notifications`
     - GET `/api/v1/notifications/stats`
     - POST `/api/v1/notifications/mark-read`
     - DELETE `/api/v1/notifications/{id}`

---

## 待修复问题

### 1. 课前准备模式报错（优先级：高）

**问题描述：** 进入课前准备（任务组管理）页面时报错，课堂模式无异常

**相关页面：** `client/src/pages/teacher/TaskGroups.tsx`

**初步分析：**
- 新增的阅读题型（`reading`）使用TipTap编辑器，数据格式为对象而非纯文本
- 可能的数据兼容性问题
- 可能涉及 `live.py` 中的任务组API端点

**待诊断信息：**
- 需要具体的错误消息或堆栈跟踪
- 确定是客户端错误还是服务端错误
- 确定在哪一步失败：加载页面、创建任务组、添加题目、或保存

**相关文件：**
- `client/src/pages/teacher/TaskGroups.tsx`
- `client/src/services/api.ts` (liveTaskService)
- `server/app/api/v1/live.py`

---

### 2. 通知API 404错误（优先级：高）✅ 已解决

**问题描述：** 客户端调用 `/api/v1/notifications` 返回 404 Not Found

**原因：** 服务器未重启，新添加的路由未加载

**解决：** 重启服务器即可解决。已验证路由正确注册：
- GET `/api/v1/notifications`
- GET `/api/v1/notifications/stats`
- POST `/api/v1/notifications/mark-read`
- DELETE `/api/v1/notifications/{id}`
- DELETE `/api/v1/notifications` (删除全部)

---

### 3. i18n 完整迁移（优先级：中）

**文件：** `client/src/pages/teacher/Live.tsx`

**需要替换的硬编码中文：**
- 第1534行：`第 X 题 (正确/错误/未作答)` - title属性中的乱码
- 第1565行：`单个学生答题详情弹窗` - 注释中的乱码
- 搜索所有剩余的中文文本并添加到 `zh-CN.json`

**建议添加的i18n key：**
```json
{
  "live": {
    "questionTitle": "第 {{index}} 题",
    "answered": "已作答",
    "unanswered": "未作答",
    "studentDetailModal": "学生答题详情弹窗",
    "totalTasks": "题目数量",
    "submittedStudents": "答题人数",
    "participationRate": "参与率",
    "averageCorrectRate": "平均正确率",
    "questionStats": "题目统计",
    "submissions": "提交",
    "people": "人",
    "correctRate": "正确率"
  }
}
```

---

### 4. 500 错误修复（优先级：高）

**端点：** `POST /api/v1/study-packs/submissions`

**相关文件：**
- `server/app/api/v1/study_packs.py` 第227-274行
- `server/app/schemas/__init__.py` - SubmissionCreate schema
- `server/app/models/__init__.py` - Submission model

**调试步骤：**
1. 启动服务器查看详细错误日志
2. 检查请求参数是否符合schema定义
3. 检查数据库字段类型是否匹配

**可能的错误原因：**
- answers 字段类型不匹配（期望dict，实际可能是其他类型）
- 缺少必需的字段
- 数据库约束错误

---

### 5. 任务从历史列表消失（优先级：中）

**问题描述：** 课堂模式的任务执行完成后，在历史列表中就看不到了

**相关文件：**
- `server/app/core/websocket.py` - `published_tasks_history` 管理
- `server/app/api/v1/live.py` - 任务组相关端点

**可能的原因：**
- 任务状态过滤问题（draft/ready/active/ended/archived）
- 教师端获取历史列表时过滤条件不正确
- WebSocket room关闭后历史数据丢失

**检查点：**
1. `get_room_state()` 中的 `task_history` 构建逻辑
2. 教师端获取任务组列表的API调用
3. 任务组状态变化时的历史记录更新

---

### 6. TypeScript 类型错误（优先级：低）

**文件：** `client/src/pages/student/Live.tsx`

**错误类型：** `Property 'xxx' does not exist on type '{}'`

**修复方案：**
为 `task.question` 相关属性添加正确的类型定义：
```typescript
interface Question {
  text?: string;
  options?: Array<{ key: string; text: string }>;
  pairs?: Array<{ left: string; right: string }>;
  blanks?: Array<{ position: number; answer: string }>;
}
```

7. **首页静态数据改为动态API数据**
   - 后端：`server/app/api/v1/reports.py` 新增 `/teacher/dashboard` 端点
   - 前端：`client/src/pages/teacher/Dashboard.tsx` 使用 API 获取统计数据
   - 前端：`client/src/components/layout/Layout.tsx` TeacherSidebar 接受 selectedClass 属性
   - 涉及字段：当前班级信息、在线人数、待发任务数、未发布学习包数、需关注学生数

开启新对话后，可以使用以下指令继续修复：

```
继续修复以下问题：
1. 通知API 404错误 - 检查服务器是否正确加载路由
2. 课前准备模式报错 - 需要用户提供具体错误信息
3. study-packs/submissions 的 500 错误
4. 任务从历史列表消失的问题
```
