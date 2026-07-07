const ISO_YEAR_RE = /^(-?\d{1,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/
const DOT_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(-?\d{1,4})$/

export function parseYear(date: string | number | undefined | null): number | null {
  if (date === undefined || date === null) return null
  if (typeof date === 'number') {
    return Number.isFinite(date) ? Math.trunc(date) : null
  }
  const trimmed = date.trim()
  if (!trimmed) return null

  const dotMatch = trimmed.match(DOT_DATE_RE)
  if (dotMatch) {
    const year = parseInt(dotMatch[3], 10)
    return Number.isFinite(year) ? year : null
  }

  const isoMatch = trimmed.match(ISO_YEAR_RE)
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10)
    return Number.isFinite(year) ? year : null
  }

  return null
}

export function formatLifeSpan(
  birthYear: number | null,
  deathYear: number | null,
): string {
  const birth = birthYear ?? '?'
  const death = deathYear ?? '?'
  return `${birth} – ${death}`
}

export function isBornByYear(birthYear: number | null, year: number): boolean {
  if (birthYear === null) return true
  return birthYear <= year
}

export function isAliveAtYear(
  birthYear: number | null,
  deathYear: number | null,
  year: number,
): boolean {
  const birth = birthYear ?? -Infinity
  const death = deathYear ?? Infinity
  return birth <= year && year <= death
}

export function lifeSpanOverlap(
  aBirth: number | null,
  aDeath: number | null,
  bBirth: number | null,
  bDeath: number | null,
): boolean {
  const aStart = aBirth ?? -Infinity
  const aEnd = aDeath ?? Infinity
  const bStart = bBirth ?? -Infinity
  const bEnd = bDeath ?? Infinity
  return aStart <= bEnd && bStart <= aEnd
}

export function getYearRange(
  birthYears: (number | null)[],
  deathYears: (number | null)[],
): { min: number; max: number } {
  const years = [
    ...birthYears.filter((y): y is number => y !== null),
    ...deathYears.filter((y): y is number => y !== null),
  ]
  if (years.length === 0) return { min: 1800, max: new Date().getFullYear() }
  return { min: Math.min(...years), max: Math.max(...years, new Date().getFullYear()) }
}

export function radiusFromBirthYear(
  birthYear: number | null,
  minYear: number,
  maxYear: number,
  rMin = 0.35,
  rMax = 0.95,
): number {
  if (birthYear === null) return rMax
  const span = maxYear - minYear || 1
  const t = (birthYear - minYear) / span
  return rMin + (1 - Math.max(0, Math.min(1, t))) * (rMax - rMin)
}
