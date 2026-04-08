import React from 'react'
import type { TaskHistoryItem } from '../types'

interface HistoryListProps {
  show: boolean
  taskHistory: TaskHistoryItem[]
  searchQuery: string
  onSearchChange: (query: string) => void
  onClose: () => void
  onEnterActiveTask: (item: TaskHistoryItem) => void
  onEndActiveTask: (item: TaskHistoryItem) => void
  onViewAnalysis?: (item: TaskHistoryItem) => void
  onViewDetails?: (item: TaskHistoryItem) => void
  formatHistoryItemTime: (item: TaskHistoryItem) => string | null
  compareHistoryItems: (a: TaskHistoryItem, b: TaskHistoryItem) => number
  getHistoryItemKey: (item: TaskHistoryItem) => string
  isHistoryItemViewable: (item: TaskHistoryItem) => boolean
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

export const HistoryList: React.FC<HistoryListProps> = ({
  show,
  taskHistory,
  searchQuery,
  onSearchChange,
  onClose,
  onEnterActiveTask,
  onEndActiveTask,
  onViewAnalysis,
  onViewDetails,
  formatHistoryItemTime,
  compareHistoryItems,
  getHistoryItemKey,
  isHistoryItemViewable,
  t,
  tWithParams,
}) => {
  if (!show) return null

  const filteredHistory = [...taskHistory]
    .sort(compareHistoryItems)
    .filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <section className="mb-6">
      <div className="surface-card">
        <div className="surface-head">
          <h3>{t('teacherLive.historyList')}</h3>
          <div className="flex items-center gap-3">
            <span>
              {taskHistory.length} {t('teacherLive.taskCount_total')}
            </span>
            <button
              className="ghost-button py-1.5 px-3 text-sm"
              onClick={onClose}
            >
              {t('teacherLive.back')}
            </button>
          </div>
        </div>
        <div className="mb-4">
          <input
            type="text"
            placeholder={t('teacherLive.searchTask')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(24,36,58,0.08)',
            }}
          />
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredHistory.map((item, index) => {
            const viewable = isHistoryItemViewable(item)
            return (
            <div
              key={getHistoryItemKey(item)}
              className="p-4 rounded-xl"
              style={{
                background: item.status === 'active' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.5)',
                border:
                  item.status === 'active' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(24,36,58,0.08)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium"
                    style={{
                      background: item.status === 'active' ? 'rgba(56, 189, 248, 0.2)' : 'var(--surface)',
                    }}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      📋 {tWithParams('teacherLive.taskCount', { count: item.task_count })}
                      {item.submissions > 0 && tWithParams('teacherLive.submittedPeople', { count: item.submissions })}
                      {formatHistoryItemTime(item) && (
                        <span>
                          {tWithParams(item.ended_at ? 'teacherLive.endedAt' : 'teacherLive.publishedAt', {
                            time: formatHistoryItemTime(item) || '',
                          })}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      background:
                        item.status === 'active'
                          ? 'rgba(56, 189, 248, 0.2)'
                          : item.status === 'ready'
                            ? 'rgba(251, 191, 36, 0.2)'
                            : 'rgba(34, 197, 94, 0.2)',
                      color: item.status === 'active' ? '#0369a1' : item.status === 'ready' ? '#92400e' : '#15803d',
                    }}
                  >
                    {item.status === 'active'
                      ? t('teacherLive.active')
                      : item.status === 'ready'
                        ? t('teacherLive.ready')
                        : t('teacherLive.ended')}
                  </span>
                  {item.status === 'active' && (
                    <button
                      className="solid-button py-1.5 px-3 text-sm"
                      onClick={() => onEnterActiveTask(item)}
                    >
                      {t('teacherLive.viewActiveTask')}
                    </button>
                  )}
                  {item.status === 'active' && (
                    <button
                      className="danger-button py-1.5 px-3 text-sm"
                      onClick={() => onEndActiveTask(item)}
                    >
                      {t('teacherLive.endTask')}
                    </button>
                  )}
                  {item.status === 'ended' && (
                    <>
                      {onViewAnalysis && (
                        <button
                          className="ghost-button py-1.5 px-3 text-sm"
                          disabled={!viewable}
                          onClick={() => onViewAnalysis(item)}
                        >
                          {t('teacherLive.viewAnalysis')}
                        </button>
                      )}
                      {onViewDetails && (
                        <button
                          className="solid-button py-1.5 px-3 text-sm"
                          disabled={!viewable}
                          onClick={() => onViewDetails(item)}
                        >
                          {t('teacherLive.viewDetails')}
                        </button>
                      )}
                      {!viewable && (
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>
                          {t('teacherLive.noSubmissionData')}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
