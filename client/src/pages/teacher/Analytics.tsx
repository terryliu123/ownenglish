import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import { useTranslation } from '../../i18n/useTranslation'
import { reportService, classService } from '../../services/api'
import { useAppStore } from '../../stores/app-store'

interface ClassSummary {
  class_id: string
  class_name: string
  student_count: number
  pack_count: number
  submission_count: number
  completion_rate: number
  has_active_session: boolean
}

interface StudentProgress {
  student_id: string
  name: string
  email: string
  joined_at: string
  submission_count: number
  live_submission_count: number
  status: string
}

export default function TeacherAnalytics() {
  const { t, tWithParams } = useTranslation()
  const { user } = useAppStore()
  const navigate = useNavigate()
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [classSummary, setClassSummary] = useState<ClassSummary | null>(null)
  const [students, setStudents] = useState<StudentProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [user])

  async function loadData() {
    if (user?.role !== 'teacher') return
    try {
      const classesData = await classService.getAll()
      setClasses(classesData)
      if (classesData.length > 0) {
        setSelectedClassId(classesData[0].id)
      }
    } catch (e) {
      console.error('Failed to load data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedClassId) {
      loadClassReport(selectedClassId)
    }
  }, [selectedClassId])

  async function loadClassReport(classId: string) {
    try {
      const [summaryData, studentsData] = await Promise.all([
        reportService.getClassSummary(classId),
        reportService.getClassStudents(classId),
      ])
      setClassSummary(summaryData)
      setStudents(studentsData.students || [])
    } catch (e) {
      console.error('Failed to load class report:', e)
    }
  }

  if (loading) {
    return (
      <Layout sidebar={<TeacherSidebar activePage="analytics" />}>
        <div className="card p-12 text-center">
          <p className="text-muted">{t('common.loading')}</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout sidebar={<TeacherSidebar activePage="analytics" />}>
      {/* 深蓝顶栏 */}
      <section className="surface-card mb-4 mt-4" style={{ background: 'linear-gradient(135deg, #18324a 0%, #2a4a6a 100%)' }}>
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* 左侧：标题 */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <span className="text-lg">📊</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>Analytics</p>
                <h2 className="text-base font-semibold" style={{ color: '#fff' }}>{t('analytics.title')}</h2>
              </div>
            </div>

            {/* 右侧：快捷入口 + 班级选择 */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/teacher/task-groups')}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                📋 课前准备
              </button>
              <button
                onClick={() => navigate('/teacher/live')}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'rgba(255,255,255,0.9)', color: '#18324a' }}
              >
                📡 进入课堂
              </button>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{t('taskGroup.selectClassLabel')}</span>
              <select
                value={selectedClassId || ''}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id} style={{ color: '#333' }}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {classSummary && (
        <section className="stats-grid stats-grid-3">
          <article className="stat-card">
            <strong>{classSummary.student_count}</strong>
            <span>{t('analytics.stats.students')}</span>
          </article>
          <article className="stat-card">
            <strong>{classSummary.submission_count}</strong>
            <span>{t('analytics.stats.submissions')}</span>
          </article>
          <article className="stat-card">
            <strong>{classSummary.completion_rate}%</strong>
            <span>{t('analytics.stats.completionRate')}</span>
          </article>
        </section>
      )}

      <section className="teacher-grid">
        <article className="surface-card feature-card">
          <div className="surface-head">
            <h3>{t('analytics.students.title')}</h3>
            <span>{tWithParams('miscUi.analytics.studentsCount', { count: students.length })}</span>
          </div>
          {students.length > 0 ? (
            <div className="surface-list">
              {students.slice(0, 5).map((student) => (
                <div key={student.student_id} className="surface-row">
                  <strong>{student.name}</strong>
                  <span>{tWithParams('miscUi.analytics.activitySummary', { practice: student.submission_count, live: student.live_submission_count })}</span>
                </div>
              ))}
              {students.length > 5 && (
                <p className="text-sm text-gray-500 mt-2">
                  {t('analytics.students.moreStudents').replace('{{count}}', String(students.length - 5))}
                </p>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <p className="text-muted">{t('analytics.students.noData')}</p>
            </div>
          )}
        </article>

        <article className="surface-card feature-card">
          <div className="surface-head">
            <h3>{t('analytics.students.weakPoints')}</h3>
            <span>{t('analytics.students.focusNeeded')}</span>
          </div>
          <div className="feed-list">
            <div className="feed-item">
              <span className="feed-dot amber"></span>
              <p>{t('analytics.students.completionRate').replace('{{rate}}', String(classSummary?.completion_rate || 0))}</p>
            </div>
            <div className="feed-item">
              <span className="feed-dot amber"></span>
              <p>{t('analytics.students.suggestion')}</p>
            </div>
          </div>
        </article>

        <article className="surface-card feed-card">
          <div className="surface-head">
            <h3>{t('analytics.ranking.title')}</h3>
            <span>{t('analytics.ranking.byActivity')}</span>
          </div>
          {students.length > 0 ? (
            <div className="surface-list">
              {[...students]
                .sort((a, b) => (b.submission_count + b.live_submission_count) - (a.submission_count + a.live_submission_count))
                .slice(0, 5)
                .map((student, idx) => {
                  const medals = ['🥇', '🥈', '🥉']
                  const total = student.submission_count + student.live_submission_count
                  return (
                    <div key={student.student_id} className="surface-row">
                      <strong>{idx < 3 ? medals[idx] : `${idx + 1}.`} {student.name}</strong>
                      <span>{t('analytics.ranking.activityCount').replace('{{count}}', String(total))}</span>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="empty-state">
              <p className="text-muted">{t('analytics.ranking.noData')}</p>
            </div>
          )}
        </article>
      </section>

      {students.length > 0 && (
        <section className="mt-6">
          <div className="surface-card">
            <div className="surface-head">
              <h3>{t('analytics.table.allStudents')}</h3>
            </div>
            <div className="table-wrapper">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>{t('analytics.table.name')}</th>
                    <th>{t('analytics.table.email')}</th>
                    <th>{t('analytics.table.practiceCount')}</th>
                    <th>{t('analytics.table.answerCount')}</th>
                    <th>{t('analytics.table.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.student_id}>
                      <td>{student.name}</td>
                      <td className="text-gray-500">{student.email}</td>
                      <td>{student.submission_count}</td>
                      <td>{student.live_submission_count}</td>
                      <td>
                        <span className={`status-badge ${student.status === 'active' ? 'success' : 'warm'}`}>
                          {student.status === 'active' ? t('analytics.table.active') : student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </Layout>
  )
}
