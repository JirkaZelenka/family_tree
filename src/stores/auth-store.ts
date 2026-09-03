import { create } from 'zustand'
import { fetchMe, loginRequest, logoutRequest } from '@/auth/api'
import type { AuthUser } from '@/auth/roles'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  error: string | null
  hydrate: () => Promise<void>
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,
  error: null,
  hydrate: async () => {
    set({ status: 'loading', error: null })
    try {
      const user = await fetchMe()
      set({
        status: user ? 'authenticated' : 'unauthenticated',
        user,
      })
    } catch {
      set({ status: 'unauthenticated', user: null, error: null })
    }
  },
  login: async (username, password) => {
    set({ error: null })
    try {
      const result = await loginRequest(username, password)
      if (!result.ok) {
        set({ error: result.error, status: 'unauthenticated', user: null })
        return false
      }
      set({ status: 'authenticated', user: result.user, error: null })
      return true
    } catch {
      set({ error: 'Přihlášení se nezdařilo.', status: 'unauthenticated', user: null })
      return false
    }
  },
  logout: async () => {
    try {
      await logoutRequest()
    } finally {
      set({ status: 'unauthenticated', user: null, error: null })
    }
  },
}))
