import type {
  BigscreenContentAsset,
  BigscreenParticipantSide,
  BigscreenScoreEntry,
} from '../../services/api'

export type BigscreenSideAnswer =
  | { type: 'matching'; answers: Record<string, string> }
  | { type: 'sorting'; order: string[] }
  | { type: 'classification'; assignments: Record<string, string> }

export function createDefaultSideAnswer(asset: BigscreenContentAsset): BigscreenSideAnswer {
  if (asset.content_type === 'matching') {
    return { type: 'matching', answers: {} }
  }
  if (asset.content_type === 'sorting') {
    const items = Array.isArray((asset.payload as any)?.items) ? (asset.payload as any).items : []
    return { type: 'sorting', order: items.map((item: any) => String(item.id)) }
  }
  return { type: 'classification', assignments: {} }
}

export function evaluateSideAnswer(asset: BigscreenContentAsset, answer: BigscreenSideAnswer) {
  if (asset.content_type === 'matching' && answer.type === 'matching') {
    const pairs = Array.isArray((asset.payload as any)?.pairs) ? (asset.payload as any).pairs : []
    const total = pairs.length
    const correct = pairs.reduce((count: number, pair: any) => {
      const left = String(pair?.left ?? '')
      const right = String(pair?.right ?? '')
      return count + (answer.answers[left] === right ? 1 : 0)
    }, 0)
    return { correct, total, isPerfect: total > 0 && correct === total }
  }

  if (asset.content_type === 'sorting' && answer.type === 'sorting') {
    const items = Array.isArray((asset.payload as any)?.items) ? (asset.payload as any).items : []
    const expected = items.map((item: any) => String(item.id))
    const total = expected.length
    const correct = expected.reduce((count: number, itemId: string, index: number) => count + (answer.order[index] === itemId ? 1 : 0), 0)
    return { correct, total, isPerfect: total > 0 && correct === total }
  }

  if (asset.content_type === 'classification' && answer.type === 'classification') {
    const items = Array.isArray((asset.payload as any)?.items) ? (asset.payload as any).items : []
    const total = items.length
    const correct = items.reduce((count: number, item: any) => {
      const itemId = String(item?.id ?? '')
      const categoryKey = String(item?.category_key ?? '')
      return count + (answer.assignments[itemId] === categoryKey ? 1 : 0)
    }, 0)
    return { correct, total, isPerfect: total > 0 && correct === total }
  }

  return { correct: 0, total: 0, isPerfect: false }
}

export function resolveRoundWinner(
  leftSide: BigscreenParticipantSide,
  rightSide: BigscreenParticipantSide,
  leftResult: { correct: number; total: number },
  rightResult: { correct: number; total: number },
  leftElapsedMs: number,
  rightElapsedMs: number,
) {
  if (leftResult.correct > rightResult.correct) return leftSide.id
  if (rightResult.correct > leftResult.correct) return rightSide.id
  if (leftElapsedMs < rightElapsedMs) return leftSide.id
  if (rightElapsedMs < leftElapsedMs) return rightSide.id
  return null
}

export function updateScoreboardForRound(
  scoreboard: BigscreenScoreEntry[],
  sides: BigscreenParticipantSide[],
  leftResult: { correct: number; total: number },
  rightResult: { correct: number; total: number },
  leftElapsedMs: number,
  rightElapsedMs: number,
) {
  const [leftSide, rightSide] = sides
  const winnerSideId = resolveRoundWinner(leftSide, rightSide, leftResult, rightResult, leftElapsedMs, rightElapsedMs)

  const next = scoreboard.map((entry) => {
    if (entry.side_id === leftSide.id) {
      return {
        ...entry,
        score: entry.score + leftResult.correct,
        completed_count: entry.completed_count + leftResult.total,
        total_time_ms: entry.total_time_ms + leftElapsedMs,
        round_wins: entry.round_wins + (winnerSideId === leftSide.id ? 1 : 0),
      }
    }
    if (entry.side_id === rightSide.id) {
      return {
        ...entry,
        score: entry.score + rightResult.correct,
        completed_count: entry.completed_count + rightResult.total,
        total_time_ms: entry.total_time_ms + rightElapsedMs,
        round_wins: entry.round_wins + (winnerSideId === rightSide.id ? 1 : 0),
      }
    }
    return entry
  })

  return { scoreboard: next, winnerSideId }
}

export function sortScoreboard(scoreboard: BigscreenScoreEntry[]) {
  return [...scoreboard].sort((a, b) => {
    if (b.round_wins !== a.round_wins) return b.round_wins - a.round_wins
    if (b.score !== a.score) return b.score - a.score
    return a.total_time_ms - b.total_time_ms
  })
}

export function formatBigscreenDuration(totalTimeMs: number | null | undefined) {
  if (!totalTimeMs || totalTimeMs <= 0) return '--'
  const totalSeconds = totalTimeMs / 1000
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds.toFixed(1)}s`
}
