import React, { useMemo, useState } from 'react'

interface DuelModalProps {
  show: boolean
  selectedParticipants: string[]
  challengeCandidates: { id: string; name: string }[]
  challengeCreating: boolean
  onClose: () => void
  onToggleParticipant: (studentId: string) => void
  onConfirm: () => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

export const DuelModal: React.FC<DuelModalProps> = ({
  show,
  selectedParticipants,
  challengeCandidates,
  challengeCreating,
  onClose,
  onToggleParticipant,
  onConfirm,
  t,
  tWithParams,
}) => {
  if (!show) return null

  const [searchTerm, setSearchTerm] = useState('')

  const visibleCandidates = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    const filtered = !keyword
      ? challengeCandidates
      : challengeCandidates.filter((student) => student.name.toLowerCase().includes(keyword))

    return [...filtered].sort((left, right) => {
      const leftSelected = selectedParticipants.includes(left.id)
      const rightSelected = selectedParticipants.includes(right.id)
      if (leftSelected !== rightSelected) return leftSelected ? -1 : 1
      return left.name.localeCompare(right.name, 'zh-CN')
    })
  }, [challengeCandidates, searchTerm, selectedParticipants])

  return (
    <div className="fixed inset-0 z-[1500] flex items-start justify-center pt-24 pb-5 px-5" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div
        className="modal-content surface-card"
        style={{ maxWidth: '780px', maxHeight: 'min(80vh, 760px)', display: 'flex', flexDirection: 'column', marginTop: '40px', marginBottom: '40px' }}
      >
        <div className="surface-head">
          <div>
            <h3 style={{ color: '#0f172a' }}>{t('challenge.selectDuelParticipants')}</h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {tWithParams('challenge.selectDuelDescription', { count: selectedParticipants.length })}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t('common.close')} style={{ color: '#475569' }}>
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <div className="mb-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('challenge.searchStudents')}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-300"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleCandidates.map((student) => {
              const selected = selectedParticipants.includes(student.id)

              return (
                <button
                  key={student.id}
                  type="button"
                  className="h-[96px] min-w-0 p-4 rounded-xl text-left transition-all overflow-hidden"
                  onClick={() => onToggleParticipant(student.id)}
                  style={{
                    background: selected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.9)',
                    border: selected ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(24,36,58,0.08)',
                  }}
                >
                  <div
                    className="font-medium break-words overflow-hidden"
                    style={{
                      color: selected ? '#059669' : '#0f172a',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {student.name}
                  </div>
                  <div className="text-sm mt-1 break-words" style={{ color: selected ? '#059669' : '#64748b' }}>
                    {selected ? t('challenge.selected') : t('challenge.clickToSelect')}
                  </div>
                </button>
              )
            })}
          </div>
          {visibleCandidates.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              {t('challenge.noMatchingStudents')}
            </div>
          )}
        </div>

        <div className="action-stack mt-4">
          <button className="ghost-button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="solid-button"
            disabled={selectedParticipants.length !== 2 || challengeCreating}
            onClick={onConfirm}
          >
            {t('challenge.confirmStart')}
          </button>
        </div>
      </div>
    </div>
  )
}
