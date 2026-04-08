# 问题1修复：白板模式看不到"开始本节课"按钮

## 问题原因

`ClassroomSessionBar` 组件在第41行有条件判断：
```typescript
if (!classId) return null
```

而 `WhiteboardMode.tsx` 中 `currentClassId` 初始值为 `null`，只有在班级列表加载完成后才会设置值（第317行）。

在班级加载期间，`ClassroomSessionBar` 不会渲染任何内容。

## 解决方案

### 方案1：显示加载状态（推荐）

修改 `ClassroomSessionBar.tsx`，在没有 classId 时显示提示信息：

```typescript
if (!classId) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b">
      <span className="text-sm text-gray-500">请先选择班级</span>
    </div>
  )
}
```

### 方案2：等待班级加载完成后再显示

修改 `WhiteboardMode.tsx`，只在有 classId 时才渲染 `ClassroomSessionBar`：

```typescript
{currentClassId && <ClassroomSessionBar classId={currentClassId} />}
```

### 方案3：从 localStorage 恢复上次选择的班级

在 `WhiteboardMode.tsx` 中添加 localStorage 持久化：

```typescript
const [currentClassId, setCurrentClassId] = useState<string | null>(() => {
  return localStorage.getItem('whiteboard_last_class_id')
})

// 在 setCurrentClassId 时同步保存
const handleClassChange = (newClassId: string) => {
  setCurrentClassId(newClassId)
  localStorage.setItem('whiteboard_last_class_id', newClassId)
}
```

## 推荐实施

采用**方案1 + 方案3**的组合：
1. 显示友好的加载/提示状态
2. 记住用户上次选择的班级，下次直接恢复

---

**问题状态**: 已识别
**优先级**: 高
**影响范围**: 白板模式首次加载
