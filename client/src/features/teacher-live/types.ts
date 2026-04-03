import type {
  LiveTask,
  LiveTaskGroup,
  LiveTaskGroupSession,
  LiveChallengeSession,
  RoomInfo,
  TaskHistoryItem,
} from '../../services/websocket'

export interface ClassPresenceInfo {
  class_id: string
  online_student_count: number
  online_student_ids: string[]
  online_students: { id: string; name: string }[]
  classroom_student_count: number
  classroom_student_ids: string[]
  classroom_students: { id: string; name: string }[]
  has_active_task: boolean
  has_active_task_group?: boolean
  current_task_group_id?: string | null
  task_group_submission_count?: number
}

export interface ShareRequest {
  share_id: string
  student_id: string
  student_name: string
  content_type: 'text' | 'image'
  content: string | null
  image_url: string | null
}

export interface StudentSubmission {
  student_id: string
  student_name: string
  score: number
  correct_count: number
  submissions?: Array<{
    task_id: string
    answer: unknown
    is_correct: boolean
  }>
}

export interface SubmissionData {
  students: StudentSubmission[]
}

export interface TaskAnalytics {
  type: string
  question_text: string
  total_submissions: number
  correct_count: number
  primary_rate: number
  primary_label: string
  metric_mode: 'correctness' | 'response' | string
  has_reference_answer: boolean
  correct_answer: unknown
  answer_required?: boolean
  options?: Array<{
    key: string
    text: string
  }>
  pairs?: Array<{
    left: string
    right: string
  }>
  answer_distribution?: Array<{
    key: string
    text: string
    count: number
    percentage: number
    is_correct: boolean
  }>
  sample_answers?: Array<{
    student_id: string
    student_name: string
    answer: unknown
  }>
  correct_students?: string[]
}

export interface AnalyticsData {
  total_students: number
  summary_rate: number
  summary_label: string
  task_analytics: TaskAnalytics[]
}

export {
  LiveTask,
  LiveTaskGroup,
  LiveTaskGroupSession,
  LiveChallengeSession,
  RoomInfo,
  TaskHistoryItem,
}
