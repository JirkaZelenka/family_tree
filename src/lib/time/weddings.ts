import { isLiving, parseMonthDay, parseYear } from './dates'

export interface WeddingPersonRef {
  id: string
  givenName: string
  familyName: string
  fullName: string
  gender: string
}

export interface WeddingAnniversary {
  id: string
  wife: WeddingPersonRef
  husband: WeddingPersonRef
  marriageDate: string
  marriageYear: number
  month: number
  day: number
  /** True, když je v datech den i měsíc (ne jen rok). */
  exactDate: boolean
}

export interface WeddingMilestoneEntry {
  id: string
  wife: WeddingPersonRef
  husband: WeddingPersonRef
  marriageDate: string
  /** Datum kulatého výročí. */
  milestoneDate: Date
  /** Počet let od svatby (násobek 5). */
  years: number
  /** Zobrazení data svatby (u roku-only jako 1.1.YYYY). */
  displayMarriageDate: string
}

export type WeddingMilestoneSortKey =
  | 'date'
  | 'wife'
  | 'husband'
  | 'marriage'
  | 'years'

type PersonLike = {
  id: string
  givenName: string
  familyName?: string
  fullName: string
  gender?: string
  death?: { date?: string }
  redacted?: boolean
  spouses?: Array<{ id: string; marriageDate?: string }>
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function anniversaryInYear(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month, 0).getDate()
  return new Date(year, month - 1, Math.min(day, lastDay))
}

function toRef(person: PersonLike): WeddingPersonRef {
  return {
    id: person.id,
    givenName: person.givenName,
    familyName: person.familyName ?? '',
    fullName: person.fullName,
    gender: person.gender ?? 'unknown',
  }
}

function coupleKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

function assignRoles(
  a: PersonLike,
  b: PersonLike,
): { wife: WeddingPersonRef; husband: WeddingPersonRef } {
  const aFemale = a.gender === 'female'
  const bFemale = b.gender === 'female'
  const aMale = a.gender === 'male'
  const bMale = b.gender === 'male'

  if (aFemale && !bFemale) return { wife: toRef(a), husband: toRef(b) }
  if (bFemale && !aFemale) return { wife: toRef(b), husband: toRef(a) }
  if (aMale && !bMale) return { wife: toRef(b), husband: toRef(a) }
  if (bMale && !aMale) return { wife: toRef(a), husband: toRef(b) }

  return a.id < b.id
    ? { wife: toRef(a), husband: toRef(b) }
    : { wife: toRef(b), husband: toRef(a) }
}

function displayMarriageDate(
  raw: string,
  year: number,
  exactDate: boolean,
  month: number,
  day: number,
): string {
  if (exactDate) return raw.replace(/^\?+/, '') || `${day}.${month}.${year}`
  return `1.1.${year}`
}

/**
 * Unikátní manželské páry s alespoň známým rokem svatby.
 * `requireExactDate` — jen den+měsíc+rok.
 * `requireOneLiving` — aspoň jeden z páru žije.
 */
export function collectWeddingAnniversaries(
  persons: Iterable<PersonLike>,
  opts?: { requireExactDate?: boolean; requireOneLiving?: boolean },
): WeddingAnniversary[] {
  const byId = new Map<string, PersonLike>()
  for (const person of persons) {
    if (person.redacted) continue
    byId.set(person.id, person)
  }

  const seen = new Set<string>()
  const result: WeddingAnniversary[] = []

  for (const person of byId.values()) {
    for (const spouse of person.spouses ?? []) {
      const partner = byId.get(String(spouse.id))
      if (!partner) continue

      const key = coupleKey(person.id, partner.id)
      if (seen.has(key)) continue
      seen.add(key)

      const marriageDate = spouse.marriageDate?.trim() ?? ''
      // Partner může mít datum, pokud u této osoby chybí.
      const partnerEntry = partner.spouses?.find((s) => String(s.id) === person.id)
      const partnerDate = partnerEntry?.marriageDate?.trim() ?? ''
      const rawDate = marriageDate || partnerDate
      if (!rawDate) continue

      const marriageYear = parseYear(rawDate)
      if (marriageYear === null) continue

      const md = parseMonthDay(rawDate)
      const exactDate = md !== null
      if (opts?.requireExactDate && !exactDate) continue

      if (
        opts?.requireOneLiving &&
        !isLiving(person.death?.date) &&
        !isLiving(partner.death?.date)
      ) {
        continue
      }

      const { wife, husband } = assignRoles(person, partner)
      result.push({
        id: key,
        wife,
        husband,
        marriageDate: rawDate,
        marriageYear,
        month: md?.month ?? 1,
        day: md?.day ?? 1,
        exactDate,
      })
    }
  }

  return result
}

