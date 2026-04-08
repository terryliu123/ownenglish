import { api } from '../../../services/api'

export interface StudentAiRequest {
  action: 'photo_qa' | 'free_question'
  question?: string
  context: {
    class_id?: string
    session_id?: string
  }
  image_base64?: string
}

export interface StudentAiResponse {
  type: 'structured' | 'text'
  content: string
  parsed?: Record<string, unknown>
}

export const studentAiService = {
  async respond(request: StudentAiRequest): Promise<StudentAiResponse> {
    const response = await api.post('/student-ai/respond', request)
    return response.data
  }
}
