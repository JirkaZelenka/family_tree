import { describe, it, expect } from 'vitest'
import { parseColorInput, colorInputToDisplay } from '@/lib/vault/color-input'

describe('parseColorInput', () => {
  it('parses 6-digit hex', () => {
    expect(parseColorInput('#4ade80')).toBe('#4ade80')
    expect(parseColorInput('4ade80')).toBe('#4ade80')
  })

  it('parses 3-digit hex', () => {
    expect(parseColorInput('#f0a')).toBe('#ff00aa')
  })

  it('parses rgb()', () => {
    expect(parseColorInput('rgb(74, 222, 128)')).toBe('#4ade80')
  })

  it('parses comma-separated rgb values', () => {
    expect(parseColorInput('74, 222, 128')).toBe('#4ade80')
  })

  it('rejects invalid input', () => {
    expect(parseColorInput('not-a-color')).toBeNull()
    expect(parseColorInput('999, 1000, 0')).toBeNull()
  })

  it('formats hex to rgb display', () => {
    expect(colorInputToDisplay('#4ade80')).toBe('rgb(74, 222, 128)')
  })
})
