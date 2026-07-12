import { describe, it, expect } from 'vitest'
import {
  parseYear,
  isAliveAtYear,
  isBornByYear,
  radiusFromBirthYear,
  isUncertainDate,
  dateDisplayText,
  lifeSpanSegments,
  dateFieldSegments,
  relativeYearSpanSegments,
} from '@/lib/time/dates'

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

  it('parses uncertain dates with leading ?', () => {
    expect(parseYear('?1925')).toBe(1925)
    expect(parseYear('?1.2.1690')).toBe(1690)
    expect(isUncertainDate('?1925')).toBe(true)
    expect(isUncertainDate('1925')).toBe(false)
    expect(dateDisplayText('?1.2.1690')).toBe('1.2.1690')
    expect(dateDisplayText('?1925')).toBe('1925')
  })

  it('builds life span segments with uncertainty', () => {
    expect(
      lifeSpanSegments('?1925', '1940', 1925, 1940).map((s) => ({
        ...s,
      })),
    ).toEqual([
      { text: '1925', uncertain: true },
      { text: ' – ', uncertain: false },
      { text: '1940', uncertain: false },
    ])
    expect(dateFieldSegments('?1.2.1690')).toEqual([
      { text: '1.2.1690', uncertain: true },
    ])
  })

  it('relative year span omits unknown death', () => {
    expect(relativeYearSpanSegments('', '', 1925, null)).toEqual([
      { text: '1925', uncertain: false },
    ])
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
