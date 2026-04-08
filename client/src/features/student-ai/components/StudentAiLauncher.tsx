import { useStudentAiContext } from '../context/StudentAiContext'

export default function StudentAiLauncher() {
  const { isOpen, isLoading, setOpen } = useStudentAiContext()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(!isOpen)
  }

  return (
    <div
      className="fixed z-50"
      style={{ right: '24px', bottom: '96px' }}
    >
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
        ) : isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <img src="/logo.png" alt="AI助手" className="w-8 h-8 rounded-lg" />
        )}
      </button>
    </div>
  )
}
