import React from 'react'

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

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>      <div className="modal-content surface-card" style={{ maxWidth: '720px' }}>
        <div className="surface-head">
          <div>
            <h3>{t('challenge.selectDuelParticipants')}</h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {tWithParams('challenge.selectDuelDescription', { count: selectedParticipants.length })}
            </p>
          </div>
          <button className="icon-button" onClick={onClose}>✕</button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {challengeCandidates.map((student) => {
            const selected = selectedParticipants.includes(student.id)
            return (
              <button
                key={student.id}
                type="button"
                className="p-4 rounded-xl text-left transition-all"
                onClick={() => onToggleParticipant(student.id)}
                style={{
                  background: selected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.7)',
                  border: selected ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(24,36,58,0.08)',
                }}
              >
                <div className="font-medium" style={{ color: selected ? '#059669' : '#1e293b' }}>{student.name}</div>
                <div className="text-sm mt-1" style={{ color: selected ? '#059669' : '#64748b' }}>
                  {selected ? t('challenge.selected') : t('challenge.clickToSelect')}
                </div>
              </button>
            )
          })}
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
