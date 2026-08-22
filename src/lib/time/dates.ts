const ISO_YEAR_RE = /^(-?\d{1,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/
const DOT_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(-?\d{1,4})$/
const UNCERTAIN_PREFIX_RE = /^\?+/

export interface DateTextSegment {
  text: string
  uncertain: boolean
}

/** Počet úvodních otazníků (`?` = nejisté, `??` = neznámé zobrazení). */
export function uncertaintyPrefixLength(date: string | undefined | null): number {
  const match = date?.trim().match(UNCERTAIN_PREFIX_RE)
  return match ? match[0].length : 0
}

/** Jeden úvodní `?` — hodnota se zobrazí se zvýrazněním nejistoty. */
export function isUncertainDate(date: string | undefined | null): boolean {
  return uncertaintyPrefixLength(date) === 1
}

/**
 * Dva a více úvodních `??` — hodnota je pro zobrazení neznámá (jen `?`),
 * ale pod ní ležící rok se dál používá pro ukotvení na ose.
 */
export function isUnknownDisplayDate(date: string | undefined | null): boolean {
  return uncertaintyPrefixLength(date) >= 2
}

/** Text pro zobrazení — bez úvodního otazníku; u `??` nebo samotného `?` jen `?`. */
export function dateDisplayText(date: string | undefined | null): string {
  const trimmed = date?.trim() ?? ''
  if (!trimmed) return '?'
  if (isUnknownDisplayDate(trimmed)) return '?'
  const stripped = trimmed.replace(UNCERTAIN_PREFIX_RE, '')
  if (!stripped) return '?'
  return stripped
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

export interface MonthDay {
  month: number
  day: number
}

/** Den a měsíc z data (`14.2.1968`, `1968-02-14`). Jen rok nestačí. */
export function parseMonthDay(date: string | number | undefined | null): MonthDay | null {
  if (date === undefined || date === null) return null
  if (typeof date === 'number') return null
  const trimmed = stripUncertainty(date)
  if (!trimmed) return null

  const dotMatch = trimmed.match(DOT_DATE_RE)
  if (dotMatch) {
    const day = parseInt(dotMatch[1], 10)
    const month = parseInt(dotMatch[2], 10)
    if (!Number.isFinite(day) || !Number.isFinite(month)) return null
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return { month, day }
  }

  const isoMatch = trimmed.match(ISO_YEAR_RE)
  if (isoMatch?.[2] && isoMatch[3]) {
    const month = parseInt(isoMatch[2], 10)
    const day = parseInt(isoMatch[3], 10)
    if (!Number.isFinite(day) || !Number.isFinite(month)) return null
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return { month, day }
  }

  return null
}

export function dateFieldSegments(date: string | undefined | null): DateTextSegment[] {
  const trimmed = date?.trim() ?? ''
  if (!trimmed) return [{ text: '?', uncertain: false }]
  if (isUnknownDisplayDate(trimmed)) return [{ text: '?', uncertain: false }]
  const uncertain = isUncertainDate(trimmed)
  return [{ text: dateDisplayText(trimmed), uncertain }]
}

function yearLabel(
  date: string | undefined,
  year: number | null,
): { text: string; uncertain: boolean } {
  const trimmed = date?.trim() ?? ''
  if (trimmed) {
    if (isUnknownDisplayDate(trimmed)) {
      return { text: '?', uncertain: false }
    }
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

/** Osoba žije — prázdné datum úmrtí (`""`), ne `?` ani rok. */
export function isLiving(deathDate: string | undefined | null): boolean {
  return !hasKnownDeath(deathDate ?? undefined)
}

/**
 * Datum úmrtí je přesně `?` — rok neznáme, pro filtraci předpokládáme
 * dožití {@link ASSUMED_LIFESPAN_YEARS} od narození.
 * Prázdné `""` znamená stále naživu; `?1908` je známý rok s nejistotou.
 */
export function isAssumedDeathDate(date: string | undefined | null): boolean {
  return date?.trim() === '?'
}

/** Když je úmrtí `?`, předpokládáme dožití tohoto věku. */
export const ASSUMED_LIFESPAN_YEARS = 70

/**
 * Efektivní rok úmrtí pro filtraci / překryvy.
 * - `?` → narození + 70
 * - prázdné / chybějící → stále naživu (`null` = Infinity u volajícího)
 * - jinak parsovaný rok (`?1908` → 1908)
 */
export function effectiveDeathYear(
  birthYear: number | null,
  deathYear: number | null,
  deathDate?: string | null,
): number | null {
  if (isAssumedDeathDate(deathDate)) {
    return birthYear !== null ? birthYear + ASSUMED_LIFESPAN_YEARS : null
  }
  return deathYear
}

export function isBornByYear(birthYear: number | null, year: number): boolean {
  if (birthYear === null) return true
  return birthYear <= year
}

export function isAliveAtYear(
  birthYear: number | null,
  deathYear: number | null,
  year: number,
  deathDate?: string | null,
): boolean {
  const birth = birthYear ?? -Infinity
  const death = effectiveDeathYear(birthYear, deathYear, deathDate) ?? Infinity
  return birth <= year && year <= death
}

export function lifeSpanOverlap(
  aBirth: number | null,
  aDeath: number | null,
  bBirth: number | null,
  bDeath: number | null,
  aDeathDate?: string | null,
  bDeathDate?: string | null,
): boolean {
  const aStart = aBirth ?? -Infinity
  const aEnd = effectiveDeathYear(aBirth, aDeath, aDeathDate) ?? Infinity
  const bStart = bBirth ?? -Infinity
  const bEnd = effectiveDeathYear(bBirth, bDeath, bDeathDate) ?? Infinity
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

/** Když chybí datum svatby, odhadneme sňatek v tomto věku staršího z partnerů. */
export const ASSUMED_MARRIAGE_AGE = 25

/**
 * Rok sňatku: z `marriageDate`, jinak odhad z narození dětí,
 * jinak starší partner + {@link ASSUMED_MARRIAGE_AGE}.
 */
export function resolveMarriageYear(
  marriageDate: string | undefined | null,
  opts: {
    birthYearA?: number | null
    birthYearB?: number | null
    childBirthYears?: Array<number | null | undefined>
  } = {},
): number | null {
  const parsed = parseYear(marriageDate)
  if (parsed !== null) return parsed

  const childYears = (opts.childBirthYears ?? []).filter(
    (y): y is number => y != null && Number.isFinite(y),
  )
  if (childYears.length > 0) return Math.min(...childYears)

  const births = [opts.birthYearA ?? null, opts.birthYearB ?? null].filter(
    (y): y is number => y !== null,
  )
  if (births.length > 0) return Math.max(...births) + ASSUMED_MARRIAGE_AGE

  return null
}

/** Sňatek už proběhl v daném roce (včetně roku sňatku). */
export function isMarriageVisibleAtYear(
  marriageYear: number | null,
  year: number,
): boolean {
  if (marriageYear === null) return true
  return marriageYear <= year
}
