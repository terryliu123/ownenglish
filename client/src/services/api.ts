import axios from 'axios'

const API_BASE_URL = '/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log('[API Request]', config.method, config.url, config.data, 'headers:', config.headers)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling with token refresh
let isRefreshing = false
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason: unknown) => void }> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token)
    else reject(error)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    console.log('[API Error]', error.response?.status, JSON.stringify(error.response?.data, null, 2))

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        originalRequest._retry = true

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
        }

        isRefreshing = true
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          const { access_token, refresh_token: newRefresh } = response.data
          localStorage.setItem('token', access_token)
          if (newRefresh) localStorage.setItem('refresh_token', newRefresh)
          processQueue(null, access_token)
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError, null)
          const isGuest = localStorage.getItem('was_guest') === 'true'
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('guest_expires_at')
          localStorage.removeItem('was_guest')
          window.location.href = isGuest ? '/join?expired=1' : '/login'
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      // No refresh token available
      const isGuest = localStorage.getItem('was_guest') === 'true'
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('guest_expires_at')
      localStorage.removeItem('was_guest')
      // Guests redirect to /join (session expired), regular users to /login
      window.location.href = isGuest ? '/join?expired=1' : '/login'
    }
    return Promise.reject(error)
  }
)

// API services
export const authService = {
  login: async (emailOrUsername: string, password: string) => {
    const response = await api.post('/auth/login', { email_or_username: emailOrUsername, password })
    return response.data
  },

  register: async (data: RegisterData) => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  getMe: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },

  heartbeat: async () => {
    const response = await api.post('/auth/presence/heartbeat')
    return response.data
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
    return response.data
  },

  sendVerificationCode: async (email: string, purpose: 'register' | 'reset_password') => {
    const response = await api.post('/auth/send-verification-code', { email, purpose })
    return response.data
  },

  verifyCode: async (email: string, code: string, purpose: 'register' | 'reset_password') => {
    const response = await api.post('/auth/verify-code', { email, code, purpose })
    return response.data
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { token, new_password: newPassword })
    return response.data
  },
}

export interface MembershipSnapshot {
  plan_code: string
  plan_name: string
  status: 'free' | 'trial' | 'active' | 'expired'
  is_trial: boolean
  is_paid: boolean
  started_at: string | null
  expires_at: string | null
  trial_ends_at: string | null
  source: string
  can_use_ai: boolean
  limits: {
    max_classes: number | null
    max_students_per_class: number | null
    max_task_groups: number | null
    max_study_packs: number | null
  }
  usage: {
    class_count: number
    task_group_count: number
    study_pack_count: number
  }
  wechat_pay_configured?: boolean
}

export interface MembershipPlanData {
  code: string
  name: string
  description?: string
  price_cents: number
  duration_days: number | null
  max_classes: number | null
  max_students_per_class: number | null
  max_task_groups: number | null
  max_study_packs: number | null
  can_use_ai: boolean
  is_active: boolean
  sort_order: number
}

export interface PaymentOrderData {
  id: string
  order_no: string
  plan_code: string
  amount: number
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired'
  payment_channel: string
  wechat_prepay_id?: string | null
  wechat_h5_url?: string | null
  paid_at?: string | null
  created_at: string
  updated_at: string
}

export interface MembershipOrderResponse extends PaymentOrderData {
  payment?: {
    h5_url?: string | null
    code_url?: string | null
  }
}

export interface AdminMembershipPlanConfig extends MembershipPlanData {
  created_at?: string | null
  updated_at?: string | null
}

export interface AdminWeChatPaySettingItem {
  key: string
  value: string
  is_secret: boolean
  description: string
}

export interface AdminMembershipConfigResponse {
  plans: AdminMembershipPlanConfig[]
  wechat_pay_settings: AdminWeChatPaySettingItem[]
}

