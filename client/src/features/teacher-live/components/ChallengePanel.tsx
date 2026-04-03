import React from 'react'
import { getTaskTypeLabel } from '../../tasks/task-helpers'
import { getTaskQuestionText } from '../../tasks/task-formatting'
import { TaskQuestionImage } from '../../tasks/task-preview'
import type { LiveChallengeSession } from '../types'
import { formatChallengeDuration } from '../hooks/useChallenges'

interface ChallengePanelProps {
  currentChallenge: LiveChallengeSession | null
  onOpenBoard: () => void
  onEndChallenge: () => void
  onDismissChallenge: () => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

export const ChallengePanel: React.FC<ChallengePanelProps> = ({
  currentChallenge,
  onOpenBoard,
  onEndChallenge,
  onDismissChallenge,
  t,
  tWithParams,
}) => {
  if (!currentChallenge) return null

  const isDuelLikeChallenge =
    currentChallenge?.mode === 'duel' || currentChallenge?.mode === 'single_question_duel'
  const isSingleQuestionDuel = currentChallenge?.mode === 'single_question_duel'

  const duelEntries = isDuelLikeChallenge
    ? [...currentChallenge.scoreboard].sort((left, right) => {
        const leftRank = left.rank ?? Number.MAX_SAFE_INTEGER
        const rightRank = right.rank ?? Number.MAX_SAFE_INTEGER
        if (leftRank !== rightRank) return leftRank - rightRank
        return (right.correct_count ?? 0) - (left.correct_count ?? 0)
      })
    : []

  const currentChallengeModeLabel =
    currentChallenge?.mode === 'single_question_duel'
      ? t('challenge.singleQuestionDuelMode')
      : currentChallenge?.mode === 'duel'
        ? t('challenge.duelMode')
        : t('challenge.classChallengeMode')

  const duelLeader =
    duelEntries.length === 2 && (duelEntries[0].correct_count ?? 0) !== (duelEntries[1].correct_count ?? 0)
      ? duelEntries[0]
      : null

  const singleQuestionWinner = isSingleQuestionDuel
    ? duelEntries.find((entry) => entry.student_id === currentChallenge?.winner_student_id) ||
      duelEntries.find((entry) => Boolean(entry.first_correct_at)) ||
      null
    : null

  const singleQuestionDraw = Boolean(
    isSingleQuestionDuel && currentChallenge && currentChallenge.status === 'ended' && !singleQuestionWinner
  )

  const duelProgressIndex = isDuelLikeChallenge
    ? (currentChallenge.scoreboard.length > 0
      ? Math.min(
          currentChallenge.tasks.length - 1,
          Math.max(
            0,
            ...currentChallenge.scoreboard.map((entry) =>
              Math.min(entry.current_index ?? 0, currentChallenge.tasks.length - 1)
            )
          )
        )
      : 0)
    : 0

  const duelCurrentTask = isDuelLikeChallenge ? currentChallenge?.tasks[duelProgressIndex] : null
  const leftDuelEntry = duelEntries[0] ?? null
  const rightDuelEntry = duelEntries[1] ?? null

  const classChallengeTopThree =
    currentChallenge?.mode === 'class_challenge'
      ? [...currentChallenge.scoreboard]
          .sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER))
          .slice(0, 3)
      : []

  const classChallengeWinner = classChallengeTopThree[0] ?? null

  const renderDuelEntryCard = (entry: (typeof duelEntries)[0], index: number) => {
    const isLeader = duelLeader?.student_id === entry.student_id

    return (
      <div
        key={entry.student_id}
        className="rounded-[24px] p-5 flex flex-col justify-between min-w-0"
        style={{
          background: isLeader
            ? 'linear-gradient(180deg, rgba(16,185,129,0.2), rgba(255,255,255,0.08))'
            : 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))',
          border: isLeader ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <p
              className="text-xs uppercase tracking-[0.24em]"
              style={{ color: 'rgba(255,255,255,0.52)' }}
            >
              {index === 0 ? t('challenge.leftLane') : t('challenge.rightLane')}
            </p>
            <h3
              className="text-3xl font-semibold mt-3"
              style={{
                color: '#fff',
                letterSpacing: '-0.04em',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                lineHeight: 1.1,
              }}
            >
              {entry.student_name}
            </h3>
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold shrink-0"
            style={{
              background: isLeader ? 'rgba(74, 222, 128, 0.16)' : 'rgba(255,255,255,0.1)',
              border: isLeader ? '1px solid rgba(74, 222, 128, 0.35)' : '1px solid rgba(255,255,255,0.12)',
              color: isLeader ? '#bbf7d0' : 'rgba(255,255,255,0.72)',
            }}
          >
            #{entry.rank ?? '-'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div
            className="rounded-2xl px-4 py-3 min-w-0"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {t('challenge.correctCount')}
            </p>
            <p className="text-2xl font-semibold break-words" style={{ color: '#fff' }}>
              {entry.correct_count} / {entry.total_tasks}
            </p>
          </div>
          <div
            className="rounded-2xl px-4 py-3 min-w-0"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {t('challenge.progress')}
            </p>
            <p className="text-2xl font-semibold break-words" style={{ color: '#fff' }}>
              {entry.answered_count} / {entry.total_tasks}
            </p>
          </div>
          <div
            className="rounded-2xl px-4 py-3 min-w-0"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {t('challenge.time')}
            </p>
            <p className="text-2xl font-semibold break-words" style={{ color: '#fff' }}>
              {formatChallengeDuration(entry.total_time_ms)}
            </p>
          </div>
        </div>

        <div
          className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <span style={{ color: 'rgba(255,255,255,0.68)' }}>
            {isSingleQuestionDuel
              ? singleQuestionWinner?.student_id === entry.student_id
                ? t('challenge.singleQuestionWon')
                : entry.eliminated_for_round
                  ? t('challenge.failedThisRound')
                  : singleQuestionDraw
                    ? t('challenge.singleQuestionDraw')
                    : t('challenge.waitingStatus')
              : entry.submitted
                ? t('challenge.submittedStatus')
                : t('challenge.waitingStatus')}
          </span>
          {currentChallenge?.status === 'ended' ? (
            <span
              className="text-sm font-semibold shrink-0"
              style={{ color: isLeader ? '#86efac' : 'rgba(255,255,255,0.62)' }}
            >
              {isSingleQuestionDuel
                ? singleQuestionWinner
                  ? singleQuestionWinner.student_id === entry.student_id
                    ? t('challenge.winner')
                    : t('challenge.finishedStatus')
                  : t('challenge.drawResult')
                : duelLeader
                  ? isLeader
                    ? t('challenge.winner')
                    : t('challenge.finishedStatus')
                  : t('challenge.drawResult')}
            </span>
          ) : (
            <span
              className="text-sm shrink-0"
              style={{ color: isLeader ? '#86efac' : 'rgba(255,255,255,0.52)' }}
            >
              {isSingleQuestionDuel
                ? singleQuestionWinner
                  ? singleQuestionWinner.student_id === entry.student_id
                    ? t('challenge.leading')
                    : t('challenge.chasing')
                  : entry.eliminated_for_round
                    ? t('challenge.failedThisRound')
                    : t('challenge.roundWaiting')
                : isLeader
                  ? t('challenge.leading')
                  : duelLeader
                    ? t('challenge.chasing')
                    : t('challenge.tied')}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <section className="mb-6">
      <div className="surface-card">
        <div className="surface-head">
          <div>
            <h3>{currentChallenge.title}</h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {currentChallengeModeLabel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`status-badge ${currentChallenge.status === 'ended' ? 'muted' : 'active'}`}>
              {currentChallenge.status === 'ended' ? t('challenge.ended') : t('challenge.active')}
            </span>
            <button className="ghost-button py-2 px-4 text-sm" onClick={onOpenBoard}>
              {t('challenge.openBoard')}
            </button>
            {currentChallenge.status !== 'ended' ? (
              <button className="ghost-button py-2 px-4 text-sm" onClick={onEndChallenge}>
                {t('challenge.endChallenge')}
              </button>
            ) : (
              <button className="ghost-button py-2 px-4 text-sm" onClick={onDismissChallenge}>
                {t('challenge.closeBoard')}
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div
            className="p-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(24,36,58,0.08)' }}
          >
            <h4 className="font-medium mb-2">{t('challenge.participants')}</h4>
            <div className="flex flex-wrap gap-2">
              {currentChallenge.participants.map((participant) => (
                <span
                  key={participant.student_id}
                  className="px-3 py-2 rounded-full text-sm"
                  style={{ background: 'rgba(24, 50, 74, 0.08)', color: 'var(--ink)' }}
                >
                  {participant.student_name}
                </span>
              ))}
            </div>
          </div>
          <div
            className="p-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(24,36,58,0.08)' }}
          >
            <h4 className="font-medium mb-2">{t('challenge.progress')}</h4>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {isDuelLikeChallenge
                ? tWithParams('challenge.answerProgress', {
                    answered: Math.max(0, ...currentChallenge.scoreboard.map((item) => item.answered_count ?? 0)),
                    total: currentChallenge.tasks.length,
                  })
                : tWithParams('challenge.progressSummary', {
                    current: currentChallenge.scoreboard.filter((item) => item.submitted).length,
                    total: currentChallenge.scoreboard.length,
                  })}
            </p>
          </div>
        </div>

        {isDuelLikeChallenge ? (
          <div className="space-y-5">
            <div
              className="rounded-[28px] p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.86))',
                border: '1px solid rgba(148, 163, 184, 0.18)',
                boxShadow: '0 30px 80px rgba(15, 23, 42, 0.22)',
              }}
            >
              <div className="grid lg:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)] gap-4 items-stretch">
                {leftDuelEntry ? renderDuelEntryCard(leftDuelEntry, 0) : <div />}
                <div className="flex flex-col items-center justify-center gap-4">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black"
                    style={{
                      color: '#fff',
                      background: 'radial-gradient(circle at 30% 30%, rgba(56,189,248,0.95), rgba(14,116,144,0.88))',
                      boxShadow: '0 18px 48px rgba(14, 116, 144, 0.28)',
                    }}
                  >
                    {t('challenge.versus')}
                  </div>
                  <div className="text-center">
                    <p
                      className="text-xs uppercase tracking-[0.22em] mb-2"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                    >
                      {isSingleQuestionDuel ? t('challenge.singleQuestionResult') : t('challenge.currentLead')}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: '#fff' }}>
                      {isSingleQuestionDuel
                        ? singleQuestionWinner?.student_name ||
                          (singleQuestionDraw ? t('challenge.singleQuestionDraw') : t('challenge.tieState'))
                        : duelLeader?.student_name || t('challenge.tieState')}
                    </p>
                  </div>
                </div>
                {rightDuelEntry ? renderDuelEntryCard(rightDuelEntry, 1) : <div />}
              </div>
            </div>

            {duelCurrentTask && (
              <div
                className="rounded-[24px] p-5"
                style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(24,36,58,0.08)' }}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="eyebrow">{t('challenge.onScreenPrompt')}</p>
                    <h4 className="text-lg font-semibold">
                      {tWithParams('challenge.questionFocus', {
                        current: duelProgressIndex + 1,
                        total: currentChallenge.tasks.length,
                      })}
                    </h4>
                  </div>
                  <span className="meta-chip">
                    {getTaskTypeLabel(duelCurrentTask.type, t, t('teacherLive.other'))}
                  </span>
                </div>
                <p className="text-base leading-7" style={{ color: 'var(--ink)' }}>
                  {getTaskQuestionText(duelCurrentTask.question) || `${t('task.question')} ${duelProgressIndex + 1}`}
                </p>
                <TaskQuestionImage
                  question={duelCurrentTask.question as Record<string, unknown>}
                  alt={getTaskQuestionText(duelCurrentTask.question) || `${t('task.question')} ${duelProgressIndex + 1}`}
                  wrapperClassName="mt-4 rounded-3xl overflow-hidden border border-slate-200 bg-white"
                />
                {(duelCurrentTask.question as any)?.options && (
                  <div className="mt-4 space-y-2">
                    {(
                      duelCurrentTask.question as { options: { key: string; text: string }[] }
                    ).options.map((opt) => (
                      <div
                        key={opt.key}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-base"
                        style={{
                          background: 'rgba(255,255,255,0.6)',
                          border: '1px solid rgba(24,36,58,0.08)',
                        }}
                      >
                        <span
                          className="w-7 h-7 flex items-center justify-center rounded-full font-bold text-xs"
                          style={{ background: 'var(--navy)', color: '#fff' }}
                        >
                          {opt.key}
                        </span>
                        <span>{typeof opt.text === 'string' ? opt.text : getTaskQuestionText({ text: opt.text })}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(duelCurrentTask.question as any)?.pairs && (
                  <div className="mt-4 space-y-2">
                    {(
                      duelCurrentTask.question as { pairs: { left: string; right: string }[] }
                    ).pairs.map((pair, pidx) => (
                      <div
                        key={pidx}
                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm"
                        style={{
                          background: 'rgba(255,255,255,0.6)',
                          border: '1px solid rgba(24,36,58,0.08)',
                        }}
                      >
                        <span className="font-medium">{pair.left}</span>
                        <span style={{ color: 'var(--muted)' }}>→</span>
                        <span className="font-medium">{pair.right}</span>
                      </div>
                    ))}
                  </div>
                )}
                {isSingleQuestionDuel && (
                  <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>
                    {singleQuestionWinner
                      ? t('challenge.singleQuestionWinDetail')
                      : singleQuestionDraw
                        ? t('challenge.singleQuestionDrawDetail')
                        : t('challenge.singleQuestionSelectHint')}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {classChallengeTopThree.length > 0 && (
              <div className="grid md:grid-cols-3 gap-4">
                {classChallengeTopThree.map((entry, index) => (
                  <div
                    key={entry.student_id}
                    className="rounded-3xl p-5"
                    style={{
                      background:
                        index === 0
                          ? 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(255,255,255,0.78))'
                          : 'rgba(255,255,255,0.72)',
                      border: '1px solid rgba(24,36,58,0.08)',
                    }}
                  >
                    <p
                      className="text-xs uppercase tracking-[0.18em] mb-2"
                      style={{ color: 'var(--muted)' }}
                    >
                      {t('challenge.liveTopThree')} · #{entry.rank ?? index + 1}
                    </p>
                    <h4 className="text-lg font-semibold">{entry.student_name}</h4>
                    <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
                      {entry.correct_count} / {entry.total_tasks}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      {formatChallengeDuration(entry.total_time_ms)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {currentChallenge.status === 'ended' && (
              <div
                className="rounded-3xl p-5"
                style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(24,36,58,0.08)' }}
              >
                <p className="eyebrow">{t('challenge.summaryHeadline')}</p>
                <h4 className="text-lg font-semibold">
                  {classChallengeWinner?.student_name || t('challenge.summaryDraw')}
                </h4>
                <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                  {classChallengeWinner
                    ? `${t('challenge.summaryWinner')} · ${classChallengeWinner.correct_count}/${classChallengeWinner.total_tasks}`
                    : t('challenge.summaryDraw')}
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
                    <th className="py-2">{t('challenge.rank')}</th>
                    <th className="py-2">{t('challenge.student')}</th>
                    <th className="py-2">{t('challenge.correctCount')}</th>
                    <th className="py-2">{t('challenge.progress')}</th>
                    <th className="py-2">{t('challenge.time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {currentChallenge.scoreboard.map((entry) => (
                    <tr key={entry.student_id} style={{ borderTop: '1px solid rgba(24,36,58,0.08)' }}>
                      <td className="py-3">{entry.rank ?? '-'}</td>
                      <td className="py-3">{entry.student_name}</td>
                      <td className="py-3">
                        {entry.correct_count} / {entry.total_tasks}
                      </td>
                      <td className="py-3">
                        {entry.answered_count} / {entry.total_tasks}
                      </td>
                      <td className="py-3">{formatChallengeDuration(entry.total_time_ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
