import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from '../../i18n/useTranslation'
import { StudentAiProvider } from '../../features/student-ai/context/StudentAiContext'
import StudentAiLauncher from '../../features/student-ai/components/StudentAiLauncher'
import StudentAiPanel from '../../features/student-ai/components/StudentAiPanel'

interface StudentLayoutProps {
  children: React.ReactNode
  device?: 'phone' | 'tablet'
}

export default function StudentLayout({ children, device = 'phone' }: StudentLayoutProps) {
  const location = useLocation()
  const { t } = useTranslation()

  const navItems = [
    { id: 'home', label: t('nav.home'), path: '/student' },
    { id: 'live', label: t('nav.live'), path: '/student/live' },
    { id: 'report', label: t('nav.report'), path: '/student/report' },
    { id: 'free', label: t('nav.free'), path: '/student/free' },
  ]

  const getActivePage = () => {
    const path = location.pathname
    if (path === '/student') return 'home'
    if (path.includes('/live')) return 'live'
    if (path.includes('/report')) return 'report'
    if (path.includes('/free')) return 'free'
    return 'home'
  }

  const activePage = getActivePage()

  return (
    <StudentAiProvider>
      <div className="min-h-screen">
        <div className="page-shell">
          {/* Topbar */}
          <header className="app-topbar">
            <div className="brand-lockup">
              <img src="/logo.png" alt="胖鼠互动课堂系统" style={{ width: 36, height: 36, borderRadius: 8 }} />
              <div>
                <p className="eyebrow">Student Experience</p>
                <h1 className="text-sm font-semibold" style={{ fontFamily: 'Noto Sans SC, sans-serif' }}>{t('student.layout.title')}</h1>
              </div>
            </div>
            <nav className="app-top-actions">
              <Link to="/teacher" className="ghost-button text-sm py-2 px-4">
                {t('student.layout.viewTeacher')}
              </Link>
            </nav>
          </header>

          {/* Student Toolbar */}
          <section className="student-toolbar">
            <div className="device-switcher">
              <Link
                to="/student"
                className={`device-toggle ${device === 'phone' ? 'is-active' : ''}`}
              >
                {t('device.mobile')}
              </Link>
              <Link
                to="/student?device=tablet"
                className={`device-toggle ${device === 'tablet' ? 'is-active' : ''}`}
              >
                {t('device.tablet')}
              </Link>
            </div>
            <div className="screen-shortcuts">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`shortcut-pill ${activePage === item.id ? 'is-active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </section>

          {/* Student Stage with Device Frame */}
          <main className="student-stage">
            <div className={`device-frame ${device === 'tablet' ? 'tablet' : ''}`}>
              <div className="device-camera"></div>
              <div className="student-app">
                {/* App Header */}
                <div className="student-app-top">
                  <div>
                    <strong>{t('student.demoTeacher')}</strong>
                    <span className="small-status">{t('student.demoTaskInfo')}</span>
                  </div>
                  <span className="card-tag">{t('student.demoStreak')}</span>
                </div>

                {/* Screen Content */}
                <div className="student-screens">
                  <section className="student-screen is-active">
                    {children}
                  </section>
                </div>

                {/* Bottom Nav */}
                <nav className="student-nav">
                  {navItems.map((item) => (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`student-nav-item ${activePage === item.id ? 'is-active' : ''}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </main>
        </div>

        {/* AI 助手悬浮球和面板 */}
        <StudentAiLauncher />
        <StudentAiPanel />
      </div>
    </StudentAiProvider>
  )
}
