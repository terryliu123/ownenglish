import { useWhiteboardAiContext } from '../context/WhiteboardAiContext'
import { useAppStore } from '../../../stores/app-store'

export default function WhiteboardAiLauncher() {
  const { isOpen, isLoading, setOpen, launcherPosition } = useWhiteboardAiContext()
  const { user } = useAppStore()
  const isPaid = user?.membership?.status === 'active'

  if (!isPaid) return null

  return (
    <div className="fixed z-50" style={{ right: `${launcherPosition.x}px`, bottom: `${launcherPosition.y}px` }}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!isOpen)
        }}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 ${
          isOpen ? 'bg-slate-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
        }`}
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
      >
        {isLoading ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : isOpen ? (
          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <img src="/logo.png" alt="AI 助手" className="h-8 w-8 rounded-lg" />
        )}
      </button>
    </div>
  )
}
