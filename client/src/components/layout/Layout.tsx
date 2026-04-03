import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/app-store'
import { useTranslation } from '../../i18n/useTranslation'
import NotificationBell from '../notification/NotificationBell'

interface LayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
}

export default function Layout({ children, sidebar }: LayoutProps) {
  const { user, logout } = useAppStore()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const showMembership = user?.role === 'teacher' && !user?.is_guest
  const membershipStatus = user?.membership?.status
  const membershipBadgeLabel =
    membershipStatus === 'active'
      ? t('membership.paidBadge')
      : membershipStatus === 'trial'
      ? t('membership.trialBadge')
      : t('membership.freeBadge')

  return (
    <div className="min-h-screen">
      <div className="page-shell">
        <header className="app-topbar" style={{ position: 'relative', zIndex: 1000 }}>
          <div className="brand-lockup">
            <img src="/logo.png" alt="胖鼠互动课堂系统" style={{ width: 36, height: 36, borderRadius: 8 }} />
            <div>
              <p className="eyebrow">Interactive Classroom Platform</p>
              <h1
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  fontFamily: 'Noto Sans SC, sans-serif',
                  letterSpacing: '-0.01em',
                }}
              >
                胖鼠互动课堂系统
              </h1>
            </div>
          </div>

          <nav className="app-top-actions">
            {user ? (
              <>
                <NotificationBell />
                {showMembership ? (
                  <Link
                    to="/teacher/membership"
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                      membershipStatus === 'active' || membershipStatus === 'trial'
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 9l2.5 6h9L19 9m-2.5 6L12 19l-4.5-4M7.5 15L5 9l4 .5L12 5l3 4.5 4-.5-2.5 6" />
                    </svg>
                    <span>{membershipBadgeLabel}</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                    <span>{user.role === 'teacher' ? t('roles.teacher') : t('roles.student')}</span>
                  </span>
                )}
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: 500 }}>{user.name}</span>
                {!user.is_guest && (
                  <Link to="/settings" className="ghost-button">
                    {t('settings.changePassword')}
                  </Link>
                )}
                <button onClick={handleLogout} className="ghost-button">
                  {t('auth.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="ghost-button">
                  {t('auth.login')}
                </Link>
                <Link to="/register" className="solid-button">
                  {t('auth.register')}
                </Link>
              </>
            )}
          </nav>
        </header>

        {sidebar ? (
          <div className="relative">
            {sidebar}
            <main className="main-stage w-full">{children}</main>
          </div>
        ) : (
          <main className="mt-5">{children}</main>
        )}
      </div>
    </div>
  )
}

export function TeacherSidebar({
  activePage,
}: {
  activePage: string
  selectedClass?: { name: string; level: string; student_count: number; schedule?: string } | null
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const links = [
    { id: 'classes', label: t('nav.classes'), path: '/teacher/classes', icon: '👥' },
    { id: 'task-groups', label: t('nav.taskGroups'), path: '/teacher/task-groups', icon: '📋' },
    { id: 'live', label: t('nav.live'), path: '/teacher/live', icon: '📡' },
    { id: 'whiteboard', label: '白板模式', path: '/teacher/whiteboard', icon: '🎨' },
    { id: 'analytics', label: t('nav.analytics'), path: '/teacher/analytics', icon: '📊' },
  ]

  return (
    <>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {open && (
          <nav className="bg-white rounded-2xl shadow-xl border border-gray-100 py-2 min-w-[180px]" style={{ animation: 'slideIn 0.2s ease-out' }}>
            {links.map((link) => (
              <Link
                key={link.id}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 ${activePage === link.id ? 'text-coral' : 'text-gray-700'}`}
                onClick={() => setOpen(false)}
              >
                <span className="text-base">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white text-xl transition-all hover:scale-110 active:scale-95"
          style={{ background: 'linear-gradient(135deg, var(--navy), var(--navy-soft))' }}
        >
          {open ? '✕' : '☰'}
        </button>
      </div>
    </>
  )
}
