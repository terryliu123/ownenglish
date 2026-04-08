import { useEffect, useMemo, useState } from 'react'
import { bigscreenActivityService, type BigscreenActivityPack, type BigscreenActivitySession, type BigscreenParticipantMode, type BigscreenParticipantSide } from '../../../services/api'
import { useTranslation } from '../../../i18n/useTranslation'

interface StudentCandidate {
  id: string
  name: string
}

export function BigscreenActivityLauncherModal({
  open,
  classId,
  students,
  onClose,
  onLaunch,
  onGoManage,
}: {
  open: boolean
  classId: string | null
  students: StudentCandidate[]
  onClose: () => void
  onLaunch: (session: BigscreenActivitySession) => void
  onGoManage: () => void
}) {
  const { t } = useTranslation()
  const [packs, setPacks] = useState<BigscreenActivityPack[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)
  const [leftStudentId, setLeftStudentId] = useState('')
  const [rightStudentId, setRightStudentId] = useState('')
  const [leftLabel, setLeftLabel] = useState('')
  const [rightLabel, setRightLabel] = useState('')
  const [participantMode, setParticipantMode] = useState<BigscreenParticipantMode>('student_vs_student')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const response = await bigscreenActivityService.listPacks({ status: 'active' })
        if (cancelled) return
        setPacks(response.items)
        const first = response.items[0] || null
        setSelectedPackId(first?.id || null)
        const mode = first?.participant_mode || 'student_vs_student'
        setParticipantMode(mode)
        setLeftLabel(mode === 'anonymous_side' || mode === 'team_vs_team' ? t('bigscreenActivities.launcher.defaultLeft') : '')
        setRightLabel(mode === 'anonymous_side' || mode === 'team_vs_team' ? t('bigscreenActivities.launcher.defaultRight') : '')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, t])

  const selectedPack = useMemo(
    () => packs.find((item) => item.id === selectedPackId) || null,
    [packs, selectedPackId],
  )

  useEffect(() => {
    if (!selectedPack) return
    setParticipantMode(selectedPack.participant_mode)
    if (selectedPack.participant_mode !== 'student_vs_student') {
      setLeftLabel((prev) => prev || t('bigscreenActivities.launcher.defaultLeft'))
      setRightLabel((prev) => prev || t('bigscreenActivities.launcher.defaultRight'))
    }
  }, [selectedPack, t])

  if (!open) return null

  const handleLaunch = async () => {
    if (!classId || !selectedPack) return

    let participantSides: BigscreenParticipantSide[] = []
    if (participantMode === 'student_vs_student') {
      const leftStudent = students.find((item) => item.id === leftStudentId)
      const rightStudent = students.find((item) => item.id === rightStudentId)
      if (!leftStudent || !rightStudent || leftStudent.id === rightStudent.id) {
        alert(t('bigscreenActivities.messages.studentSelectionRequired'))
        return
      }
      participantSides = [
        { id: `student-${leftStudent.id}`, label: leftStudent.name, type: 'student', member_ids: [leftStudent.id], display_color: '#60a5fa' },
        { id: `student-${rightStudent.id}`, label: rightStudent.name, type: 'student', member_ids: [rightStudent.id], display_color: '#f97316' },
      ]
    } else {
      if (!leftLabel.trim() || !rightLabel.trim()) {
        alert(t('bigscreenActivities.messages.missingParticipants'))
        return
      }
      participantSides = [
        { id: 'side-a', label: leftLabel.trim(), type: participantMode === 'team_vs_team' ? 'team' : 'anonymous_side', member_ids: [], display_color: '#60a5fa' },
        { id: 'side-b', label: rightLabel.trim(), type: participantMode === 'team_vs_team' ? 'team' : 'anonymous_side', member_ids: [], display_color: '#f97316' },
      ]
    }

    setLaunching(true)
    try {
      const session = await bigscreenActivityService.launchPack(selectedPack.id, {
        class_id: classId,
        participant_sides: participantSides,
      })
      onLaunch(session)
      onClose()
    } catch (error) {
      console.error(error)
      alert(t('bigscreenActivities.messages.launchFailed'))
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1450] flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-4xl rounded-3xl border border-slate-600 bg-[#12151d] p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">{t('bigscreenActivities.launcher.title')}</h2>
            <p className="mt-1 text-sm text-slate-200">{t('bigscreenActivities.launcher.subtitle')}</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-500 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800">
            {t('bigscreenActivities.cancel')}
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px,1fr]">
          <aside className="rounded-2xl border border-slate-600 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-slate-100">{t('bigscreenActivities.launcher.pack')}</h3>
              <button onClick={onGoManage} className="rounded-lg border border-slate-500 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800">
                {t('bigscreenActivities.launcher.goManage')}
              </button>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-6 text-sm text-slate-300">{t('common.loading')}</div>
              ) : packs.length === 0 ? (
                <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-6 text-sm text-slate-300">{t('bigscreenActivities.launcher.noPacks')}</div>
              ) : packs.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => setSelectedPackId(pack.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left ${selectedPackId === pack.id ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700 bg-slate-950/70 hover:bg-slate-800'}`}
                >
                  <div className="font-medium text-white">{pack.title}</div>
                  <div className="mt-1 text-xs text-slate-300">{t('bigscreenActivities.packCard.rounds')}: {pack.round_count}</div>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-600 bg-slate-900/70 p-4">
            {selectedPack ? (
              <>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('bigscreenActivities.launcher.classroomStudents')}</div>
                  <h3 className="mt-2 text-xl font-semibold text-white">{selectedPack.title}</h3>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {participantMode === 'student_vs_student' ? (
                    <>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-100">{t('bigscreenActivities.launcher.studentLeft')}</span>
                        <select value={leftStudentId} onChange={(e) => setLeftStudentId(e.target.value)} className="w-full rounded-xl border border-slate-500 bg-slate-950 px-3 py-2 text-slate-100">
                          <option value="" className="bg-slate-950 text-slate-100">{t('bigscreenActivities.launcher.selectPack')}</option>
                          {students.map((student) => <option key={student.id} value={student.id} className="bg-slate-950 text-slate-100">{student.name}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-100">{t('bigscreenActivities.launcher.studentRight')}</span>
                        <select value={rightStudentId} onChange={(e) => setRightStudentId(e.target.value)} className="w-full rounded-xl border border-slate-500 bg-slate-950 px-3 py-2 text-slate-100">
                          <option value="" className="bg-slate-950 text-slate-100">{t('bigscreenActivities.launcher.selectPack')}</option>
                          {students.map((student) => <option key={student.id} value={student.id} className="bg-slate-950 text-slate-100">{student.name}</option>)}
                        </select>
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-100">{t('bigscreenActivities.launcher.leftSide')}</span>
                        <input value={leftLabel} onChange={(e) => setLeftLabel(e.target.value)} className="w-full rounded-xl border border-slate-500 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500" />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-100">{t('bigscreenActivities.launcher.rightSide')}</span>
                        <input value={rightLabel} onChange={(e) => setRightLabel(e.target.value)} className="w-full rounded-xl border border-slate-500 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500" />
                      </label>
                    </>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button onClick={() => void handleLaunch()} disabled={launching || !classId} className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-60">
                    {launching ? t('bigscreenActivities.launcher.launching') : t('bigscreenActivities.launcher.launch')}
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-8 text-sm text-slate-300">{t('bigscreenActivities.launcher.noPacks')}</div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
