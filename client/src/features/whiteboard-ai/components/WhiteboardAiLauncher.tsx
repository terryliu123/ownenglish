import { useWhiteboardAiContext } from '../context/WhiteboardAiContext'

export default function WhiteboardAiLauncher() {
  const { isOpen, isLoading, setOpen, launcherPosition } = useWhiteboardAiContext()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(!isOpen)
  }

  return (
    <div className="fixed z-50" style={{ right: `${launcherPosition.x}px`, bottom: `${launcherPosition.y}px` }}>
      <button
        onClick={handleClick}
        className={`group flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-all duration-300 hover:scale-110 ${
          isOpen
            ? 'bg-white/[0.08] border border-white/[0.1] shadow-black/30'
            : 'bg-gradient-to-br from-blue-500 to-violet-500 shadow-blue-500/25 hover:shadow-blue-500/40'
        }`}
      >
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : isOpen ? (
          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <img src="/logo.png" alt="胖鼠AI副班" className="h-7 w-7 rounded-lg" />
        )}
      </button>
    </div>
  )
}
