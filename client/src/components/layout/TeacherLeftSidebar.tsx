import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const STORAGE_KEY = 'teacher_sidebar_collapsed'

const navItems: { id: string; label?: string; path?: string; icon?: string; end?: boolean }[] = [
  { id: 'home', label: '首页', path: '/teacher', icon: 'H', end: true },
  { id: 'classes', label: '班级管理', path: '/teacher/classes', icon: 'C' },
  { id: 'whiteboard', label: '课堂教学', path: '/teacher/whiteboard', icon: 'W' },
  { id: 'classroom-review', label: '课堂回顾', path: '/teacher/classroom-review', icon: 'R' },
  { id: 'divider' },
  { id: 'task-groups', label: '平板任务', path: '/teacher/task-groups', icon: 'T' },
  { id: 'bigscreen-activities', label: '大屏互动', path: '/teacher/bigscreen-activities', icon: 'B' },
  { id: 'teaching-aids', label: '数字化教具', path: '/teacher/teaching-aids', icon: 'D' },
  { id: 'membership', label: '会员中心', path: '/teacher/membership', icon: 'V' },
]

export default function TeacherLeftSidebar({ activePage }: { activePage: string }) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  const isActive = (item: (typeof navItems)[number]) => {
    if (activePage && activePage === item.id) return true
    if (!item.path) return false
    if (item.end) return location.pathname === item.path
    return location.pathname.startsWith(item.path)
  }

  return (
    <nav
      className="surface-card mt-4 flex flex-shrink-0 flex-col transition-all duration-200"
      style={{
        width: collapsed ? 60 : 216,
        padding: '14px 10px',
        position: 'sticky',
        top: 20,
        minHeight: 'calc(100vh - 112px)',
        maxHeight: 'calc(100vh - 112px)',
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            if (item.id === 'divider') {
              return <div key="divider" className="mx-2 my-2 border-t border-slate-200" />
            }

            const active = isActive(item)
            return (
              <Link
                key={item.id}
                to={item.path!}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
                style={{
                  padding: '12px 10px',
                  ...(active ? { background: 'linear-gradient(135deg, var(--navy), var(--navy-soft))' } : {}),
                }}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.icon}
                </span>
                {!collapsed ? <span className="whitespace-nowrap text-sm">{item.label}</span> : null}
              </Link>
            )
          })}
        </div>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        type="button"
      >
        <svg
          className="h-3.5 w-3.5 shrink-0 transition-transform"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {!collapsed ? <span>收起</span> : null}
      </button>
    </nav>
  )
}
