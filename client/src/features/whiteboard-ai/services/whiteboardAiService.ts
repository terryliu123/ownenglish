import { api } from '../../../services/api'

export interface WhiteboardAiRequest {
  action: 'reference' | 'generate_image' | 'free_question'
  question?: string
  context: {
    whiteboard_text?: string
    task_title?: string
    task_questions?: string[]
    class_id?: string
    session_id?: string
  }
  image_base64?: string
}

export interface WhiteboardAiResponse {
  type: 'structured' | 'text' | 'image' | 'image_pending'
  content: string
  parsed?: Record<string, unknown>
}

export const whiteboardAiService = {
  async respond(request: WhiteboardAiRequest): Promise<WhiteboardAiResponse> {
    const response = await api.post('/whiteboard-ai/respond', request)
    return response.data
  }
}
