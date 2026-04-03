import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import { useAppStore } from '../../stores/app-store'
import { reportService } from '../../services/api'
import { useTranslation } from '../../i18n/useTranslation'

interface WeakPoint {
  type: string
  label: string
  accuracy: number
}

interface ReportSummary {
  enrolled_classes?: number
  completed_packs_30d?: number
  live_submissions_30d?: number
  recent_submissions?: Array<{
    id: string
    submitted_at: string
    status: string
  }>
}

interface WeakPointPayload {
  weak_points: WeakPoint[]
  recommendations: string[]
}

const reportCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.72)',
  border: '1px solid rgba(24, 36, 58, 0.08)',
  boxShadow: 'var(--shadow)',
  color: 'var(--ink)',
}

const reportMutedTextStyle: React.CSSProperties = {
  color: 'var(--muted)',
}

const reportTitleStyle: React.CSSProperties = {
  color: 'var(--ink)',
}

const reportCalloutStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(244, 238, 229, 0.86))',
  border: '1px solid rgba(24, 36, 58, 0.08)',
  boxShadow: 'none',
  color: 'var(--muted)',
}

export default function StudentReport() {
  const { t } = useTranslation()
  const { user } = useAppStore()
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [weakPoints, setWeakPoints] = useState<WeakPointPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void loadReport()
  }, [user])

  async function loadReport() {
    if (user?.role !== 'student') {
      setLoading(false)
      return
    }

    try {
      const [summaryData, weakData] = await Promise.all([
        reportService.getStudentSummary(),
        reportService.getStudentWeakPoints(),
      ])
      setSummary(summaryData)
      setWeakPoints(weakData)
    } catch (error) {
      console.error('Failed to load report:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted">{t('common.loading')}</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="student-report-page min-h-screen bg-gradient-to-b from-navy-50 to-white">
        <style>{`
          .student-report-page .report-surface-card,
          .student-report-page .report-callout-card {
            color: var(--ink) !important;
          }

          .student-report-page .report-surface-card *,
          .student-report-page .report-callout-card * {
            color: inherit !important;
          }

          .student-report-page .report-surface-card p,
          .student-report-page .report-surface-card span,
          .student-report-page .report-surface-card .text-sm,
          .student-report-page .report-surface-card .text-gray-500,
          .student-report-page .report-surface-card .text-muted,
          .student-report-page .report-callout-card p,
          .student-report-page .report-callout-card span,
          .student-report-page .report-callout-card .text-sm {
            color: var(--muted) !important;
          }

          .student-report-page .report-surface-card h1,
          .student-report-page .report-surface-card h2,
          .student-report-page .report-surface-card h3,
          .student-report-page .report-surface-card strong,
          .student-report-page .report-surface-card .font-medium,
          .student-report-page .report-surface-card .font-semibold,
          .student-report-page .report-callout-card h1,
          .student-report-page .report-callout-card h2,
          .student-report-page .report-callout-card h3,
          .student-report-page .report-callout-card strong,
          .student-report-page .report-callout-card .font-medium,
          .student-report-page .report-callout-card .font-semibold {
            color: var(--ink) !important;
          }

          .student-report-page .report-surface-card .status-badge {
            color: #1f5f4f !important;
            background: rgba(79, 133, 118, 0.16) !important;
            border-color: rgba(79, 133, 118, 0.26) !important;
          }

          .student-report-page .report-surface-card .text-green-600 {
            color: #16a34a !important;
          }

          .student-report-page .report-surface-card,
          .student-report-page .report-callout-card {
            backdrop-filter: blur(16px);
          }
        `}</style>

        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-display font-bold" style={reportTitleStyle}>{t('report.title')}</h1>
            <p className="text-gray-500" style={reportMutedTextStyle}>{t('report.past30Days')}</p>
          </div>

          <section className="mb-6">
            <div className="stats-grid">
              <div className="stat-card">
                <strong>{summary?.enrolled_classes || 0}</strong>
                <span>{t('report.enrolledClass')}</span>
              </div>
              <div className="stat-card">
                <strong>{summary?.completed_packs_30d || 0}</strong>
                <span>{t('report.completedPacks')}</span>
              </div>
              <div className="stat-card">
                <strong>{summary?.live_submissions_30d || 0}</strong>
                <span>{t('report.classroomAnswers')}</span>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3" style={reportTitleStyle}>{t('report.weakPointsAnalysis')}</h2>
            {weakPoints && weakPoints.weak_points.length > 0 ? (
              <div className="space-y-3">
                {weakPoints.weak_points.map((wp, idx) => (
                  <div key={idx} className="student-card report-surface-card" style={reportCardStyle}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold" style={reportTitleStyle}>{wp.label}</h3>
                        <p className="text-sm" style={reportMutedTextStyle}>{t('task.correctAnswer')} {wp.accuracy.toFixed(0)}%</p>
                      </div>
                      <div className="accuracy-bar">
                        <div className="accuracy-fill" style={{ width: `${wp.accuracy}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="student-card report-surface-card text-center py-6" style={reportCardStyle}>
                <p className="text-green-600 text-lg mb-2" style={{ color: '#16a34a', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                  {t('report.goodPerformance')}
                </p>
                <p style={reportMutedTextStyle}>{t('report.allModulesAbove70')}</p>
              </div>
            )}
          </section>

          {weakPoints && weakPoints.recommendations.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold mb-3" style={reportTitleStyle}>{t('report.learningSuggestions')}</h2>
              <div className="space-y-2">
                {weakPoints.recommendations.map((rec, idx) => (
                  <div key={idx} className="callout-card report-callout-card" style={reportCalloutStyle}>
                    <p className="text-sm" style={{ color: '#324155' }}>{rec}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3" style={reportTitleStyle}>{t('report.recentActivity')}</h2>
            {summary?.recent_submissions && summary.recent_submissions.length > 0 ? (
              <div className="space-y-2">
                {summary.recent_submissions.map((sub) => (
                  <div key={sub.id} className="student-card report-surface-card" style={reportCardStyle}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium" style={reportTitleStyle}>{t('packs.title')}</p>
                        <p className="text-sm" style={reportMutedTextStyle}>
                          {new Date(sub.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`status-badge ${sub.status === 'completed' ? 'success' : 'warm'}`}>
                        {sub.status === 'completed' ? t('report.completed') : t('report.pending')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="student-card report-surface-card text-center py-6" style={reportCardStyle}>
                <p style={reportMutedTextStyle}>{t('report.noRecentActivity')}</p>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={reportTitleStyle}>{t('report.continueLearning')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="/student/pack"
                className="student-card report-surface-card text-center py-4"
                style={{ ...reportCardStyle, textDecoration: 'none' }}
              >
                <span className="text-2xl" aria-hidden="true">📚</span>
                <p className="font-medium mt-2" style={reportTitleStyle}>{t('packs.title')}</p>
              </a>
              <a
                href="/student/free"
                className="student-card report-surface-card text-center py-4"
                style={{ ...reportCardStyle, textDecoration: 'none' }}
              >
                <span className="text-2xl" aria-hidden="true">🎯</span>
                <p className="font-medium mt-2" style={reportTitleStyle}>{t('freePractice.title')}</p>
              </a>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  )
}
