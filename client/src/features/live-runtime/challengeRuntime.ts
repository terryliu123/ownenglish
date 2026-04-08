import type {
  LiveChallengeScoreEntry,
  LiveChallengeSession,
  RoomInfo,
  RoomState,
} from '../../services/websocket'

export function normalizeChallengePayload(data: Record<string, unknown>) {
  const challenge = ((data.challenge as LiveChallengeSession | undefined) || {}) as LiveChallengeSession
  return {
    ...challenge,
    participant_ids:
      (data.participant_ids as string[] | undefined)
      ?? challenge.participant_ids
      ?? [],
    current_round:
      (data.current_round as number | undefined)
      ?? challenge.current_round,
    current_task_id:
      (data.current_task_id as string | null | undefined)
      ?? challenge.current_task_id,
    round_status:
      (data.round_status as string | undefined)
      ?? challenge.round_status,
    winner_student_id:
      (data.winner_student_id as string | null | undefined)
      ?? challenge.winner_student_id,
    lead_student_id:
      (data.lead_student_id as string | null | undefined)
      ?? challenge.lead_student_id,
    scoreboard:
      (data.scoreboard as LiveChallengeScoreEntry[] | undefined)
      ?? challenge.scoreboard
      ?? [],
    status:
      (data.status as string | undefined)
      ?? challenge.status,
    is_participant:
      (data.is_participant as boolean | undefined)
      ?? (challenge as LiveChallengeSession & { is_participant?: boolean }).is_participant,
  } as LiveChallengeSession
}

export function normalizeRoomInfoPayload(data: Record<string, unknown>) {
  const roomInfo = (data.room_info as RoomInfo | undefined) ?? (data as unknown as RoomInfo)
  const roomState = roomInfo.room_state

  if (!roomState) {
    return roomInfo
  }

  return {
    ...roomInfo,
    room_state: {
      ...roomState,
      current_challenge: roomState.current_challenge
        ? normalizeChallengePayload({
            challenge: roomState.current_challenge as unknown as Record<string, unknown>,
          })
        : roomState.current_challenge,
    } as RoomState,
  } as RoomInfo
}

export function isChallengeFinished(challenge: LiveChallengeSession | null | undefined) {
  return challenge?.status === 'ended' || challenge?.status === 'cancelled'
}

export function getChallengeEntryForStudent(
  challenge: LiveChallengeSession | null | undefined,
  studentId?: string | null,
) {
  if (!challenge || !studentId || !Array.isArray(challenge.scoreboard)) {
    return null
  }
  return challenge.scoreboard.find((entry) => entry.student_id === studentId) ?? null
}

export function isChallengeParticipant(
  challenge: LiveChallengeSession | null | undefined,
  studentId?: string | null,
) {
  if (!challenge || !studentId) return false
  if (typeof challenge.is_participant === 'boolean') {
    return challenge.is_participant
  }
  if (Array.isArray(challenge.participant_ids) && challenge.participant_ids.includes(studentId)) {
    return true
  }
  return Boolean(getChallengeEntryForStudent(challenge, studentId))
}

export function hasChallengeEntryActivity(entry: {
  submitted?: boolean
  answered_count?: number
  correct_count?: number
  total_time_ms?: number | null
}) {
  return Boolean(
    entry.submitted
      || (entry.answered_count ?? 0) > 0
      || (entry.correct_count ?? 0) > 0
      || (entry.total_time_ms ?? 0) > 0,
  )
}

export function hasChallengeEntryFinalSubmission(entry: {
  submitted?: boolean
  locked?: boolean
  eliminated_for_round?: boolean
}) {
  return Boolean(entry.submitted || entry.locked || entry.eliminated_for_round)
}

export function sortChallengeScoreboardEntries(
  scoreboard: LiveChallengeScoreEntry[] | undefined,
) {
  return [...(scoreboard ?? [])].sort((left, right) => {
    const leftRank = left.rank ?? Number.MAX_SAFE_INTEGER
    const rightRank = right.rank ?? Number.MAX_SAFE_INTEGER
    if (leftRank !== rightRank) return leftRank - rightRank

    const correctDiff = (right.correct_count ?? 0) - (left.correct_count ?? 0)
    if (correctDiff !== 0) return correctDiff

    return (left.total_time_ms ?? Number.MAX_SAFE_INTEGER) - (right.total_time_ms ?? Number.MAX_SAFE_INTEGER)
  })
}

export function getChallengeLeader(challenge: LiveChallengeSession | null | undefined) {
  const ranked = sortChallengeScoreboardEntries(challenge?.scoreboard)
  if (challenge?.lead_student_id) {
    return ranked.find((entry) => entry.student_id === challenge.lead_student_id) ?? null
  }
  if (ranked.length < 2) return ranked[0] ?? null
  const [first, second] = ranked
  const firstCorrect = first.correct_count ?? 0
  const secondCorrect = second.correct_count ?? 0
  if (firstCorrect !== secondCorrect) {
    return first
  }

  const firstTime = first.total_time_ms ?? Number.MAX_SAFE_INTEGER
  const secondTime = second.total_time_ms ?? Number.MAX_SAFE_INTEGER
  if (firstTime !== secondTime) {
    return first
  }

  if (!hasChallengeEntryActivity(first) && !hasChallengeEntryActivity(second)) {
    return null
  }
  return null
}

export function getSingleQuestionWinnerEntry(challenge: LiveChallengeSession | null | undefined) {
  if (!challenge?.scoreboard?.length) return null
  return (
    challenge.scoreboard.find((entry) => entry.student_id === challenge.winner_student_id)
    || challenge.scoreboard.find((entry) => Boolean(entry.first_correct_at))
    || null
  )
}
