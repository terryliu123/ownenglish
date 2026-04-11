import { useState, useEffect, useCallback, useRef } from 'react'
import type { Canvas, IText } from 'fabric'
import type { WhiteboardTheme } from '../types'

interface TextFormatBarProps {
  selectedText: IText | null
  canvas: Canvas | null
  theme: WhiteboardTheme
  onFormatChange?: () => void
}

const fontSizes = [12, 16, 20, 24, 32, 40, 48, 64]
const colors = [
  '#6366f1', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f8fafc', '#1e293b',
]

export function TextFormatBar({ selectedText, canvas, theme, onFormatChange }: TextFormatBarProps) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const updatePos = useCallback(() => {
    if (!selectedText || !canvas) return
    const rect = selectedText.getBoundingRect()
    if (!rect || isNaN(rect.left) || isNaN(rect.top)) return
    const left = rect.left + rect.width / 2
    const top = rect.top + rect.height + 8
    setPos({ left, top })
  }, [selectedText, canvas])

  useEffect(() => { updatePos() }, [updatePos])
  useEffect(() => {
    if (!canvas || !selectedText) return
    const handler = () => updatePos()
    canvas.on('object:moving', handler)
    canvas.on('object:modified', handler)
    canvas.on('object:scaling', handler)
    return () => { canvas.off('object:moving', handler); canvas.off('object:modified', handler); canvas.off('object:scaling', handler) }
  }, [canvas, selectedText, updatePos])

  if (!selectedText || !canvas || !pos) return null

  const isBold = selectedText.fontWeight === 'bold'
  const isItalic = selectedText.fontStyle === 'italic'
  const isUnderline = !!selectedText.underline
  const currentSize = selectedText.fontSize || 20
  const currentColor = (selectedText.fill as string) || '#f8fafc'

  const apply = (fn: () => void) => {
    fn()
    canvas.renderAll()
    onFormatChange?.()
    setTimeout(() => {
      const saveEvent = new CustomEvent('whiteboard:save')
      window.dispatchEvent(saveEvent)
    }, 100)
  }

  const bg = theme === 'dark' ? 'bg-[#1a1a22]/95 border-slate-700' : theme === 'light' ? 'bg-white/95 border-slate-200' : 'bg-purple-100/95 border-purple-200'
  const btnBase = `w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all`
  const btnActive = 'bg-indigo-500 text-white'
  const btnInactive = theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-200'

  return (
    <div
      ref={barRef}
      className={`absolute z-30 flex items-center gap-1 rounded-xl border px-2 py-1.5 shadow-2xl backdrop-blur-xl ${bg}`}
      style={{ left: pos.left, top: pos.top, transform: 'translate(-50%, 0)' }}
    >
      {/* 字号 */}
      <select
        value={currentSize}
        onChange={(e) => apply(() => selectedText.set('fontSize', Number(e.target.value)))}
        className={`h-7 rounded-md border-none px-1 text-xs outline-none ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-800'}`}
      >
        {fontSizes.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <div className={`mx-1 h-5 w-px ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`} />

      {/* 颜色 */}
      <div className="flex items-center gap-0.5">
        {colors.map(c => (
          <button
            key={c}
            onClick={() => apply(() => selectedText.set('fill', c))}
            className={`w-5 h-5 rounded-full border-2 transition-all ${currentColor === c ? 'border-indigo-400 scale-110' : 'border-transparent hover:scale-105'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className={`mx-1 h-5 w-px ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`} />

      {/* B / I / U */}
      <button onClick={() => apply(() => selectedText.set('fontWeight', isBold ? 'normal' : 'bold'))} className={`${btnBase} ${isBold ? btnActive : btnInactive}`} title="加粗">B</button>
      <button onClick={() => apply(() => selectedText.set('fontStyle', isItalic ? 'normal' : 'italic'))} className={`${btnBase} italic ${isItalic ? btnActive : btnInactive}`} title="斜体">I</button>
      <button onClick={() => apply(() => selectedText.set('underline', !isUnderline))} className={`${btnBase} underline ${isUnderline ? btnActive : btnInactive}`} title="下划线">U</button>
    </div>
  )
}
