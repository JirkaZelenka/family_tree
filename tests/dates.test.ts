import { describe, it, expect } from 'vitest'
import { parseYear, isAliveAtYear, isBornByYear, radiusFromBirthYear } from '@/lib/time/dates'

describe('dates', () => {
  it('parses years', () => {
    expect(parseYear('1850-03-15')).toBe(1850)
    expect(parseYear('1850')).toBe(1850)
    expect(parseYear('1993')).toBe(1993)
    expect(parseYear(1993)).toBe(1993)
    expect(parseYear('14.2.1968')).toBe(1968)
    expect(parseYear('4.6.1993')).toBe(1993)
    expect(parseYear('04.06.1993')).toBe(1993)
    expect(parseYear(undefined)).toBeNull()
    expect(parseYear(null)).toBeNull()
    expect(parseYear('')).toBeNull()
    expect(parseYear('14.2')).toBeNull()
  })

  it('checks alive at year', () => {
    expect(isAliveAtYear(1850, 1920, 1900)).toBe(true)
    expect(isAliveAtYear(1850, 1920, 1930)).toBe(false)
  })

  it('checks born by year', () => {
    expect(isBornByYear(1944, 1932)).toBe(false)
    expect(isBornByYear(1944, 1944)).toBe(true)
    expect(isBornByYear(1944, 2025)).toBe(true)
    expect(isBornByYear(null, 1800)).toBe(true)
  })

  it('computes radius from birth year', () => {
    const r = radiusFromBirthYear(1850, 1800, 1900)
    expect(r).toBeGreaterThan(0.3)
    expect(r).toBeLessThan(1)
  })
})
