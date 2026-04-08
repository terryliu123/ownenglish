export function buildTeachingAidSessionAssetUrl(sessionId: string, relativePath: string | null | undefined) {
  if (!sessionId || !relativePath) return ''
  const normalized = String(relativePath).replace(/^\/+/, '')
  return `/api/v1/teaching-aids/session/${sessionId}/${normalized}`
}
