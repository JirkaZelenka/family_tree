const YEAR_RE = /^(-?\d{1,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/

export function parseYear(dateStr: string | undefined): number | null {
  if (!dateStr) return null
  const match = dateStr.trim().match(YEAR_RE)
  if (!match) return null
  const year = parseInt(match[1], 10)
  return Number.isFinite(year) ? year : null
}

export function formatLifeSpan(
  birthYear: number | null,
  deathYear: number | null,
): string {
  const birth = birthYear ?? '?'
  const death = deathYear ?? '?'
  return `${birth} – ${death}`
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
