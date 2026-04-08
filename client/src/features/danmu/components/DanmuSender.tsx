import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from '../../../i18n/useTranslation'
import { checkLocalBlock } from '../danmuFilter'

interface DanmuSenderProps {
  onSend: (content: string) => void
  disabled?: boolean
  maxLength?: number
  rateLimitSeconds?: number
}

// Preset danmu phrases
const PRESET_PHRASES = [
  '太棒了！',
  '加油！',
  '答对了！',
  '真厉害！',
  '准备好了！',
  '注意听讲！',
  '来看下一题！',
  '全对！',
  '继续保持！',
  '太优秀了！',
]

export function DanmuSender({ onSend, disabled = false, maxLength = 50, rateLimitSeconds = 10 }: DanmuSenderProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    }
  }, [cooldown > 0])

  // Handle send
  const handleSend = useCallback(() => {
    if (!content.trim() || sending || disabled || cooldown > 0) return

    // 本地违禁词检测
    const localCheck = checkLocalBlock(content.trim())
    if (localCheck.blocked) {
      setError(t('danmu.blockedWord'))
      return
    }

    setError('')
    setSending(true)
    try {
      onSend(content.trim())
      setContent('')
      setIsOpen(false)
      // 开始冷却
      setCooldown(rateLimitSeconds)
    } finally {
      setSending(false)
    }
  }, [content, sending, disabled, cooldown, onSend, t, rateLimitSeconds])

  // Handle preset click
  const handlePresetClick = useCallback((phrase: string) => {
    setContent(phrase)
    inputRef.current?.focus()
  }, [])

  // Handle key down (Ctrl+Enter to send)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-3 text-white shadow-lg hover:from-pink-400 hover:to-rose-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
        style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
      >
        <span className="text-lg">🎆</span>
        <span className="font-medium">{t('danmu.send')}</span>
        {cooldown > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-white/30 rounded-full text-xs">
            {cooldown}s
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[1400] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg sm:p-6 p-5 pb-6 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center">
            <span className="text-xl">🎆</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800">{t('danmu.send')}</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Preset phrases */}
        <div className="mb-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">{t('danmu.presets')}</div>
          <div className="flex flex-wrap gap-2">
            {PRESET_PHRASES.map((phrase) => (
              <button
                key={phrase}
                onClick={() => handlePresetClick(phrase)}
                className="px-3 py-1.5 rounded-full bg-pink-50 border border-pink-200 text-pink-600 text-sm hover:bg-pink-100 transition-colors"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <textarea
          ref={inputRef}
          value={content}
          onChange={e => {
            setContent(e.target.value.slice(0, maxLength))
            setError('')
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('danmu.placeholder')}
          className="w-full border-2 border-gray-200 focus:border-pink-400 rounded-2xl p-4 text-base resize-none focus:outline-none transition-colors"
          rows={3}
          autoFocus
        />

        {/* Character count & cooldown */}
        <div className="flex items-center justify-between mt-1 mb-4">
          <span className={`text-xs ${content.length >= maxLength * 0.9 ? 'text-orange-500' : 'text-gray-400'}`}>
            {content.length}/{maxLength}
          </span>
          {cooldown > 0 && (
            <span className="text-xs text-orange-500">
              {t('danmu.waitCooldown', { seconds: cooldown })}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setIsOpen(false)}
            className="flex-1 ghost-button py-3"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSend}
            disabled={!content.trim() || sending || disabled || cooldown > 0}
            className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-3 text-white font-medium hover:from-pink-400 hover:to-rose-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {sending ? '...' : cooldown > 0 ? `${cooldown}s` : t('danmu.sendButton')}
          </button>
        </div>
      </div>
    </div>
  )
}
