// Danmu WebSocket message types

export interface DanmuSendMessage {
  type: 'danmu_send'
  content: string
}

export interface DanmuConfigMessage {
  type: 'danmu_config'
  enabled: boolean
  showStudent: boolean
  showSource: boolean
  speed: 'slow' | 'medium' | 'fast'
  density: 'low' | 'medium' | 'high'
  area?: 'full' | 'bottom' | 'middle'
  presetPhrases?: string[]
}

export interface DanmuTriggerMessage {
  type: 'danmu_trigger'
  content: string
}

export interface DanmuDisplayMessage {
  type: 'danmu_display'
  content: string
  row: number
  showSource: boolean
  sourceName?: string
  speed: 'slow' | 'medium' | 'fast'
  density: 'low' | 'medium' | 'high'
  area?: 'full' | 'bottom' | 'middle'
  bgColor?: string
}

export interface DanmuClearMessage {
  type: 'danmu_clear'
}

export interface DanmuConfigAckMessage {
  type: 'danmu_config_ack'
  enabled: boolean
}

export interface DanmuTriggerAckMessage {
  type: 'danmu_trigger_ack'
  content: string
}

export interface DanmuClearAckMessage {
  type: 'danmu_clear_ack'
}

export interface DanmuErrorMessage {
  type: 'error'
  message: string
}

export type DanmuIncomingMessage =
  | DanmuConfigMessage
  | DanmuDisplayMessage
  | DanmuClearMessage
  | DanmuErrorMessage

export interface DanmuConfig {
  enabled: boolean
  showStudent: boolean
  showSource: boolean
  speed: 'slow' | 'medium' | 'fast'
  density: 'low' | 'medium' | 'high'
  area: 'full' | 'bottom' | 'middle'
  bgColor?: string
  presetPhrases?: string[]
}

export interface ActiveDanmu {
  id: string
  content: string
  row: number
  showSource: boolean
  sourceName?: string
  speed: 'slow' | 'medium' | 'fast'
  elementId?: string
  bgColor?: string
}

export type AtmosphereEffectType = 'cheer' | 'fireworks' | 'stars' | 'hearts' | 'flame'

export interface AtmosphereEffectMessage {
  type: 'atmosphere_effect'
  effect: AtmosphereEffectType
  sourceName?: string
}

export interface ActiveAtmosphereEffect {
  id: string
  effect: AtmosphereEffectType
  sourceName?: string
}
