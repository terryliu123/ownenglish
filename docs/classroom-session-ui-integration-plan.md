# 课堂会话控制 UI 调整方案

## 用户需求
将"开始本节课"/"结束本节课"按钮集成到顶部工具栏右侧，而不是单独占一行。

## 当前状态
- ClassroomSessionBar 独立占一行（蓝色背景条）
- 位置：在顶部工具栏上方

## 目标状态
- 集成到顶部工具栏（header）右侧
- 未开始：显示"开始本节课"按钮
- 进行中：显示计时器 + "结束本节课"按钮

## 实施步骤

### 1. 移除独立的 ClassroomSessionBar
```tsx
// WhiteboardMode.tsx - 删除这一行
<ClassroomSessionBar classId={currentClassId} />
```

### 2. 在 header 右侧添加课堂控制
```tsx
// WhiteboardMode.tsx - 在 header 内部右侧添加
<header className="...">
  {/* 左侧：返回 + 班级选择 */}
  <div>...</div>

  {/* 右侧：课堂会话控制 + 其他按钮 */}
  <div className="flex items-center gap-3">
    {/* 课堂会话控制 */}
    {!session ? (
      <button
        onClick={handleStartSession}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        开始本节课
      </button>
    ) : (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-sm">{formatTime(elapsedSeconds)}</span>
        </div>
        <button
          onClick={handleEndSession}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          结束本节课
        </button>
      </div>
    )}

    {/* 原有的其他按钮 */}
    <button>深色</button>
    <button>大屏互动</button>
    {/* ... */}
  </div>
</header>
```

### 3. 在 WhiteboardMode 中使用 useClassroomSession
```tsx
// 在组件顶部添加
const { session, elapsedSeconds, startSession, endSession } = useClassroomSession(currentClassId)

const handleStartSession = async () => {
  try {
    await startSession()
  } catch (error) {
    alert('开始课堂失败')
  }
}

const handleEndSession = async () => {
  if (!window.confirm('确定要结束本节课吗？')) return
  try {
    await endSession()
  } catch (error) {
    alert('结束课堂失败')
  }
}
```

## 文件修改清单
1. `client/src/pages/teacher/WhiteboardMode.tsx` - 主要修改
2. `client/src/features/whiteboard/components/ClassroomSessionBar.tsx` - 可以删除或保留备用

## 预期效果
- 顶部工具栏右侧显示课堂控制
- 与现有按钮风格一致
- 不占用额外空间

---
**优先级**: 高
**工作量**: 30分钟
**状态**: 待实施