export const membershipService = {
  getMyMembership: async (): Promise<MembershipSnapshot> => {
    const response = await api.get('/membership/me')
    return response.data
  },

  getPlans: async (): Promise<{ items: MembershipPlanData[] }> => {
    const response = await api.get('/membership/plans')
    return response.data
  },

  getOrders: async (): Promise<{ items: PaymentOrderData[] }> => {
    const response = await api.get('/membership/orders')
    return response.data
  },

  getOrder: async (orderNo: string): Promise<PaymentOrderData> => {
    const response = await api.get(`/membership/orders/${orderNo}`)
    return response.data
  },

  createOrder: async (planCode: string): Promise<MembershipOrderResponse> => {
    const response = await api.post('/membership/orders', { plan_code: planCode })
    return response.data
  },
}

export const adminService = {
  getMembershipConfig: async (): Promise<AdminMembershipConfigResponse> => {
    const response = await api.get('/admin/membership-config')
    return response.data
  },

  updateMembershipPlan: async (
    planCode: string,
    data: Partial<Pick<
      AdminMembershipPlanConfig,
      | 'name'
      | 'description'
      | 'price_cents'
      | 'duration_days'
      | 'max_classes'
      | 'max_students_per_class'
      | 'max_task_groups'
      | 'max_study_packs'
      | 'can_use_ai'
      | 'is_active'
      | 'sort_order'
    >>,
  ): Promise<AdminMembershipPlanConfig> => {
    const response = await api.put(`/admin/membership-config/plans/${planCode}`, data)
    return response.data
  },

  updateWeChatPaySettings: async (data: Record<string, string>): Promise<{ wechat_pay_settings: AdminWeChatPaySettingItem[] }> => {
    const response = await api.put('/admin/membership-config/wechat-pay', data)
    return response.data
  },
}

export const classService = {
  getAll: async () => {
    const response = await api.get('/classes')
    if (Array.isArray(response.data)) {
      return response.data
    }
    if (Array.isArray(response.data?.value)) {
      return response.data.value
    }
    return []
  },

  getById: async (id: string) => {
    const response = await api.get(`/classes/${id}`)
    return response.data
  },

  create: async (data: CreateClassData) => {
    const response = await api.post('/classes', data)
    return response.data
  },

  update: async (id: string, data: { name?: string; status?: string }) => {
    const response = await api.patch(`/classes/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/classes/${id}`)
    return response.data
  },

  joinByCode: async (code: string) => {
    const response = await api.post('/classes/join', { invite_code: code })
    return response.data
  },

  guestJoin: async (data: { invite_code: string; student_id_number: string; name: string }) => {
    const response = await api.post('/classes/guest-join', data)
    return response.data
  },

  leave: async (id: string) => {
    const response = await api.post(`/classes/${id}/leave`)
    return response.data
  },
}

