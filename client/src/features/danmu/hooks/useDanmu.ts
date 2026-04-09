import { useState, useCallback, useRef, useEffect } from 'react'
import type { DanmuConfig, ActiveDanmu, DanmuDisplayMessage } from '../types/danmu'

// Speed mapping: seconds per screen width
const SPEED_MAP = {
  slow: 12,
  medium: 8,
  fast: 5,
}

interface UseDanmuOptions {
  enabled?: boolean
  speed?: 'slow' | 'medium' | 'fast'
  density?: 'low' | 'medium' | 'high'
  area?: 'full' | 'bottom' | 'middle'
  maxItems?: number
}

export function useDanmu(options: UseDanmuOptions = {}) {
  const {
    maxItems = 20,
  } = options

  const [config, setConfig] = useState<DanmuConfig>({
    enabled: false,
    showStudent: true,
    showSource: false,
    speed: 'medium',
    density: 'medium',
    area: 'bottom',
    bgColor: 'rgba(0, 0, 0, 0.75)',
    presetPhrases: ['太棒了！', '加油！', '答对了！', '真厉害！', '准备好了！'],
  })

  const [activeDanmus, setActiveDanmus] = useState<ActiveDanmu[]>([])
  const [showDanmuModal, setShowDanmuModal] = useState(false)
  const [danmuInput, setDanmuInput] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const elementIdCounter = useRef(0)

  // Update config when options change
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      speed: options.speed ?? prev.speed,
      density: options.density ?? prev.density,
      area: options.area ?? prev.area,
      enabled: options.enabled ?? prev.enabled,
    }))
  }, [options.enabled, options.speed, options.density, options.area])

  // Remove a danmu after animation completes
  const removeDanmu = useCallback((id: string) => {
    setActiveDanmus(prev => prev.filter(d => d.id !== id))
  }, [])

  // Handle incoming danmu_display message from WebSocket
  const handleDanmuDisplay = useCallback((msg: DanmuDisplayMessage) => {
    const id = `danmu-${elementIdCounter.current++}`
    const duration = SPEED_MAP[msg.speed || 'medium'] * 1000

    const newDanmu: ActiveDanmu = {
      id,
      content: msg.content,
      row: msg.row,
      showSource: msg.showSource,
      sourceName: msg.sourceName,
      speed: msg.speed || 'medium',
      elementId: id,
      bgColor: msg.bgColor,
    }

    setActiveDanmus(prev => {
      const updated = [...prev, newDanmu]
      // Keep only maxItems
      if (updated.length > maxItems) {
        return updated.slice(-maxItems)
      }
      return updated
    })

    // Auto-remove after animation
    setTimeout(() => {
      removeDanmu(id)
    }, duration)
  }, [maxItems, removeDanmu])

  // Handle danmu_config message
  const handleDanmuConfig = useCallback((msg: DanmuConfig) => {
    setConfig(prev => ({
      ...prev,
      enabled: msg.enabled,
      showStudent: msg.showStudent,
      showSource: msg.showSource,
      speed: msg.speed,
      density: msg.density,
      area: msg.area,
      bgColor: msg.bgColor ?? prev.bgColor,
      presetPhrases: msg.presetPhrases ?? prev.presetPhrases,
    }))
  }, [])

  // Handle danmu_clear message
  const handleDanmuClear = useCallback(() => {
    setActiveDanmus([])
  }, [])

  // Send a danmu
  const sendDanmu = useCallback((content: string) => {
    setDanmuInput('')
    setShowDanmuModal(false)
    return content
  }, [])

  // Open danmu modal
  const openDanmuModal = useCallback(() => {
    setShowDanmuModal(true)
  }, [])

  // Close danmu modal
  const closeDanmuModal = useCallback(() => {
    setShowDanmuModal(false)
    setDanmuInput('')
  }, [])

  return {
    config,
    setConfig,
    activeDanmus,
    showDanmuModal,
    setShowDanmuModal,
    danmuInput,
    setDanmuInput,
    containerRef,
    handleDanmuDisplay,
    handleDanmuConfig,
    handleDanmuClear,
    sendDanmu,
    openDanmuModal,
    closeDanmuModal,
    removeDanmu,
  }
}
