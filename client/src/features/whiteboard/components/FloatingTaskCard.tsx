import { useState } from 'react'
import type { LiveTaskGroup } from '../../../services/api'

interface FloatingTaskCardProps {
  taskGroup: LiveTaskGroup
  onEnd: () => void
}

export function FloatingTaskCard({ taskGroup, onEnd }: FloatingTaskCardProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 }) // 百分比位置
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).closest('.floating-card')?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      setIsDragging(true)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const container = (e.target as HTMLElement).closest('.whiteboard-container')
    if (container) {
      const rect = container.getBoundingClientRect()
      setPosition({
        x: ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100,
        y: ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div
      className="floating-card absolute w-96 bg-gradient-to-br from-[#252532]/95 to-[#1a1a22]/95 border border-slate-700 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 头部 - 可拖拽区域 */}
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/30">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-medium">
            进行中
          </span>
          <span className="text-sm font-medium text-slate-200">{taskGroup.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">1/{taskGroup.tasks?.length || 1}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEnd()
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 当前题目 */}
      <div className="p-4">
        {taskGroup.tasks && taskGroup.tasks[0] && (
          <>
            <div className="mb-3">
              <span className="text-xs text-slate-500">单选题</span>
            </div>
            <p className="text-slate-200 mb-4">{(taskGroup.tasks[0].question as any)?.text || '题目加载中...'}</p>

            {/* 选项 */}
            <div className="space-y-2">
              {((taskGroup.tasks[0].question as any)?.options || [])?.map((option: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-indigo-500/30 cursor-pointer transition-colors"
                >
                  <div className="w-6 h-6 rounded-full border-2 border-slate-600 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-indigo-500 opacity-0" />
                  </div>
                  <span className="text-sm text-slate-300">{typeof option === 'string' ? option : option?.text || ''}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 统计 */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>已提交: 12/24</span>
            <span>正确率: 75%</span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
