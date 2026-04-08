import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  bigscreenActivityService,
  type BigscreenActivitySession,
  type BigscreenContentAsset,
} from '../../../services/api'
import { useTranslation } from '../../../i18n/useTranslation'
import {
  createDefaultSideAnswer,
  evaluateSideAnswer,
  formatBigscreenDuration,
  resolveRoundWinner,
  sortScoreboard,
  type BigscreenSideAnswer,
  updateScoreboardForRound,
} from '../runtime'
import { MatchingDuelRenderer } from './MatchingDuelRenderer'
import { SortingDuelRenderer } from './SortingDuelRenderer'
import { ClassificationDuelRenderer } from './ClassificationDuelRenderer'

// Helper to extract plain text from rich text content (TipTap JSON format)
function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (!content || typeof content !== 'object') return ''
  const node = content as Record<string, unknown>
  if (node.type === 'text' && typeof node.text === 'string') return node.text
  if (Array.isArray(node.content)) {
    return node.content.map(extractTextFromContent).join('')
  }
  return ''
}

function getPromptText(payload: unknown): string {
  const prompt = (payload as { prompt?: unknown })?.prompt
  if (typeof prompt === 'string') return prompt
  return extractTextFromContent(prompt)
}

type SideSubmitState = {
  submitted: boolean
  elapsedMs: number
}

function getCurrentAsset(session: BigscreenActivitySession | null): BigscreenContentAsset | null {
  if (!session?.activity_pack?.content_assets?.length || !session.current_asset_id) return null
  return session.activity_pack.content_assets.find((asset) => asset.id === session.current_asset_id) || null
}

function renderRenderer(
  asset: BigscreenContentAsset,
  answer: BigscreenSideAnswer,
  disabled: boolean,
  onChange: (next: BigscreenSideAnswer) => void,
) {
  if (asset.content_type === 'matching') {
    return <MatchingDuelRenderer asset={asset} answer={answer} disabled={disabled} onChange={onChange} />
  }
  if (asset.content_type === 'sorting') {
    return <SortingDuelRenderer asset={asset} answer={answer} disabled={disabled} onChange={onChange} />
  }
  return <ClassificationDuelRenderer asset={asset} answer={answer} disabled={disabled} onChange={onChange} />
}

