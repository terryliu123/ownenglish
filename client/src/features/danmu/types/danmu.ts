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
  bgColor?: string  // 弹幕背景颜色
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

// Danmu configuration state
export interface DanmuConfig {
  enabled: boolean
  showStudent: boolean
  showSource: boolean
  speed: 'slow' | 'medium' | 'fast'
  density: 'low' | 'medium' | 'high'
  area: 'full' | 'bottom' | 'middle'
  bgColor?: string  // 弹幕背景颜色，如 'rgba(0,0,0,0.75)' 或 'rgba(255,100,100,0.6)'
}

// Active danmu item on screen
export interface ActiveDanmu {
  id: string
  content: string
  row: number
  showSource: boolean
  sourceName?: string
  speed: 'slow' | 'medium' | 'fast'
  elementId?: string
  bgColor?: string  // 弹幕背景颜色
}

// Atmosphere effect types
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
