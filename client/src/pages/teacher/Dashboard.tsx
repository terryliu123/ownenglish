import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import TeacherLeftSidebar from '../../components/layout/TeacherLeftSidebar'
import { useTranslation } from '../../i18n/useTranslation'
import { reportService, type TeacherDashboardData } from '../../services/api'

export default function Dashboard() {
  const { t } = useTranslation()
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const data = await reportService.getTeacherDashboard()
      setDashboardData(data)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = dashboardData?.stats || {
    online_count: 0,
    total_students: 0,
    pending_tasks: 0,
    focus_students: 0,
  }

  const activities = dashboardData?.activities || [
    { type: 'no_task', message: t('dashboard.feed.noTask'), dot_color: 'green' },
    { type: 'no_submission', message: t('dashboard.feed.noSubmission'), dot_color: 'amber' },
    { type: 'weak_point', message: t('dashboard.feed.weakPoint'), dot_color: 'coral' },
  ]

  return (
    <Layout sidebar={<TeacherSidebar activePage="dashboard" selectedClass={dashboardData?.selected_class} />} leftSidebar={<TeacherLeftSidebar activePage="dashboard" />}>
      {/* Panel Head */}
      <section className="panel-head">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>{t('dashboard.title')}</h2>
        </div>
        <div className="panel-actions">
          <Link to="/teacher/task-groups" className="ghost-button">
            {t('dashboard.actions.prep')}
          </Link>
          <Link to="/teacher/live" className="solid-button">
            {t('dashboard.actions.enter')}
          </Link>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="stats-grid">
        <article className="stat-card">
          <strong>{loading ? '-' : `${stats.online_count} / ${stats.total_students}`}</strong>
          <span>{t('dashboard.stats.online')}</span>
        </article>
        <article className="stat-card">
          <strong>{loading ? '-' : (stats.pending_tasks > 0 ? String(stats.pending_tasks) : t('dashboard.stats.pendingTasks'))}</strong>
          <span>{t('dashboard.stats.classroomTasks')}</span>
        </article>
        <article className="stat-card">
          <strong>{loading ? '-' : stats.focus_students}</strong>
          <span>{t('dashboard.stats.focusStudents')}</span>
        </article>
      </section>

      {/* Teacher Grid */}
      <section className="teacher-grid">
        <article className="surface-card feature-card">
          <div className="surface-head">
            <h3>{t('dashboard.features.prepTitle')}</h3>
            <span>{t('dashboard.features.prepDesc')}</span>
          </div>
          <p>{t('dashboard.features.prepDetail')}</p>
          <div className="action-stack">
            <Link to="/teacher/task-groups" className="solid-button">
              {t('dashboard.features.prepButton')}
            </Link>
            <Link to="/teacher/task-groups" className="ghost-button">
              {t('dashboard.features.prepViewGroups')}
            </Link>
          </div>
        </article>

        <article className="surface-card feature-card">
          <div className="surface-head">
            <h3>{t('dashboard.features.liveTitle')}</h3>
            <span>{t('dashboard.features.liveDesc')}</span>
          </div>
          <p>{t('dashboard.features.liveDetail')}</p>
          <div className="action-stack">
            <Link to="/teacher/live" className="solid-button">
              {t('dashboard.features.liveButton')}
            </Link>
            <Link to="/teacher/live" className="ghost-button">
              {t('dashboard.features.liveViewLast')}
            </Link>
          </div>
        </article>

        <article className="surface-card feed-card">
          <div className="surface-head">
            <h3>{t('dashboard.feed.title')}</h3>
            <span>{t('dashboard.feed.update')}</span>
          </div>
          <div className="feed-list">
            {loading ? (
              <div className="feed-item">
                <span className="feed-dot green"></span>
                <p>{t('dashboard.feed.loading')}</p>
              </div>
            ) : (
              activities.map((activity, index) => (
                <div key={index} className="feed-item">
                  <span className={`feed-dot ${activity.dot_color}`}></span>
                  <p>{activity.message}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </Layout>
  )
}
