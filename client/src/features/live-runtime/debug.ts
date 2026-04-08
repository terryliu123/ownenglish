const DEBUG_LIVE_KEY = 'debug_live'

export function isLiveDebugEnabled() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(DEBUG_LIVE_KEY) === '1'
  } catch {
    return false
  }
}

export function debugLive(scope: string, ...args: unknown[]) {
  if (!isLiveDebugEnabled()) return
  console.log(`[debug_live:${scope}]`, ...args)
}