export const studyPackService = {
  getAll: async () => {
    const response = await api.get('/study-packs')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/study-packs/${id}`)
    return response.data
  },

  create: async (data: CreateStudyPackData) => {
    const response = await api.post('/study-packs', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateStudyPackData>) => {
    const response = await api.patch(`/study-packs/${id}`, data)
    return response.data
  },

  publish: async (id: string) => {
    const response = await api.post(`/study-packs/${id}/publish`)
    return response.data
  },

  submitAnswer: async (data: SubmitAnswerData): Promise<StudyPackSubmissionData> => {
    const response = await api.post('/study-packs/submissions', data)
    return response.data
  },

  getAnalytics: async (packId: string): Promise<StudyPackAnalytics> => {
    const response = await api.get(`/study-packs/${packId}/analytics`)
    return response.data
  },

  aiImportModuleContent: async (data: StudyPackAiImportModuleData): Promise<StudyPackAiModuleContentResponse> => {
    const response = await api.post('/study-packs/ai-import', data)
    return response.data
  },

  aiImportModuleContentDocx: async (
    file: File,
    data: StudyPackAiImportModuleDocxData
  ): Promise<StudyPackAiModuleContentResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('class_id', data.class_id)
    formData.append('module_type', data.module_type)
    if (data.title) formData.append('title', data.title)

    const response = await api.post('/study-packs/ai-import-docx', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  aiGenerateModuleContent: async (data: StudyPackAiGenerateModuleData): Promise<StudyPackAiModuleContentResponse> => {
    const response = await api.post('/study-packs/ai-generate', data)
    return response.data
  },

  aiGeneratePack: async (data: StudyPackAiGeneratePackData): Promise<StudyPackAiGeneratePackResponse> => {
    const response = await api.post('/study-packs/ai-generate-pack', data)
    return response.data
  },
}

export const liveService = {
  getMyTaskGroupSubmissions: async (groupId: string, sessionId?: string) => {
    const params = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
    const response = await api.get(`/live/task-groups/${groupId}/my-submissions${params}`)
    return response.data
  },

  // 任务组分享功能
  shareTaskGroup: async (groupId: string, data: { share_name: string; share_description?: string; expires_days?: number | null }) => {
    const response = await api.post(`/live/task-groups/${groupId}/share`, data)
    return response.data
  },

  getSharedTaskGroup: async (shareToken: string) => {
    const response = await api.get(`/live/task-groups/share/${shareToken}`)
    return response.data
  },

  importSharedTaskGroup: async (data: { share_token: string; class_id: string; title?: string }) => {
    const response = await api.post('/live/task-groups/import-shared', data)
    return response.data
  },

  getTaskGroupShares: async (groupId: string) => {
    const response = await api.get(`/live/task-groups/${groupId}/shares`)
    return response.data
  },

  deleteTaskGroupShare: async (shareId: string) => {
    const response = await api.delete(`/live/task-groups/shares/${shareId}`)
    return response.data
  },
}

// ============ Notification Service ============

export interface Notification {
  id: string
  type: 'system' | 'class_announcement' | 'study_pack_assigned' | 'study_pack_due' | 'live_session_started' | 'submission_graded' | 'new_student_joined' | 'share_imported'
  title: string
  content?: string
  data?: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface NotificationListResponse {
  items: Notification[]
  unread_count: number
  total: number
}

export interface NotificationStats {
  total: number
  unread: number
}

export const notificationService = {
  getNotifications: async (params?: { unread_only?: boolean; limit?: number; offset?: number }): Promise<NotificationListResponse> => {
    const response = await api.get('/notifications', { params })
    return response.data
  },

  getStats: async (): Promise<NotificationStats> => {
    const response = await api.get('/notifications/stats')
    return response.data
  },

  markAsRead: async (notificationIds?: string[]): Promise<{ marked_count: number }> => {
    const response = await api.post('/notifications/mark-read', { notification_ids: notificationIds })
    return response.data
  },

  markAllAsRead: async (): Promise<{ marked_count: number }> => {
    const response = await api.post('/notifications/mark-read', {})
    return response.data
  },

  deleteNotification: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`)
  },

  deleteAll: async (): Promise<void> => {
    await api.delete('/notifications')
  },
}

// Types
export interface RegisterData {
  email: string
  username: string
  password: string
  name: string
  role: 'teacher' | 'student'
}

export interface CreateClassData {
  course_id?: string
  name: string
  invite_code?: string
  start_time?: string
}

export interface CreateStudyPackData {
  class_id: string
  title: string
  description: string
  due_date?: string
  modules?: PracticeModuleData[]
  status?: string
}

export interface PracticeModuleData {
  type: 'vocabulary' | 'sentence' | 'listening' | 'reading' | 'speaking'
  content: Record<string, unknown>
  order: number
  estimated_minutes?: number
}

export interface StudyPackAiImportModuleData {
  class_id: string
  module_type: PracticeModuleData['type']
  raw_text: string
  title?: string
}

export interface StudyPackAiImportModuleDocxData {
  class_id: string
  module_type: PracticeModuleData['type']
  title?: string
}

export interface StudyPackAiGenerateModuleData {
  class_id: string
  module_type: PracticeModuleData['type']
  prompt: string
  title?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  estimated_minutes?: number
}

export interface StudyPackAiGeneratePackData {
  class_id: string
  prompt: string
  title?: string
  description?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  target_minutes?: number
  module_types?: PracticeModuleData['type'][]
}

export interface StudyPackAiModuleContentResponse {
  module_type: PracticeModuleData['type']
  content: Record<string, unknown>
  source: 'manual_fallback' | 'ai_import' | 'ai_generate'
}

export interface StudyPackAiGeneratePackResponse {
  title: string
  description: string
  modules: PracticeModuleData[]
  source: 'manual_fallback' | 'ai_generate'
}

