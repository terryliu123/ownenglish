import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { notificationService, type Notification } from '../services/api'
import { useTranslation } from '../i18n/useTranslation'
import { TeacherSidebar } from '../components/layout/Layout'
import TeacherLeftSidebar from '../components/layout/TeacherLeftSidebar'
import { useAppStore } from '../stores/app-store'

function formatTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN')
}

function getIcon(type: string) {
  switch (type) {
    case 'study_pack_assigned': case 'study_pack_due': return '📎'
    case 'live_session_started': return '🔶'
    case 'submission_graded': return '✅'
    case 'class_announcement': return '📝'
    case 'new_student_joined': return '👢'
    case 'share_imported': return '📥'
    default: return '🔔'
  }
}

export default function Notifications() {
  const { t } = useTranslation()
  const user = useAppStore((s) => s.user)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      setLoading(true)
      const data = await notificationService.getNotifications({ limit: 100 })
      setNotifications(data.items)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await notificationService.markAsRead([id])
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    try {
      await notificationService.deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch { /* ignore */ }
  }

  async function handleMarkAllRead() {
    try {
      await notificationService.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch { /* ignore */ }
  }

  const sidebar = user?.role === 'teacher' ? <TeacherSidebar activePage="" /> : undefined

  return (
    <Layout sidebar={sidebar} leftSidebar={user?.role === 'teacher' ? <TeacherLeftSidebar activePage="" /> : undefined}>
      <div className="panel-page max-w-3xl mx-auto">
        <section className="surface-card">
          <div className="surface-head flex items-center justify-between">
            <div>
              <h3>{t('notifications.title')}</h3>
              <span>{notifications.filter((n) => !n.is_read).length} 条未读</span>
            </div>
            {notifications.some((n) => !n.is_read) && (
              <button onClick={handleMarkAllRead} className="ghost-button text-sm">
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p>{t('notifications.empty')}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-purple-50/30' : ''}`}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{getIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!n.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                      {n.title}
                    </p>
                    {n.content && (
                      <p className="text-sm text-slate-500 mt-0.5">{n.content}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{formatTime(n.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title={t('notifications.markAsRead')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('common.delete')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <Link to={user?.role === 'teacher' ? '/teacher' : '/student'} className="text-sm text-slate-500 hover:text-slate-700 font-medium">
              ← {t('common.back')}
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  )
}
