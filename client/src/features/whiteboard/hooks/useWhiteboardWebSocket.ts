import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '../../../stores/app-store'
import type { DrawEvent } from '../types'

interface WebSocketMessage {
  type: 'draw' | 'erase' | 'add' | 'delete' | 'clear' | 'sync' | 'presence'
  data: any
  timestamp: number
  userId: string
}

export function useWhiteboardWebSocket(classId: string | null) {
  const { user } = useAppStore()
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(() => {
    if (!classId || !user) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // Use Vite dev server proxy in development (port 5173)
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/api/v1/live/ws?token=${localStorage.getItem('token')}&class_id=${classId}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setError(null)
      console.log('[Whiteboard] WebSocket connected')
    }

    ws.onclose = () => {
      setIsConnected(false)
      console.log('[Whiteboard] WebSocket disconnected')
    }

    ws.onerror = (e) => {
      setError('WebSocket error')
      console.error('[Whiteboard] WebSocket error:', e)
    }

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        handleMessage(message)
      } catch (e) {
        console.error('[Whiteboard] Failed to parse message:', e)
      }
    }
  }, [classId, user])

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'draw':
      case 'erase':
      case 'add':
      case 'delete':
      case 'clear':
        // TODO: 触发事件让 Canvas 更新
        window.dispatchEvent(new CustomEvent('whiteboard-update', { detail: message }))
        break
      case 'sync':
        // TODO: 同步完整画板状态
        break
      case 'presence':
        // TODO: 更新在线学生状态
        break
    }
  }, [])

  const sendEvent = useCallback((event: DrawEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event))
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])

  return {
    isConnected,
    error,
    sendEvent,
    reconnect: connect,
  }
}