export interface StudyPackData {
  id: string
  class_id: string
  title: string
  description?: string
  status: string
  effective_status: string
  due_date?: string
  created_by: string
  class_name?: string
  module_count: number
  estimated_total_minutes: number
  completed_count: number
  completed_module_ids: string[]
  assigned_student_count: number
  started_student_count: number
  completed_student_count: number
  completion_rate: number
  latest_submissions: StudyPackSubmissionData[]
  modules: {
    id: string
    study_pack_id: string
    type: 'vocabulary' | 'sentence' | 'listening' | 'reading' | 'speaking'
    content: Record<string, unknown>
    order: number
    estimated_minutes?: number
  }[]
}

export interface SubmitAnswerData {
  study_pack_id: string
  module_id: string
  answers: Record<string, unknown>
}

export interface StudyPackSubmissionResultItem {
  index: number
  prompt: string
  student_answer: string
  expected_answer: string
  is_correct: boolean | null
  image_url?: string
  image_caption?: string
  audio_url?: string
  duration?: number
}

export interface StudyPackSubmissionResult {
  overall_status: 'graded' | 'submitted'
  correct_count: number
  total_count: number
  score: number | null
  items: StudyPackSubmissionResultItem[]
}

export interface StudyPackSubmissionData {
  id: string
  study_pack_id: string
  student_id: string
  module_id?: string
  answers: Record<string, unknown>
  score: number | null
  status: string
  submitted_at: string
  result?: StudyPackSubmissionResult | null
}

export interface StudyPackAnalyticsModuleStat {
  module_id: string
  module_type: PracticeModuleData['type']
  module_title: string
  submitted_count: number
  avg_score: number | null
  correct_count: number
  total_count: number
  metric_mode: 'correctness' | 'completion' | 'response'
  primary_label: string
  primary_rate: number
  completion_rate: number
  response_rate: number
  correct_rate: number
  sample_answers: {
    student_id: string
    student_name: string
    answer: string
  }[]
}

export interface StudyPackAnalyticsStudentRecord {
  student_id: string
  student_name: string
  completed_modules: number
  total_modules: number
  avg_score: number | null
  latest_submitted_at: string | null
  module_results: {
    module_id: string
    module_type: PracticeModuleData['type']
    module_title: string
    status: string
    score: number | null
    submitted_at: string | null
    result?: StudyPackSubmissionResult | null
  }[]
}

export interface StudyPackAnalytics {
  pack_id: string
  summary: {
    assigned_student_count: number
    started_student_count: number
    completed_student_count: number
    completion_rate: number
    module_count: number
    summary_label: string
    summary_rate: number
  }
  module_stats: StudyPackAnalyticsModuleStat[]
  student_records: StudyPackAnalyticsStudentRecord[]
}

export interface TeacherDashboardData {
  classes: {
    id: string
    name: string
    student_count: number
    level: string
  }[]
  selected_class: {
    id: string
    name: string
    level: string
    student_count: number
    schedule: string
  } | null
  stats: {
    online_count: number
    total_students: number
    pending_tasks: number
    unpublished_packs: number
    focus_students: number
  }
  activities: {
    type: string
    message: string
    dot_color: string
  }[]
}

export const imageService = {
  upload: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.url
  },
}

export const audioService = {
  upload: async (file: Blob): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file, `recording_${Date.now()}.webm`)

    const response = await api.post('/audio/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.url
  },
}

export const experimentService = {
  upload: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/experiments/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.url
  },
}

export interface MediaUploadResult {
  url: string
  filename: string
  size: number
  media_type: 'audio' | 'video'
}

