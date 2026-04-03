import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n/useTranslation'
import { api } from '../../services/api'

export default function AdminLayout() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [checking, setChecking] = useState(true)

  const navItems = [
    { path: '/admin', label: t('adminUi.layout.dashboard'), icon: '📊' },
    { path: '/admin/users', label: t('adminUi.layout.users'), icon: '👥' },
    { path: '/admin/messages', label: t('adminUi.layout.messages'), icon: '📝' },
    { path: '/admin/activities', label: t('adminUi.layout.activities'), icon: '📑' },
    { path: '/admin/membership', label: t('adminUi.layout.membership'), icon: '👑' },
  ]

  useEffect(() => {
    api.get('/auth/me').then((res) => {
      if (res.data.role !== 'admin') {
        navigate('/admin/login')
      } else {
        setChecking(false)
      }
    }).catch(() => {
      navigate('/admin/login')
    })
  }, [navigate])

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">{t('adminUi.layout.verifying')}</div>
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white">{t('adminUi.layout.title')}</h1>
          <p className="text-slate-400 text-sm">{t('adminUi.layout.subtitle')}</p>
        </div>
        <nav className="flex-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={() => {
              localStorage.removeItem('token')
              navigate('/admin/login')
            }}
            className="w-full px-4 py-2 text-slate-400 hover:text-white text-sm"
          >
            {t('adminUi.layout.logout')}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
