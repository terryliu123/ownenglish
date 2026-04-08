import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from '../../i18n/useTranslation'
import { bigscreenActivityService, type BigscreenActivitySession } from '../../services/api'
import { BigscreenActivityShell } from '../../features/bigscreen-activities/components/BigscreenActivityShell'

export default function TeacherBigscreenActivityRun() {
  const { t } = useTranslation()
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<BigscreenActivitySession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setError(t('bigscreenActivities.messages.loadFailed'))
      setLoading(false)
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await bigscreenActivityService.getSession(sessionId)
        if (!cancelled) setSession(response)
      } catch (err) {
        console.error(err)
        if (!cancelled) setError(t('bigscreenActivities.messages.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [sessionId, t])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#070b12] text-slate-300">{t('common.loading')}</div>
  }

  if (error || !session) {
    return <div className="flex min-h-screen items-center justify-center bg-[#070b12] text-rose-300">{error || t('bigscreenActivities.messages.loadFailed')}</div>
  }

  return <BigscreenActivityShell initialSession={session} />
}
