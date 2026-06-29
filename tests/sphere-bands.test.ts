import { describe, expect, it } from 'vitest'
import {
  BIRTH_BAND_ANCHOR,
  getBirthBandIndex,
  getBirthBandLabel,
  radiusForBirthYear,
  shadeLineageColor,
  bandShellRadii,
} from '@/lib/layout/sphere-bands'

describe('birth bands', () => {
  it('assigns 2000+ to inner band', () => {
    expect(getBirthBandIndex(2000)).toBe(0)
    expect(getBirthBandIndex(2015)).toBe(0)
    expect(getBirthBandLabel(2010)).toBe('2000+')
  })

  it('steps outward in 20-year bands', () => {
    expect(getBirthBandIndex(1999)).toBe(1)
    expect(getBirthBandLabel(1990)).toBe('1980–1999')
    expect(getBirthBandIndex(1975)).toBe(2)
    expect(getBirthBandLabel(1970)).toBe('1960–1979')
  })

  it('maps equal year gaps to equal radial distance', () => {
    const rInner = 0.14
    const rOuter = 1
    const r1993 = radiusForBirthYear(1993, 1933, 1993, rInner, rOuter)
    const r1963 = radiusForBirthYear(1963, 1933, 1993, rInner, rOuter)
    const r1933 = radiusForBirthYear(1933, 1933, 1993, rInner, rOuter)
    expect(r1993 - r1963).toBeCloseTo(r1963 - r1933, 5)
  })

  it('maps younger years closer to center', () => {
    const r1993 = radiusForBirthYear(1993, 1933, 1993, 0.14, 1)
    const r1963 = radiusForBirthYear(1963, 1933, 1993, 0.14, 1)
    const r1933 = radiusForBirthYear(1933, 1933, 1993, 0.14, 1)
    expect(r1993).toBeLessThan(r1963)
    expect(r1963).toBeLessThan(r1933)
  })

  it('produces shell radii from core to outer', () => {
    const shells = bandShellRadii(3, 0.14, 1)
    expect(shells[0]).toBeCloseTo(0.14)
    expect(shells[shells.length - 1]).toBeCloseTo(1)
    expect(shells.length).toBe(4)
  })

  it('alternates shade by band index', () => {
    const base = '#4488cc'
    const even = shadeLineageColor(base, 0)
    const odd = shadeLineageColor(base, 1)
    expect(even).not.toBe(odd)
  })

  it('uses anchor year 2000', () => {
    expect(BIRTH_BAND_ANCHOR).toBe(2000)
  })
})
