# 问题排查：ClassroomSessionBar 不显示

## 现象
白板模式顶部没有显示课堂会话控制条（既没有"请先选择班级"，也没有"开始本节课"按钮）

## 可能原因

### 1. 组件被 CSS 隐藏
- 检查是否有 `display: none` 或 `visibility: hidden`
- 检查是否被其他元素遮挡（z-index）
- 检查是否高度为 0

### 2. 组件渲染但不可见
- 背景色与页面背景色相同
- 文字颜色与背景色相同
- 组件在视口外

### 3. 组件未渲染
- React 条件渲染问题
- 组件导入失败
- 运行时错误

## 排查步骤

### 步骤1：检查浏览器开发者工具
1. 打开浏览器开发者工具（F12）
2. 切换到 Elements/元素 标签
3. 搜索 "ClassroomSessionBar" 或 "请先选择班级"
4. 查看该元素是否存在于 DOM 中

### 步骤2：检查控制台错误
查看控制台是否有以下错误：
- `Cannot read property 't' of undefined`
- `useClassroomSession is not defined`
- `useTranslation is not defined`

### 步骤3：检查网络请求
查看是否有以下请求失败：
- `GET /api/v1/live/sessions/active?class_id=xxx`

### 步骤4：添加调试日志
在 `ClassroomSessionBar.tsx` 添加：
```typescript
export function ClassroomSessionBar({ classId }: ClassroomSessionBarProps) {
  console.log('[ClassroomSessionBar] Rendering with classId:', classId)
  const { t } = useTranslation()
  const { session, loading, elapsedSeconds, startSession, endSession } = useClassroomSession(classId)
  console.log('[ClassroomSessionBar] session:', session, 'loading:', loading)
  // ...
}
```

## 临时解决方案

如果组件确实被渲染但不可见，可以尝试增强样式：

```typescript
<div className="flex items-center gap-4 px-4 py-2 bg-yellow-100 border-b border-yellow-300" style={{ minHeight: '48px' }}>
  <span className="text-sm text-gray-900 font-bold">{t('classroom.selectClassFirst') || '请先选择班级'}</span>
</div>
```

---

**下一步**：请提供浏览器控制台的完整日志
