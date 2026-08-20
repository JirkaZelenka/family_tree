export type Theme = 'light' | 'dark'
export type Appearance = 'heritage' | 'modern'

const THEME_KEY = 'family-tree-theme'
const APPEARANCE_KEY = 'family-tree-appearance'

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

export function getStoredAppearance(): Appearance {
  const stored = localStorage.getItem(APPEARANCE_KEY)
  if (stored === 'modern' || stored === 'heritage') return stored
  return 'heritage'
}

export function applyDisplayMode(theme: Theme, appearance: Appearance) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('heritage', appearance === 'heritage')
}

export function persistTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme)
}

export function persistAppearance(appearance: Appearance) {
  localStorage.setItem(APPEARANCE_KEY, appearance)
}

export function initTheme() {
  applyDisplayMode(getStoredTheme(), getStoredAppearance())
}
