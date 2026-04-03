import { create } from 'zustand'
import { useEffect } from 'react'
import { authService } from '../services/api'
import type { MembershipSnapshot } from '../services/api'

interface AppState {
  user: User | null
  token: string | null
  role: 'teacher' | 'student' | null
  isGuest: boolean
  expiresAt: string | null  // ISO timestamp

  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  logout: () => void
}

interface User {
  id: string
  email?: string
  name: string
  role: 'teacher' | 'student' | 'TEACHER' | 'STUDENT'
  is_guest?: boolean
  membership?: MembershipSnapshot | null
}

function normalizeRole(role?: string | null): 'teacher' | 'student' | null {
  if (!role) {
    return null
  }

  const normalized = role.toLowerCase()
  if (normalized === 'teacher' || normalized === 'student') {
    return normalized
  }

  return null
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: null,
  role: null,
  isGuest: false,
  expiresAt: null,

  setUser: (user) => {
    const normalizedRole = normalizeRole(user?.role)
    set({
      user: user ? { ...user, role: normalizedRole || 'student' } : null,
      role: normalizedRole,
      isGuest: user?.is_guest || false,
    })
  },
  setToken: (token) => set({ token }),
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('guest_expires_at')
    localStorage.removeItem('was_guest')
    set({ user: null, token: null, role: null, isGuest: false, expiresAt: null })
  },
}))

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const token = useAppStore((state) => state.token)
  const userId = useAppStore((state) => state.user?.id)

  // Check for stored token on mount and fetch user info
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        useAppStore.getState().setToken(token)
        // Fetch user info
        try {
          const response = await fetch('/api/v1/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (response.ok) {
            const user = await response.json()
            useAppStore.getState().setUser(user)
            const expiresAt = localStorage.getItem('guest_expires_at')
            if (expiresAt) {
              useAppStore.setState({ expiresAt })
            }
          } else {
            // Token invalid, clear it
            localStorage.removeItem('token')
            localStorage.removeItem('guest_expires_at')
            useAppStore.getState().logout()
          }
        } catch (error) {
          console.error('Failed to fetch user:', error)
        }
      }
    }
    initAuth()
  }, [])

  useEffect(() => {
    if (!token || !userId) {
      return
    }

    let cancelled = false

    const sendHeartbeat = async () => {
      if (cancelled) {
        return
      }
      try {
        await authService.heartbeat()
      } catch (error) {
        console.error('Failed to refresh presence heartbeat:', error)
      }
    }

    void sendHeartbeat()
    const intervalId = window.setInterval(() => {
      void sendHeartbeat()
    }, 30000)

    const handleFocus = () => {
      void sendHeartbeat()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void sendHeartbeat()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [token, userId])

  return <>{children}</>
}
