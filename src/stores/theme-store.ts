import { create } from 'zustand'
import {
  applyDisplayMode,
  getStoredAppearance,
  getStoredTheme,
  persistAppearance,
  persistTheme,
  type Appearance,
  type Theme,
} from '@/lib/theme'

interface ThemeState {
  theme: Theme
  appearance: Appearance
  setTheme: (theme: Theme) => void
  setAppearance: (appearance: Appearance) => void
  toggleTheme: () => void
  toggleAppearance: () => void
}

function apply(theme: Theme, appearance: Appearance) {
  applyDisplayMode(theme, appearance)
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getStoredTheme(),
  appearance: getStoredAppearance(),
  setTheme: (theme) => {
    persistTheme(theme)
    apply(theme, get().appearance)
    set({ theme })
  },
  setAppearance: (appearance) => {
    persistAppearance(appearance)
    apply(get().theme, appearance)
    set({ appearance })
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
  toggleAppearance: () => {
    const next = get().appearance === 'heritage' ? 'modern' : 'heritage'
    get().setAppearance(next)
  },
}))
