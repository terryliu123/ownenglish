export type WhiteboardTool = 'pen' | 'eraser' | 'text' | 'image' | 'laser' | 'select' | 'task' | 'pan'

// 主题类型已迁移到 theme.ts
export type { WhiteboardTheme, ThemeConfig } from './theme'

// 保持向后兼容的 re-export
export { themeConfigs, useWhiteboardTheme } from './theme'

// 本地类型定义
export interface LegacyThemeConfig {
  backgroundColor: string
  gridColor: string
  textColor: string
  toolbarBg: string
  panelBg: string
  accentColor: string
}

export interface WhiteboardElement {
  id: string
  type: 'path' | 'text' | 'image' | 'task'
  x: number
  y: number
  width?: number
  height?: number
  data: any
  createdAt: string
  createdBy: string
}

export interface TaskGroup {
  id: string
  title: string
  description?: string
  tasks: Task[]
  status: 'draft' | 'published' | 'ended'
  createdAt: string
}

export interface Task {
  id: string
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'matching' | 'fill_blank' | 'reading'
  question: string
  options?: string[]
  correctAnswer?: any
  countdownSeconds: number
}

export interface ClassPresenceInfo {
  class_id: string
  online_student_count: number
  online_student_ids: string[]
  online_students: StudentInfo[]
  classroom_student_count: number
  classroom_student_ids: string[]
  classroom_students: StudentInfo[]
  has_active_task: boolean
  has_active_task_group?: boolean
  current_task_group_id?: string | null
  task_group_submission_count?: number
}

export interface StudentInfo {
  id: string
  name: string
  avatar?: string
  status: 'online' | 'offline' | 'answering'
  joinedAt?: string
}

export interface WhiteboardState {
  elements: WhiteboardElement[]
  currentTool: WhiteboardTool
  strokeColor: string
  strokeWidth: number
  scale: number
  offsetX: number
  offsetY: number
}

export interface DrawEvent {
  type: 'draw' | 'erase' | 'add' | 'delete' | 'clear'
  element?: WhiteboardElement
  elementId?: string
  timestamp: number
  userId: string
}
