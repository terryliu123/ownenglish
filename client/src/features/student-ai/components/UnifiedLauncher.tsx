import { useState, useEffect } from 'react'
import { useStudentAiContext } from '../context/StudentAiContext'

export default function UnifiedLauncher() {
  const { isOpen, isLoading, setOpen, settings, aiContext, loadSettings } = useStudentAiContext()
  const [showMenu, setShowMenu] = useState(false)

  // 监听自定义事件打开分享弹窗
  useEffect(() => {
    const handleOpenShare = () => {
      window.dispatchEvent(new CustomEvent('open-share-modal'))
    }
    window.addEventListener('open-share-modal', handleOpenShare)
    return () => window.removeEventListener('open-share-modal', handleOpenShare)
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isOpen) {
      // 如果 AI 面板已打开，关闭它
      setOpen(false)
    } else {
      // 如果未打开，显示菜单，并刷新设置
      if (aiContext.class_id) {
        loadSettings(aiContext.class_id)
      }
      setShowMenu(!showMenu)
    }
  }

  const handleAiClick = () => {
    setShowMenu(false)
    setOpen(true)
  }

  const handleShareClick = () => {
    setShowMenu(false)
    window.dispatchEvent(new CustomEvent('open-share-modal'))
  }

  const aiEnabled = settings?.enabled ?? false

  return (
    <div
      className="fixed z-50"
      style={{ right: '24px', bottom: '96px' }}
    >
      {/* 菜单 */}
      {showMenu && (
        <div
          className="absolute bottom-16 right-0 w-40 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mb-2"
          style={{ animation: 'slideIn 0.2s ease-out' }}
        >
          {aiEnabled ? (
            <button
              onClick={handleAiClick}
              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs">🤖</span>
              <span>AI 助手</span>
            </button>
          ) : (
            <div
              className="w-full px-4 py-3 text-left text-sm text-gray-400 flex items-center gap-3 cursor-not-allowed"
              title="教师未开启 AI 助手功能"
            >
              <span className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">🤖</span>
              <span>AI 助手</span>
            </div>
          )}
          <button
            onClick={handleShareClick}
            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-slate-50 flex items-center gap-3 transition-colors border-t border-slate-100"
          >
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white text-xs">📤</span>
            <span>分享</span>
          </button>
        </div>
      )}

      {/* 主按钮 */}
      <button
        onClick={handleClick}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 ${
          isOpen ? 'bg-slate-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
        }`}
        style={{
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          cursor: 'pointer',
        }}
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : showMenu ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <img src="/logo.png" alt="菜单" className="w-8 h-8 rounded-lg" />
        )}
      </button>
    </div>
  )
}
