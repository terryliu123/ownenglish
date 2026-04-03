import React from 'react'
import type { LiveTaskGroup } from '../../../services/api'

interface TaskGroupPanelProps {
  taskGroups: LiveTaskGroup[]
  selectedGroup: LiveTaskGroup | null
  onSelectGroup: (groupId: string) => void
  onRevertToDraft?: (groupId: string) => void
  onNavigateToPrepare: () => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

export const TaskGroupPanel: React.FC<TaskGroupPanelProps> = ({
  taskGroups,
  selectedGroup,
  onSelectGroup,
  onRevertToDraft,
  onNavigateToPrepare,
  t,
  tWithParams,
}) => {
  return (
    <article className="surface-card">
      <div className="surface-head">
        <h3>{t('teacherLive.readyTaskGroupsTitle')}</h3>
        <span>{tWithParams('teacherLive.readyGroupCount', { count: taskGroups.length })}</span>
      </div>

      {taskGroups.length === 0 ? (
        <div className="p-6 text-center">
          <p className="mb-2" style={{ color: 'var(--muted)' }}>
            {t('teacherLive.noReadyGroups')}
          </p>
          <button className="ghost-button" onClick={onNavigateToPrepare}>
            {t('teacherLive.goPrepareQuestions')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {taskGroups.map((group) => (
            <div
              key={group.id}
              role="button"
              className={`w-full text-left p-4 rounded-xl cursor-pointer ${selectedGroup?.id === group.id ? 'ring-2' : ''}`}
              style={{
                background:
                  selectedGroup?.id === group.id
                    ? 'rgba(56, 189, 248, 0.1)'
                    : 'rgba(255,255,255,0.7)',
                border:
                  selectedGroup?.id === group.id
                    ? '1px solid rgba(56, 189, 248, 0.4)'
                    : '1px solid rgba(24,36,58,0.08)',
                '--tw-ring-color': 'var(--accent)',
              } as React.CSSProperties}
              onClick={() => onSelectGroup(group.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-lg flex-shrink-0">📁</span>
                  <span className="font-medium truncate">{group.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedGroup?.id === group.id && onRevertToDraft && (
                    <button
                      className="text-xs px-2 py-1 rounded-lg ghost-button"
                      style={{ color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(t('teacherLive.confirmRevertToDraft'))) {
                          onRevertToDraft(group.id)
                        }
                      }}
                      title={t('teacherLive.revertToDraft')}
                    >
                      {t('teacherLive.revertToDraft')}
                    </button>
                  )}
                  <span
                    className="text-sm px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(24,36,58,0.08)', color: 'var(--muted)' }}
                  >
                    {tWithParams('teacherLive.groupTaskCount', { count: group.task_count || 0 })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}
