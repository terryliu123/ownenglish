import axios from 'axios'

export function readJwtExp(token: string | null): number | null {
  if (!token) return null
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(window.atob(normalized))
    return typeof decoded.exp === 'number' ? decoded.exp : null
  } catch {
    return null
  }
}

export async function getFreshAccessToken(
  fallbackToken?: string | null,
  onTokenUpdated?: (accessToken: string, refreshToken?: string | null) => void,
): Promise<string | null> {
  const currentToken = localStorage.getItem('token') || fallbackToken || null
  if (!currentToken) {
    return null
  }

  const exp = readJwtExp(currentToken)
  const now = Math.floor(Date.now() / 1000)
  const isExpired = exp !== null && exp <= now
  const shouldRefresh = exp !== null && exp - now <= 60

  if (!shouldRefresh) {
    return currentToken
  }

  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    return isExpired ? null : currentToken
  }

  try {
    const response = await axios.post('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    })
    const accessToken = response.data?.access_token as string | undefined
    const nextRefreshToken = response.data?.refresh_token as string | undefined
    if (!accessToken) {
      return isExpired ? null : currentToken
    }

    localStorage.setItem('token', accessToken)
    if (nextRefreshToken) {
      localStorage.setItem('refresh_token', nextRefreshToken)
    }
    onTokenUpdated?.(accessToken, nextRefreshToken)
    return accessToken
  } catch {
    return isExpired ? null : currentToken
  }
}

export function buildLiveWsUrl(classId: string, token: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host}/api/v1/live/ws?token=${encodeURIComponent(token)}&class_id=${encodeURIComponent(classId)}`
}
