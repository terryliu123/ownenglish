import { useState, useRef, useCallback } from 'react'

interface ScreenshotSelectorProps {
  onCapture: (imageData: string) => void
  onCancel: () => void
}

export default function ScreenshotSelector({ onCapture, onCancel }: ScreenshotSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsSelecting(true)
    setStartPos({ x: e.clientX, y: e.clientY })
    setCurrentPos({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isSelecting) {
      setCurrentPos({ x: e.clientX, y: e.clientY })
    }
  }, [isSelecting])

  const handleMouseUp = useCallback(() => {
    if (isSelecting && startPos && currentPos) {
      const x = Math.min(startPos.x, currentPos.x)
      const y = Math.min(startPos.y, currentPos.y)
      const width = Math.abs(currentPos.x - startPos.x)
      const height = Math.abs(currentPos.y - startPos.y)

      if (width > 10 && height > 10) {
        // 截图
        captureScreenshot(x, y, width, height)
      }
    }
    setIsSelecting(false)
    setStartPos(null)
    setCurrentPos(null)
  }, [isSelecting, startPos, currentPos])

  const captureScreenshot = async (_x: number, _y: number, width: number, height: number) => {
    try {
      // 创建临时 canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      // 等待截图区域渲染完成后再截取
      await new Promise(resolve => setTimeout(resolve, 100))

      // 简化：使用白板容器的截图
      const whiteboardEl = document.querySelector('.whiteboard-canvas-container') as HTMLCanvasElement | HTMLElement | null
      if (whiteboardEl) {
        const rect = whiteboardEl.getBoundingClientRect()
        const wbCanvas = document.createElement('canvas')
        wbCanvas.width = rect.width
        wbCanvas.height = rect.height
        const wbCtx = wbCanvas.getContext('2d')
        if (wbCtx && 'drawImage' in wbCtx) {
          // 尝试从元素绘制
          if (whiteboardEl instanceof HTMLCanvasElement) {
            wbCtx.drawImage(whiteboardEl, 0, 0)
          } else {
            // 对于非 canvas 元素，使用 html2canvas 或跳过
            console.warn('Cannot capture non-canvas element')
          }
          const dataUrl = wbCanvas.toDataURL('image/png')
          const base64 = dataUrl.split(',')[1]
          onCapture(base64)
          return
        }
      }

      // 回退：通知用户
      alert('请确保白板区域可以截取')
    } catch (error) {
      console.error('Screenshot error:', error)
    }
  }

  const selectionStyle = startPos && currentPos ? {
    left: Math.min(startPos.x, currentPos.x),
    top: Math.min(startPos.y, currentPos.y),
    width: Math.abs(currentPos.x - startPos.x),
    height: Math.abs(currentPos.y - startPos.y),
  } : null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[99999] bg-black/30 cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {selectionStyle && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
          style={selectionStyle}
        />
      )}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg">
        <p className="text-sm text-slate-600">在白板区域拖动选择截图范围</p>
      </div>
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 px-4 py-2 bg-white rounded-lg shadow-lg text-sm"
      >
        取消
      </button>
    </div>
  )
}
