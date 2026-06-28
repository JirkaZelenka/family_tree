import { describe, it, expect } from 'vitest'
import { parseYear, isAliveAtYear, radiusFromBirthYear } from '@/lib/time/dates'

describe('dates', () => {
  it('parses years', () => {
    expect(parseYear('1850-03-15')).toBe(1850)
    expect(parseYear('1850')).toBe(1850)
    expect(parseYear(undefined)).toBeNull()
  })

  it('checks alive at year', () => {
    expect(isAliveAtYear(1850, 1920, 1900)).toBe(true)
    expect(isAliveAtYear(1850, 1920, 1930)).toBe(false)
  })

  it('computes radius from birth year', () => {
    const r = radiusFromBirthYear(1850, 1800, 1900)
    expect(r).toBeGreaterThan(0.3)
    expect(r).toBeLessThan(1)
  })
})
