import { useEffect, useRef, useState } from 'react'
import type { ActiveDanmu, DanmuConfig } from '../types/danmu'

interface DanmuScreenProps {
  activeDanmus: ActiveDanmu[]
  config: DanmuConfig
}

// Speed mapping: seconds to traverse screen width
const SPEED_DURATION = {
  slow: 14,
  medium: 9,
  fast: 6,
}

// Row height as percentage of container height
const ROW_HEIGHT_PERCENT = 25

export function DanmuScreen({ activeDanmus, config }: DanmuScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const getRowTop = (row: number) => {
    if (config.area === 'full') {
      return `${row * ROW_HEIGHT_PERCENT}%`
    }
    if (config.area === 'middle') {
      const middleStart = 25
      return `${middleStart + row * (50 / 4)}%`
    }
    // bottom: rows in bottom quarter (reversed order so row 0 is at bottom)
    const bottomStart = 75
    return `${bottomStart - (3 - row) * (ROW_HEIGHT_PERCENT)}%`
  }

  if (!config.enabled) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[1500] overflow-hidden"
    >
      {activeDanmus.map(danmu => {
        const duration = SPEED_DURATION[danmu.speed || 'medium']
        const rowTop = getRowTop(danmu.row)

        return (
          <div
            key={danmu.id}
            className="absolute whitespace-nowrap"
            style={{
              top: rowTop,
              height: `${ROW_HEIGHT_PERCENT}%`,
              display: 'flex',
              alignItems: 'center',
              animation: `danmu-scroll-${danmu.row} ${duration}s linear forwards`,
            }}
          >
            <span
              className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-full text-xl font-medium backdrop-blur-md"
              style={{
                backgroundColor: danmu.bgColor || config.bgColor || 'rgba(0, 0, 0, 0.75)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {danmu.showSource && danmu.sourceName && (
                <span className="text-pink-400 font-normal text-sm">◆ {danmu.sourceName}:</span>
              )}
              <span>{danmu.content}</span>
            </span>
          </div>
        )
      })}

      <style>{`
        @keyframes danmu-scroll-0 {
          0% { transform: translateX(100vw); opacity: 0; }
          2% { opacity: 1; }
          98% { opacity: 1; }
          100% { transform: translateX(-200px); opacity: 0; }
        }
        @keyframes danmu-scroll-1 {
          0% { transform: translateX(100vw); opacity: 0; }
          2% { opacity: 1; }
          98% { opacity: 1; }
          100% { transform: translateX(-200px); opacity: 0; }
        }
        @keyframes danmu-scroll-2 {
          0% { transform: translateX(100vw); opacity: 0; }
          2% { opacity: 1; }
          98% { opacity: 1; }
          100% { transform: translateX(-200px); opacity: 0; }
        }
        @keyframes danmu-scroll-3 {
          0% { transform: translateX(100vw); opacity: 0; }
          2% { opacity: 1; }
          98% { opacity: 1; }
          100% { transform: translateX(-200px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
