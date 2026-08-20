import { afterEach, describe, expect, it } from 'vitest'
import {
  applyDisplayMode,
  getStoredAppearance,
  getStoredTheme,
  persistAppearance,
  persistTheme,
} from '@/lib/theme'

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark', 'heritage')
})

describe('display modes', () => {
  it('defaults to dark heritage so the parchment theme stays the starting look', () => {
    expect(getStoredTheme()).toBe('dark')
    expect(getStoredAppearance()).toBe('heritage')
  })

  it('restores previously stored axes independently', () => {
    persistTheme('light')
    persistAppearance('modern')
    expect(getStoredTheme()).toBe('light')
    expect(getStoredAppearance()).toBe('modern')
  })

  it('applies modern light as a clean white document', () => {
    applyDisplayMode('light', 'modern')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('heritage')).toBe(false)
  })

  it('applies modern dark as a clean black document', () => {
    applyDisplayMode('dark', 'modern')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('heritage')).toBe(false)
  })

  it('keeps parchment washes in heritage light and dark', () => {
    applyDisplayMode('light', 'heritage')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('heritage')).toBe(true)

    applyDisplayMode('dark', 'heritage')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('heritage')).toBe(true)
  })
})
