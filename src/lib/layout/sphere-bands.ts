export const BIRTH_BAND_ANCHOR = 2000
export const BIRTH_BAND_SIZE = 20

export function getBirthBandIndex(birthYear: number | null): number {
  if (birthYear === null) return 0
  if (birthYear >= BIRTH_BAND_ANCHOR) return 0
  return Math.floor((BIRTH_BAND_ANCHOR - birthYear) / BIRTH_BAND_SIZE) + 1
}

export function getBirthBandLabel(birthYear: number | null): string {
  if (birthYear === null) return '?'
  if (birthYear >= BIRTH_BAND_ANCHOR) return '2000+'
  const idx = getBirthBandIndex(birthYear)
  const end = BIRTH_BAND_ANCHOR - (idx - 1) * BIRTH_BAND_SIZE - 1
  const start = end - BIRTH_BAND_SIZE + 1
  return `${start}–${end}`
}

export function computeBandCount(birthYears: (number | null)[]): number {
  let maxIdx = 0
  for (const y of birthYears) {
    if (y === null) continue
    maxIdx = Math.max(maxIdx, getBirthBandIndex(y))
  }
  return maxIdx + 1
}

export function radiusForBirthYear(
  birthYear: number | null,
  minYear: number,
  maxYear: number,
  rInner: number,
  rOuter: number,
): number {
  if (birthYear === null) return rOuter
  const span = Math.max(maxYear - minYear, 1)
  const t = (maxYear - birthYear) / span
  return rInner + t * (rOuter - rInner)
}

/** Kruhy pásma po 20 letech – lineárně podle roku v datech. */
export function yearBandShellRadii(
  minYear: number,
  maxYear: number,
  rInner: number,
  rOuter: number,
): number[] {
  const radii = new Set<number>([rInner])
  const start = Math.floor(minYear / BIRTH_BAND_SIZE) * BIRTH_BAND_SIZE
  for (let y = start; y <= maxYear; y += BIRTH_BAND_SIZE) {
    radii.add(radiusForBirthYear(y, minYear, maxYear, rInner, rOuter))
  }
  radii.add(radiusForBirthYear(maxYear, minYear, maxYear, rInner, rOuter))
  radii.add(rOuter)
  return [...radii].sort((a, b) => a - b)
}

export function radiusForBirthBand(
  birthYear: number | null,
  bandCount: number,
  rInner: number,
  rOuter: number,
): number {
  const count = Math.max(bandCount, 1)
  const idx =
    birthYear === null
      ? count - 1
      : Math.min(getBirthBandIndex(birthYear), count - 1)
  const step = (rOuter - rInner) / count
  return rInner + step * (idx + 0.5)
}

export function bandShellRadii(
  bandCount: number,
  rInner: number,
  rOuter: number,
): number[] {
  const count = Math.max(bandCount, 1)
  const step = (rOuter - rInner) / count
  return Array.from({ length: count + 1 }, (_, i) => rInner + step * i)
}

/** Střídání světlejší / tmavší odstín barvy rodu v pásmu – zachová živost. */
export function shadeLineageColor(hex: string, bandIndex: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  let r = (n >> 16) & 255
  let g = (n >> 8) & 255
  let b = n & 255
  const factor = bandIndex % 2 === 0 ? 1.08 : 0.88
  r = Math.min(255, Math.round(r * factor))
  g = Math.min(255, Math.round(g * factor))
  b = Math.min(255, Math.round(b * factor))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