/** Výročí svateb v daném měsíci (jen přesná data). */
export function weddingsInMonth(
  weddings: WeddingAnniversary[],
  year: number,
  month: number,
): Map<number, WeddingAnniversary[]> {
  const byDay = new Map<number, WeddingAnniversary[]>()
  for (const wedding of weddings) {
    if (!wedding.exactDate) continue
    if (wedding.month !== month) continue
    const ann = anniversaryInYear(year, wedding.month, wedding.day)
    const day = ann.getDate()
    const list = byDay.get(day) ?? []
    list.push(wedding)
    byDay.set(day, list)
  }
  return byDay
}

/**
 * Nejbližší kulatá výročí svateb (násobky 5 let) od `from` vpřed.
 * U dat jen s rokem se výročí počítá k 1.1.
 */
export function collectUpcomingWeddingMilestones(
  weddings: WeddingAnniversary[],
  from: Date = new Date(),
  opts?: { limit?: number; maxYears?: number },
): WeddingMilestoneEntry[] {
  const limit = opts?.limit ?? 50
  const maxYears = opts?.maxYears ?? 100
  const fromDay = startOfLocalDay(from)
  const entries: WeddingMilestoneEntry[] = []

  for (const wedding of weddings) {
    for (let years = 5; years <= maxYears; years += 5) {
      const year = wedding.marriageYear + years
      const milestoneDate = anniversaryInYear(year, wedding.month, wedding.day)
      if (milestoneDate < fromDay) continue
      entries.push({
        id: `${wedding.id}-${years}`,
        wife: wedding.wife,
        husband: wedding.husband,
        marriageDate: wedding.marriageDate,
        milestoneDate,
        years,
        displayMarriageDate: displayMarriageDate(
          wedding.marriageDate,
          wedding.marriageYear,
          wedding.exactDate,
          wedding.month,
          wedding.day,
        ),
      })
    }
  }

  entries.sort((a, b) => a.milestoneDate.getTime() - b.milestoneDate.getTime())
  return entries.slice(0, limit)
}

export function sortWeddingMilestones(
  entries: WeddingMilestoneEntry[],
  key: WeddingMilestoneSortKey,
  direction: 'asc' | 'desc' = 'asc',
): WeddingMilestoneEntry[] {
  const dir = direction === 'asc' ? 1 : -1
  const sorted = [...entries]
  sorted.sort((a, b) => {
    let cmp = 0
    switch (key) {
      case 'date':
        cmp = a.milestoneDate.getTime() - b.milestoneDate.getTime()
        break
      case 'wife':
        cmp = a.wife.fullName.localeCompare(b.wife.fullName, 'cs')
        break
      case 'husband':
        cmp = a.husband.fullName.localeCompare(b.husband.fullName, 'cs')
        break
      case 'marriage':
        cmp = a.displayMarriageDate.localeCompare(b.displayMarriageDate, 'cs')
        break
      case 'years':
        cmp = a.years - b.years
        break
    }
    if (cmp !== 0) return cmp * dir
    return (a.milestoneDate.getTime() - b.milestoneDate.getTime()) * dir
  })
  return sorted
}
