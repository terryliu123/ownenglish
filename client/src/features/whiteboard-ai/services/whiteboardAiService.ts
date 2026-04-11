import { api } from '../../../services/api'

export type WhiteboardAiAction = 'reference' | 'generate_image' | 'free_question' | 'voice_explain'

export interface WhiteboardAiRequest {
  action: WhiteboardAiAction
  question?: string
  template_id?: string
  context: {
    whiteboard_text?: string
    task_title?: string
    task_questions?: string[]
    class_id?: string
    session_id?: string
  }
  image_base64?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface VoiceExplainPayload {
  title: string
  script: string
  estimated_seconds: number
}

export interface WhiteboardAiResponse {
  type: 'structured' | 'text' | 'image' | 'image_pending' | 'voice_explain'
  content: string
  parsed?: Record<string, unknown> | VoiceExplainPayload
}

export const whiteboardAiService = {
  async respond(request: WhiteboardAiRequest): Promise<WhiteboardAiResponse> {
    const response = await api.post('/whiteboard-ai/respond', request)
    return response.data
  }
}
