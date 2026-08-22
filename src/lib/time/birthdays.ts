import { isLiving, parseMonthDay, parseYear } from './dates'

export interface BirthdayPerson {
  id: string
  givenName: string
  familyName: string
  fullName: string
  birthDate: string
  birthYear: number
  month: number
  day: number
}

export interface MilestoneEntry {
  id: string
  personId: string
  givenName: string
  familyName: string
  fullName: string
  birthDate: string
  /** Datum kulatin (narozeniny v daném roce). */
  milestoneDate: Date
  /** Věk v den kulatin (násobek 5). */
  age: number
}

export type MilestoneSortKey = 'date' | 'givenName' | 'familyName' | 'age'

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function anniversaryInYear(year: number, month: number, day: number): Date {
  // 29.2 → 28.2 v nepřestupném roce
  const lastDay = new Date(year, month, 0).getDate()
  return new Date(year, month - 1, Math.min(day, lastDay))
}

export function toBirthdayPerson(person: {
  id: string
  givenName: string
  familyName?: string
  fullName: string
  birth?: { date?: string }
  death?: { date?: string }
  birthYear?: number | null
}): BirthdayPerson | null {
  if (!isLiving(person.death?.date)) return null
  const birthDate = person.birth?.date ?? ''
  const md = parseMonthDay(birthDate)
  const birthYear = person.birthYear ?? parseYear(birthDate)
  if (!md || birthYear === null) return null
  return {
    id: person.id,
    givenName: person.givenName,
    familyName: person.familyName ?? '',
    fullName: person.fullName,
    birthDate,
    birthYear,
    month: md.month,
    day: md.day,
  }
}

/** Žijící osoby s úplným datem narození (den + měsíc + rok). */
export function collectLivingBirthdays(
  persons: Iterable<{
    id: string
    givenName: string
    familyName?: string
    fullName: string
    birth?: { date?: string }
    death?: { date?: string }
    birthYear?: number | null
  }>,
): BirthdayPerson[] {
  const result: BirthdayPerson[] = []
  for (const person of persons) {
    const entry = toBirthdayPerson(person)
    if (entry) result.push(entry)
  }
  return result
}

/** Narozeniny v daném měsíci (bez ohledu na rok). */
export function birthdaysInMonth(
  people: BirthdayPerson[],
  year: number,
  month: number,
): Map<number, BirthdayPerson[]> {
  const byDay = new Map<number, BirthdayPerson[]>()
  for (const person of people) {
    if (person.month !== month) continue
    const ann = anniversaryInYear(year, person.month, person.day)
    const day = ann.getDate()
    const list = byDay.get(day) ?? []
    list.push(person)
    byDay.set(day, list)
  }
  return byDay
}

/**
 * Nejbližší kulatiny (věk násobek 5) od `from` vpřed.
 * Defaultně prvních `limit` podle data.
 */
export function collectUpcomingMilestones(
  people: BirthdayPerson[],
  from: Date = new Date(),
  opts?: { limit?: number; maxAge?: number },
): MilestoneEntry[] {
  const limit = opts?.limit ?? 50
  const maxAge = opts?.maxAge ?? 120
  const fromDay = startOfLocalDay(from)
  const entries: MilestoneEntry[] = []

  for (const person of people) {
    for (let age = 5; age <= maxAge; age += 5) {
      const year = person.birthYear + age
      const milestoneDate = anniversaryInYear(year, person.month, person.day)
      if (milestoneDate < fromDay) continue
      entries.push({
        id: `${person.id}-${age}`,
        personId: person.id,
        givenName: person.givenName,
        familyName: person.familyName,
        fullName: person.fullName,
        birthDate: person.birthDate,
        milestoneDate,
        age,
      })
    }
  }

  entries.sort((a, b) => a.milestoneDate.getTime() - b.milestoneDate.getTime())
  return entries.slice(0, limit)
}

export function sortMilestones(
  entries: MilestoneEntry[],
  key: MilestoneSortKey,
  direction: 'asc' | 'desc' = 'asc',
): MilestoneEntry[] {
  const dir = direction === 'asc' ? 1 : -1
  const sorted = [...entries]
  sorted.sort((a, b) => {
    let cmp = 0
    switch (key) {
      case 'date':
        cmp = a.milestoneDate.getTime() - b.milestoneDate.getTime()
        break
      case 'givenName':
        cmp = a.givenName.localeCompare(b.givenName, 'cs')
        break
      case 'familyName':
        cmp = a.familyName.localeCompare(b.familyName, 'cs')
        break
      case 'age':
        cmp = a.age - b.age
        break
    }
    if (cmp !== 0) return cmp * dir
    return (a.milestoneDate.getTime() - b.milestoneDate.getTime()) * dir
  })
  return sorted
}

export function formatCzechDate(date: Date): string {
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
}
