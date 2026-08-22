import { describe, it, expect } from 'vitest'
import {
  collectLivingBirthdays,
  collectUpcomingMilestones,
  birthdaysInMonth,
  sortMilestones,
} from '@/lib/time/birthdays'
import { parseMonthDay, isLiving } from '@/lib/time/dates'

describe('birthdays', () => {
  it('parses month and day', () => {
    expect(parseMonthDay('14.2.1968')).toEqual({ month: 2, day: 14 })
    expect(parseMonthDay('1968-02-14')).toEqual({ month: 2, day: 14 })
    expect(parseMonthDay('?11.6.1957')).toEqual({ month: 6, day: 11 })
    expect(parseMonthDay('1957')).toBeNull()
    expect(parseMonthDay('')).toBeNull()
  })

  it('detects living people by empty death', () => {
    expect(isLiving('')).toBe(true)
    expect(isLiving(undefined)).toBe(true)
    expect(isLiving('?')).toBe(false)
    expect(isLiving('2020')).toBe(false)
  })

  it('collects only living people with full birth date', () => {
    const people = collectLivingBirthdays([
      {
        id: '1',
        givenName: 'Ivana',
        familyName: 'Trousilová',
        fullName: 'Ivana Trousilová',
        birth: { date: '11.6.1957' },
        death: { date: '' },
        birthYear: 1957,
      },
      {
        id: '2',
        givenName: 'Karel',
        familyName: 'Zelenka',
        fullName: 'Karel Zelenka',
        birth: { date: '1950' },
        death: { date: '' },
        birthYear: 1950,
      },
      {
        id: '3',
        givenName: 'Otto',
        familyName: 'Trousil',
        fullName: 'Otto Trousil',
        birth: { date: '1.1.1920' },
        death: { date: '2000' },
        birthYear: 1920,
      },
    ])
    expect(people).toHaveLength(1)
    expect(people[0].id).toBe('1')
  })

  it('groups birthdays by day in month', () => {
    const people = collectLivingBirthdays([
      {
        id: '1',
        givenName: 'A',
        familyName: 'X',
        fullName: 'A X',
        birth: { date: '11.6.1957' },
        death: { date: '' },
        birthYear: 1957,
      },
      {
        id: '2',
        givenName: 'B',
        familyName: 'Y',
        fullName: 'B Y',
        birth: { date: '15.7.1990' },
        death: { date: '' },
        birthYear: 1990,
      },
    ])
    const june = birthdaysInMonth(people, 2026, 6)
    expect(june.get(11)?.map((p) => p.id)).toEqual(['1'])
    expect(june.has(15)).toBe(false)
  })

  it('lists nearest 5-year milestones', () => {
    const people = collectLivingBirthdays([
      {
        id: '1',
        givenName: 'Ivana',
        familyName: 'Trousilová',
        fullName: 'Ivana Trousilová',
        birth: { date: '11.6.1957' },
        death: { date: '' },
        birthYear: 1957,
      },
    ])
    // 17.7.2026 → další kulatina 70 dne 11.6.2027
    const from = new Date(2026, 6, 17)
    const milestones = collectUpcomingMilestones(people, from, { limit: 3 })
    expect(milestones).toHaveLength(3)
    expect(milestones[0].age).toBe(70)
    expect(milestones[0].milestoneDate.getFullYear()).toBe(2027)
    expect(milestones[1].age).toBe(75)
    expect(milestones[2].age).toBe(80)
  })

  it('sorts milestones by name and age', () => {
    const people = collectLivingBirthdays([
      {
        id: '1',
        givenName: 'Zuzana',
        familyName: 'Nováková',
        fullName: 'Zuzana Nováková',
        birth: { date: '1.1.2000' },
        death: { date: '' },
        birthYear: 2000,
      },
      {
        id: '2',
        givenName: 'Adam',
        familyName: 'Černý',
        fullName: 'Adam Černý',
        birth: { date: '1.2.1990' },
        death: { date: '' },
        birthYear: 1990,
      },
    ])
    const from = new Date(2024, 0, 1)
    const base = collectUpcomingMilestones(people, from, { limit: 10 })
    const byName = sortMilestones(base, 'givenName', 'asc')
    expect(byName[0].givenName).toBe('Adam')
    const byAge = sortMilestones(base, 'age', 'desc')
    expect(byAge[0].age).toBeGreaterThanOrEqual(byAge[1].age)
  })
})
