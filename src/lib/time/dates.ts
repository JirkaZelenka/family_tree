const ISO_YEAR_RE = /^(-?\d{1,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/
const DOT_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(-?\d{1,4})$/
const UNCERTAIN_PREFIX_RE = /^\?+/

export interface DateTextSegment {
  text: string
  uncertain: boolean
}

export function isUncertainDate(date: string | undefined | null): boolean {
  return Boolean(date?.trim().startsWith('?'))
}

/** Text pro zobrazení — bez úvodního otazníku. */
export function dateDisplayText(date: string | undefined | null): string {
  const trimmed = date?.trim() ?? ''
  if (!trimmed) return '?'
  return trimmed.replace(UNCERTAIN_PREFIX_RE, '')
}

function stripUncertainty(date: string): string {
  return date.trim().replace(UNCERTAIN_PREFIX_RE, '')
}

export function parseYear(date: string | number | undefined | null): number | null {
  if (date === undefined || date === null) return null
  if (typeof date === 'number') {
    return Number.isFinite(date) ? Math.trunc(date) : null
  }
  const trimmed = stripUncertainty(date)
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

export function dateFieldSegments(date: string | undefined | null): DateTextSegment[] {
  const trimmed = date?.trim() ?? ''
  if (!trimmed) return [{ text: '?', uncertain: false }]
  const uncertain = isUncertainDate(trimmed)
  return [{ text: dateDisplayText(trimmed), uncertain }]
}

function yearLabel(
  date: string | undefined,
  year: number | null,
): { text: string; uncertain: boolean } {
  const trimmed = date?.trim() ?? ''
  if (trimmed) {
    const uncertain = isUncertainDate(trimmed)
    const display = dateDisplayText(trimmed)
    if (/^\d{1,4}$/.test(display)) {
      return { text: display, uncertain }
    }
    const parsed = parseYear(trimmed)
    if (parsed !== null) {
      return { text: String(parsed), uncertain }
    }
    return { text: display, uncertain }
  }
  if (year !== null) return { text: String(year), uncertain: false }
  return { text: '?', uncertain: false }
}

export function lifeSpanSegments(
  birthDate: string | undefined,
  deathDate: string | undefined,
  birthYear: number | null,
  deathYear: number | null,
  opts?: { hideDeathIfUnknown?: boolean; compact?: boolean },
): DateTextSegment[] {
  const birth = yearLabel(birthDate, birthYear)
  const showDeath =
    !opts?.hideDeathIfUnknown || hasKnownDeath(deathDate)
  if (!showDeath) {
    return [birth]
  }
  const death = yearLabel(deathDate, deathYear)
  const sep = opts?.compact ? '–' : ' – '
  return [birth, { text: sep, uncertain: false }, death]
}

/** Kompaktní roky pro seznam příbuzných — bez úmrtí, pokud není známo. */
export function relativeYearSpanSegments(
  birthDate: string | undefined,
  deathDate: string | undefined,
  birthYear: number | null,
  deathYear: number | null,
): DateTextSegment[] {
  const birth = yearLabel(birthDate, birthYear)
  const deathKnown = hasKnownDeath(deathDate) || deathYear !== null
  if (!deathKnown) {
    if (
      birth.text === '?' &&
      birthYear === null &&
      !birthDate?.trim()
    ) {
      return [{ text: '?', uncertain: false }]
    }
    return [birth]
  }
  const death = yearLabel(deathDate, deathYear)
  return [birth, { text: '–', uncertain: false }, death]
}

export function formatLifeSpan(
  birthYear: number | null,
  deathYear: number | null,
): string {
  const birth = birthYear ?? '?'
  const death = deathYear ?? '?'
  return `${birth} – ${death}`
}

/** Roky pro seznam příbuzných — jen narození, nebo narození–úmrtí. */
export function formatYearSpan(
  birthYear: number | null,
  deathYear: number | null,
): string {
  if (birthYear === null && deathYear === null) return '?'
  if (birthYear !== null && deathYear !== null) return `${birthYear}–${deathYear}`
  if (birthYear !== null) return String(birthYear)
  return String(deathYear)
}

export function hasKnownDeath(deathDate: string | undefined): boolean {
  return Boolean(deathDate?.trim())
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