export function BigscreenActivityShell({
  initialSession,
}: {
  initialSession: BigscreenActivitySession
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [session, setSession] = useState(initialSession)
  const [actionLoading, setActionLoading] = useState(false)
  const [roundSubmitting, setRoundSubmitting] = useState(false)
  const [roundAnswers, setRoundAnswers] = useState<Record<string, BigscreenSideAnswer>>({})
  const [sideSubmitState, setSideSubmitState] = useState<Record<string, SideSubmitState>>({})
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null)
  const roundStartedAtRef = useRef<number>(Date.now())
  const finalizingRoundRef = useRef(false)

  const participantSides = useMemo(() => session.participant_sides || [], [session.participant_sides])
  const currentAsset = useMemo(() => getCurrentAsset(session), [session])
  const sortedScoreboard = useMemo(() => sortScoreboard(session.scoreboard || []), [session.scoreboard])
  const latestRound = useMemo(() => {
    const rounds = Array.isArray(session.result_summary?.rounds) ? session.result_summary.rounds : []
    return rounds.length > 0 ? rounds[rounds.length - 1] : null
  }, [session.result_summary])
  const totalRounds = session.activity_pack?.round_count || 1
  const roundKey = `${session.id}:${session.current_round}:${session.current_asset_id || 'none'}`

  useEffect(() => {
    if (!currentAsset || participantSides.length !== 2) return
    const nextAnswers: Record<string, BigscreenSideAnswer> = {}
    const nextSubmitState: Record<string, SideSubmitState> = {}
    participantSides.forEach((side) => {
      nextAnswers[side.id] = createDefaultSideAnswer(currentAsset)
      nextSubmitState[side.id] = { submitted: false, elapsedMs: 0 }
    })
    setRoundAnswers(nextAnswers)
    setSideSubmitState(nextSubmitState)
    setTimeLeftSeconds(session.activity_pack?.time_limit_seconds ?? null)
    roundStartedAtRef.current = Date.now()
    finalizingRoundRef.current = false
  }, [currentAsset, participantSides, roundKey, session.activity_pack?.time_limit_seconds])

  useEffect(() => {
    if (session.status !== 'running' || !timeLeftSeconds || timeLeftSeconds <= 0) return
    const timer = window.setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev === null) return prev
        return prev > 0 ? prev - 1 : 0
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [session.status, timeLeftSeconds])

  const finalizeRound = useCallback(async (reason: 'submitted' | 'timeout') => {
    if (!currentAsset || participantSides.length !== 2 || finalizingRoundRef.current) return
    finalizingRoundRef.current = true
    setRoundSubmitting(true)
    try {
      const [leftSide, rightSide] = participantSides
      const leftAnswer = roundAnswers[leftSide.id] || createDefaultSideAnswer(currentAsset)
      const rightAnswer = roundAnswers[rightSide.id] || createDefaultSideAnswer(currentAsset)
      const leftResult = evaluateSideAnswer(currentAsset, leftAnswer)
      const rightResult = evaluateSideAnswer(currentAsset, rightAnswer)
      const fallbackElapsed = Math.max(0, Date.now() - roundStartedAtRef.current)
      const leftElapsedMs = sideSubmitState[leftSide.id]?.submitted ? sideSubmitState[leftSide.id].elapsedMs : fallbackElapsed
      const rightElapsedMs = sideSubmitState[rightSide.id]?.submitted ? sideSubmitState[rightSide.id].elapsedMs : fallbackElapsed
      const winnerSideId = resolveRoundWinner(leftSide, rightSide, leftResult, rightResult, leftElapsedMs, rightElapsedMs)
      const { scoreboard } = updateScoreboardForRound(session.scoreboard || [], participantSides, leftResult, rightResult, leftElapsedMs, rightElapsedMs)
      const nextSession = await bigscreenActivityService.submitRoundResult(session.id, {
        round_number: session.current_round,
        scoreboard,
        winner_side_id: winnerSideId,
        round_summary: {
          reason,
          asset_title: currentAsset.title,
          asset_type: currentAsset.content_type,
          left: { side_id: leftSide.id, correct: leftResult.correct, total: leftResult.total, elapsed_ms: leftElapsedMs },
          right: { side_id: rightSide.id, correct: rightResult.correct, total: rightResult.total, elapsed_ms: rightElapsedMs },
        },
      })
      setSession(nextSession)
    } catch (error) {
      console.error(error)
      alert(t('bigscreenActivities.messages.saveFailed'))
      finalizingRoundRef.current = false
    } finally {
      setRoundSubmitting(false)
    }
  }, [currentAsset, participantSides, roundAnswers, session, sideSubmitState, t])

  useEffect(() => {
    if (session.status !== 'running' || timeLeftSeconds !== 0) return
    void finalizeRound('timeout')
  }, [finalizeRound, session.status, timeLeftSeconds])

  const handleControl = async (action: 'start' | 'pause' | 'resume' | 'end' | 'cancel') => {
    setActionLoading(true)
    try {
      const nextSession = await bigscreenActivityService.controlSession(session.id, action)
      setSession(nextSession)
      if (action === 'start' || action === 'resume') {
        roundStartedAtRef.current = Date.now()
      }
    } catch (error) {
      console.error(error)
      alert(t('bigscreenActivities.messages.loadFailed'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitSide = async (sideId: string) => {
    if (session.status !== 'running' || !currentAsset || roundSubmitting) return
    const elapsedMs = Math.max(0, Date.now() - roundStartedAtRef.current)
    const nextState = {
      ...sideSubmitState,
      [sideId]: { submitted: true, elapsedMs },
    }
    setSideSubmitState(nextState)
    if (participantSides.every((side) => nextState[side.id]?.submitted)) {
      await finalizeRound('submitted')
    }
  }

  const winnerLabel = useMemo(() => {
    const winnerSideId = (session.result_summary?.winner_side_id as string | undefined) || session.lead_side_id || null
    if (!winnerSideId) return t('bigscreenActivities.run.draw')
    return participantSides.find((side) => side.id === winnerSideId)?.label || t('bigscreenActivities.run.draw')
  }, [participantSides, session.lead_side_id, session.result_summary, t])

  return (
    <div className="min-h-screen bg-[#070b12] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col px-6 py-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-950/70 px-6 py-5 shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('bigscreenActivities.title')}</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">{session.activity_pack?.title || t('bigscreenActivities.title')}</h1>
              <p className="mt-2 text-sm text-slate-400">
                {t('bigscreenActivities.run.round').replace('{{round}}', String(session.current_round)).replace('{{total}}', String(totalRounds))}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => navigate('/teacher/whiteboard')} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
                {t('bigscreenActivities.run.back')}
              </button>
              {session.status === 'pending' && (
                <button onClick={() => void handleControl('start')} disabled={actionLoading} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50">
                  {t('bigscreenActivities.run.start')}
                </button>
              )}
              {session.status === 'running' && (
                <>
                  <button onClick={() => void handleControl('pause')} disabled={actionLoading} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50">
                    {t('bigscreenActivities.run.pause')}
                  </button>
                  <button onClick={() => void handleControl('end')} disabled={actionLoading} className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400 disabled:opacity-50">
                    {t('bigscreenActivities.run.end')}
                  </button>
                </>
              )}
              {session.status === 'paused' && (
                <>
                  <button onClick={() => void handleControl('resume')} disabled={actionLoading} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50">
                    {t('bigscreenActivities.run.resume')}
                  </button>
                  <button onClick={() => void handleControl('cancel')} disabled={actionLoading} className="rounded-2xl border border-rose-500/40 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-50">
                    {t('bigscreenActivities.run.cancel')}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr,1fr]">
            <div className="grid gap-4 md:grid-cols-2">
              {participantSides.map((side) => {
                const entry = sortedScoreboard.find((item) => item.side_id === side.id)
                return (
                  <div key={side.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: side.display_color || '#60a5fa' }} />
                        <div>
                          <div className="text-lg font-semibold text-white">{side.label}</div>
                          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{side.type}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-400">{t('bigscreenActivities.run.score')}</div>
                        <div className="text-2xl font-semibold text-white">{entry?.score ?? 0}</div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                        <div className="text-slate-500">{t('bigscreenActivities.run.roundWins')}</div>
                        <div className="mt-1 font-medium text-white">{entry?.round_wins ?? 0}</div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                        <div className="text-slate-500">{t('bigscreenActivities.run.completed')}</div>
                        <div className="mt-1 font-medium text-white">{entry?.completed_count ?? 0}</div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                        <div className="text-slate-500">{t('bigscreenActivities.run.time')}</div>
                        <div className="mt-1 font-medium text-white">{formatBigscreenDuration(entry?.total_time_ms)}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 text-center">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{t('bigscreenActivities.run.currentLeader')}</div>
                <div className="mt-3 text-lg font-semibold text-white">
                  {session.lead_side_id ? participantSides.find((side) => side.id === session.lead_side_id)?.label || '--' : '--'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 text-center">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{t('bigscreenActivities.run.time')}</div>
                <div className="mt-3 text-3xl font-semibold text-white">{timeLeftSeconds === null ? '--' : `${timeLeftSeconds}s`}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 text-center">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{t('bigscreenActivities.run.roundResult')}</div>
                <div className="mt-3 text-lg font-semibold text-white">
                  {latestRound?.winner_side_id ? participantSides.find((side) => side.id === latestRound.winner_side_id)?.label || '--' : t('bigscreenActivities.run.waiting')}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mt-6 flex-1">
          {currentAsset ? (
            <>
              <section className="rounded-3xl border border-slate-800 bg-slate-950/70 px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t(`bigscreenActivities.contentType.${currentAsset.content_type}`)}</div>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{currentAsset.title}</h2>
                    {getPromptText(currentAsset.payload).trim() ? (
                      <p className="mt-2 text-base text-slate-300">{getPromptText(currentAsset.payload)}</p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                    {actionLoading ? t('common.loading') : session.status === 'paused' ? t('bigscreenActivities.run.paused') : t('bigscreenActivities.run.waiting')}
                  </div>
                </div>
              </section>

              <section className="mt-6 grid flex-1 gap-6 xl:grid-cols-2">
                {participantSides.map((side) => {
                  const submitted = sideSubmitState[side.id]?.submitted
                  const disabled = session.status !== 'running' || roundSubmitting || submitted
                  const answer = roundAnswers[side.id] || createDefaultSideAnswer(currentAsset)
                  return (
                    <div key={side.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: side.display_color || '#60a5fa' }} />
                          <div>
                            <div className="text-xl font-semibold text-white">{side.label}</div>
                            <div className="text-sm text-slate-400">{submitted ? t('bigscreenActivities.run.submitted') : t('bigscreenActivities.run.waiting')}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => void handleSubmitSide(side.id)}
                          disabled={disabled}
                          className="rounded-2xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-50"
                        >
                          {submitted ? t('bigscreenActivities.run.submitted') : t('bigscreenActivities.run.submitSide')}
                        </button>
                      </div>
                      <div className="mt-5">
                        {renderRenderer(currentAsset, answer, disabled, (nextAnswer) => setRoundAnswers((prev) => ({ ...prev, [side.id]: nextAnswer })))}
                      </div>
                    </div>
                  )
                })}
              </section>
            </>
          ) : (
            <section className="rounded-3xl border border-slate-800 bg-slate-950/70 px-6 py-16 text-center text-slate-400">
              {t('bigscreenActivities.run.noAsset')}
            </section>
          )}

          {(session.status === 'ended' || session.status === 'cancelled') && (
            <section className="mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-6">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">{t('bigscreenActivities.run.result')}</div>
              <div className="mt-3 text-3xl font-semibold text-white">{winnerLabel}</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {sortedScoreboard.map((entry) => (
                  <div key={entry.side_id} className="rounded-2xl border border-emerald-500/20 bg-slate-950/40 px-4 py-4">
                    <div className="font-medium text-white">{entry.label}</div>
                    <div className="mt-2 text-sm text-slate-300">
                      {t('bigscreenActivities.run.score')}: {entry.score} / {t('bigscreenActivities.run.roundWins')}: {entry.round_wins} / {t('bigscreenActivities.run.time')}: {formatBigscreenDuration(entry.total_time_ms)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