export const mediaService = {
  upload: async (file: File): Promise<MediaUploadResult> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

export const reportService = {
  // Student reports
  getStudentSummary: async () => {
    const response = await api.get('/reports/student/summary')
    return response.data
  },

  getStudentWeakPoints: async () => {
    const response = await api.get('/reports/student/weak-points')
    return response.data
  },

  // Teacher reports
  getTeacherDashboard: async (): Promise<TeacherDashboardData> => {
    const response = await api.get('/reports/teacher/dashboard')
    return response.data
  },

  getClassSummary: async (classId: string) => {
    const response = await api.get(`/reports/teacher/class/${classId}/summary`)
    return response.data
  },

  getClassStudents: async (classId: string) => {
    const response = await api.get(`/reports/teacher/class/${classId}/students`)
    return response.data
  },

  getLiveSessionResults: async (sessionId: string) => {
    const response = await api.get(`/reports/teacher/live-session/${sessionId}/results`)
    return response.data
  },
}

export const freePracticeService = {
  getCategories: async () => {
    const response = await api.get('/free-practice/categories')
    return response.data
  },

  getCategory: async (categoryId: string) => {
    const response = await api.get(`/free-practice/categories/${categoryId}`)
    return response.data
  },

  submitAnswer: async (categoryId: string, exerciseId: string, answer: string) => {
    const response = await api.post('/free-practice/submit', null, {
      params: { category_id: categoryId, exercise_id: exerciseId, answer },
    })
    return response.data
  },
}

// ============ Live Task Group Service ============

export interface LiveTaskGroup {
  id: string
  class_id: string
  title: string
  status: 'draft' | 'ready' | 'archived'
  tasks: LiveTaskData[]
  new_tasks?: LiveTaskData[]
  task_count?: number
  created_at: string
  updated_at?: string
}

export interface LiveTaskData {
  id: string
  type: string
  question: Record<string, unknown>
  countdown_seconds: number
  order: number
  correct_answer?: unknown
}

export type LiveChallengeMode = 'single_question_duel' | 'duel' | 'class_challenge'

export interface LiveChallengeParticipant {
  student_id: string
  student_name: string
}

export interface LiveChallengeScoreEntry {
  student_id: string
  student_name: string
  answered_count: number
  correct_count: number
  total_tasks: number
  current_index: number
  total_time_ms: number | null
  submitted: boolean
  locked?: boolean
  eliminated_for_round?: boolean
  first_correct_at?: string | null
  current_task_id?: string | null
  rank: number | null
}

export interface LiveChallengeData {
  id: string
  class_id: string
  task_group_id: string
  mode: LiveChallengeMode
  title: string
  participant_ids: string[]
  participants: LiveChallengeParticipant[]
  scoreboard: LiveChallengeScoreEntry[]
  status: 'draft' | 'active' | 'ended' | 'cancelled'
  started_at?: string | null
  ended_at?: string | null
  tasks: LiveTaskData[]
  total_countdown: number
  current_round?: number
  current_task_id?: string | null
  round_status?: string
  winner_student_id?: string | null
  lead_student_id?: string | null
}

export interface CreateLiveChallengeData {
  class_id: string
  task_group_id: string
  title?: string
  mode: LiveChallengeMode
  participant_ids?: string[]
  task_id?: string
}

export interface CreateTaskGroupData {
  class_id: string
  title: string
}

export interface CreateTaskData {
  type: string
  question: Record<string, unknown>
  countdown_seconds?: number
  correct_answer?: unknown
}

export interface AiImportTaskGroupData {
  class_id: string
  title: string
  raw_text: string
  target_group_id?: string
  task_mode?: 'objective' | 'reading'
  randomize_answer_position?: boolean
}

export interface AiGenerateTaskGroupData {
  class_id: string
  title: string
  prompt: string
  target_group_id?: string
  task_mode?: 'objective' | 'reading'
  question_count?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  types?: string[]
  include_explanations?: boolean
  randomize_answer_position?: boolean
}

export const liveTaskService = {
  // Task Groups
  getTaskGroups: async (classId: string): Promise<LiveTaskGroup[]> => {
    const response = await api.get('/live/task-groups', { params: { class_id: classId } })
    return response.data
  },

  getTaskGroup: async (groupId: string): Promise<LiveTaskGroup> => {
    const response = await api.get(`/live/task-groups/${groupId}`)
    return response.data
  },

  createTaskGroup: async (data: CreateTaskGroupData): Promise<LiveTaskGroup> => {
    const response = await api.post('/live/task-groups', data)
    return response.data
  },

  updateTaskGroup: async (groupId: string, data: { title?: string; status?: string }): Promise<LiveTaskGroup> => {
    const response = await api.put(`/live/task-groups/${groupId}`, data)
    return response.data
  },

  deleteTaskGroup: async (groupId: string): Promise<void> => {
    await api.delete(`/live/task-groups/${groupId}`)
  },

  // Tasks
  createTask: async (groupId: string, data: CreateTaskData): Promise<LiveTaskData> => {
    const response = await api.post(`/live/task-groups/${groupId}/tasks`, data)
    return response.data
  },

  aiImportTaskGroup: async (data: AiImportTaskGroupData): Promise<LiveTaskGroup> => {
    const response = await api.post('/live/task-groups/ai-import', data)
    return response.data
  },

  aiImportTaskGroupDocx: async (
      file: File,
      data: {
        class_id: string
        title: string
        target_group_id?: string
        task_mode?: 'objective' | 'reading'
        randomize_answer_position?: boolean
      }
    ): Promise<LiveTaskGroup> => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('class_id', data.class_id)
      formData.append('title', data.title)
      if (data.target_group_id) formData.append('target_group_id', data.target_group_id)
      if (data.task_mode) formData.append('task_mode', data.task_mode)
      formData.append('randomize_answer_position', String(Boolean(data.randomize_answer_position)))

    const response = await api.post('/live/task-groups/ai-import-docx', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  aiGenerateTaskGroup: async (data: AiGenerateTaskGroupData): Promise<LiveTaskGroup> => {
    const response = await api.post('/live/task-groups/ai-generate', data)
    return response.data
  },

  updateTask: async (groupId: string, taskId: string, data: Partial<CreateTaskData> & { order?: number }): Promise<LiveTaskData> => {
    const response = await api.put(`/live/task-groups/${groupId}/tasks/${taskId}`, data)
    return response.data
  },

  deleteTask: async (groupId: string, taskId: string): Promise<void> => {
    await api.delete(`/live/task-groups/${groupId}/tasks/${taskId}`)
  },

  reorderTasks: async (groupId: string, taskIds: string[]): Promise<void> => {
    await api.post(`/live/task-groups/${groupId}/tasks/reorder`, { task_ids: taskIds })
  },

  getClassPresence: async (classId: string) => {
    const response = await api.get(`/live/classes/${classId}/presence`)
    return response.data
  },

  getTaskGroupSubmissions: async (groupId: string, sessionId?: string | null) => {
    const response = await api.get(`/live/task-groups/${groupId}/submissions`, {
      params: sessionId ? { session_id: sessionId } : undefined,
    })
    return response.data
  },

  getTaskGroupAnalytics: async (groupId: string, sessionId?: string | null) => {
    const response = await api.get(`/live/task-groups/${groupId}/analytics`, {
      params: sessionId ? { session_id: sessionId } : undefined,
    })
    return response.data
  },

  getClassTaskHistory: async (classId: string) => {
    const response = await api.get(`/live/classes/${classId}/task-history`)
    return response.data
  },

  createChallenge: async (data: CreateLiveChallengeData): Promise<LiveChallengeData> => {
    const response = await api.post('/live/challenges', data)
    return response.data
  },

  getClassChallenges: async (classId: string): Promise<LiveChallengeData[]> => {
    const response = await api.get(`/live/classes/${classId}/challenges`)
    return response.data
  },

  // Task Group Sharing
  shareTaskGroup: async (groupId: string, data: { share_name: string; share_description?: string; expires_days?: number | null }) => {
    const response = await api.post(`/live/task-groups/${groupId}/share`, data)
    return response.data
  },

  getSharedTaskGroup: async (shareToken: string) => {
    const response = await api.get(`/live/task-groups/share/${shareToken}`)
    return response.data
  },

  importSharedTaskGroup: async (data: { share_token: string; class_id: string; title?: string }) => {
    const response = await api.post('/live/task-groups/import-shared', data)
    return response.data
  },

  getTaskGroupShares: async (groupId: string) => {
    const response = await api.get(`/live/task-groups/${groupId}/shares`)
    return response.data
  },

  deleteTaskGroupShare: async (shareId: string) => {
    const response = await api.delete(`/live/task-groups/shares/${shareId}`)
    return response.data
  },
}
