import { describe, it, expect } from 'vitest'
import {
  collectUpcomingWeddingMilestones,
  collectWeddingAnniversaries,
  sortWeddingMilestones,
  weddingsInMonth,
} from '@/lib/time/weddings'

const couple = [
  {
    id: '1',
    givenName: 'Jiří',
    familyName: 'Zelenka',
    fullName: 'Jiří Zelenka',
    gender: 'male',
    death: { date: '' },
    spouses: [{ id: '13', marriageDate: '21.9.2024' }],
  },
  {
    id: '13',
    givenName: 'Zuzana',
    familyName: 'Spilková',
    fullName: 'Zuzana Spilková',
    gender: 'female',
    death: { date: '' },
    spouses: [{ id: '1', marriageDate: '21.9.2024' }],
  },
]

describe('weddings', () => {
  it('deduplicates couples and assigns woman/man by gender', () => {
    const weddings = collectWeddingAnniversaries(couple, {
      requireExactDate: true,
    })
    expect(weddings).toHaveLength(1)
    expect(weddings[0].wife.id).toBe('13')
    expect(weddings[0].husband.id).toBe('1')
    expect(weddings[0].month).toBe(9)
    expect(weddings[0].day).toBe(21)
    expect(weddings[0].exactDate).toBe(true)
  })

  it('includes year-only marriages as 1.1. and filters living couples', () => {
    const people = [
      {
        id: 'a',
        givenName: 'Anna',
        familyName: 'Nováková',
        fullName: 'Anna Nováková',
        gender: 'female',
        death: { date: '' },
        spouses: [{ id: 'b', marriageDate: '1990' }],
      },
      {
        id: 'b',
        givenName: 'Petr',
        familyName: 'Novák',
        fullName: 'Petr Novák',
        gender: 'male',
        death: { date: '2001' },
        spouses: [{ id: 'a', marriageDate: '1990' }],
      },
      {
        id: 'c',
        givenName: 'Eva',
        familyName: 'Stará',
        fullName: 'Eva Stará',
        gender: 'female',
        death: { date: '1980' },
        spouses: [{ id: 'd', marriageDate: '1.5.1950' }],
      },
      {
        id: 'd',
        givenName: 'Jan',
        familyName: 'Starý',
        fullName: 'Jan Starý',
        gender: 'male',
        death: { date: '1975' },
        spouses: [{ id: 'c', marriageDate: '1.5.1950' }],
      },
    ]

    const living = collectWeddingAnniversaries(people, {
      requireOneLiving: true,
    })
    expect(living).toHaveLength(1)
    expect(living[0].id).toContain('a')
    expect(living[0].exactDate).toBe(false)
    expect(living[0].month).toBe(1)
    expect(living[0].day).toBe(1)

    const exact = collectWeddingAnniversaries(people, {
      requireExactDate: true,
    })
    expect(exact).toHaveLength(1)
    expect(exact[0].wife.givenName).toBe('Eva')
  })

  it('groups exact weddings by day in month', () => {
    const weddings = collectWeddingAnniversaries(couple, {
      requireExactDate: true,
    })
    const september = weddingsInMonth(weddings, 2026, 9)
    expect(september.get(21)?.map((w) => w.id)).toEqual([weddings[0].id])
    expect(september.has(1)).toBe(false)
  })

  it('lists nearest 5-year wedding milestones with year-only as 1.1.', () => {
    const people = [
      {
        id: '1',
        givenName: 'A',
        familyName: 'X',
        fullName: 'A X',
        gender: 'female',
        death: { date: '' },
        spouses: [{ id: '2', marriageDate: '2000' }],
      },
      {
        id: '2',
        givenName: 'B',
        familyName: 'Y',
        fullName: 'B Y',
        gender: 'male',
        death: { date: '' },
        spouses: [{ id: '1', marriageDate: '2000' }],
      },
    ]
    const weddings = collectWeddingAnniversaries(people, {
      requireOneLiving: true,
    })
    const from = new Date(2024, 5, 1)
    const milestones = collectUpcomingWeddingMilestones(weddings, from, {
      limit: 3,
    })
    expect(milestones).toHaveLength(3)
    expect(milestones[0].years).toBe(25)
    expect(milestones[0].milestoneDate.getFullYear()).toBe(2025)
    expect(milestones[0].milestoneDate.getMonth()).toBe(0)
    expect(milestones[0].milestoneDate.getDate()).toBe(1)
    expect(milestones[0].displayMarriageDate).toBe('1.1.2000')
    expect(milestones[1].years).toBe(30)
    expect(milestones[2].years).toBe(35)
  })

  it('sorts wedding milestones by wife name and years', () => {
    const people = [
      {
        id: '1',
        givenName: 'Zuzana',
        familyName: 'Nováková',
        fullName: 'Zuzana Nováková',
        gender: 'female',
        death: { date: '' },
        spouses: [{ id: '2', marriageDate: '1.1.2000' }],
      },
      {
        id: '2',
        givenName: 'Adam',
        familyName: 'Novák',
        fullName: 'Adam Novák',
        gender: 'male',
        death: { date: '' },
        spouses: [{ id: '1', marriageDate: '1.1.2000' }],
      },
      {
        id: '3',
        givenName: 'Alena',
        familyName: 'Černá',
        fullName: 'Alena Černá',
        gender: 'female',
        death: { date: '' },
        spouses: [{ id: '4', marriageDate: '1.2.1990' }],
      },
      {
        id: '4',
        givenName: 'Bohumil',
        familyName: 'Černý',
        fullName: 'Bohumil Černý',
        gender: 'male',
        death: { date: '' },
        spouses: [{ id: '3', marriageDate: '1.2.1990' }],
      },
    ]
    const weddings = collectWeddingAnniversaries(people, {
      requireOneLiving: true,
    })
    const from = new Date(2024, 0, 1)
    const base = collectUpcomingWeddingMilestones(weddings, from, { limit: 10 })
    const byWife = sortWeddingMilestones(base, 'wife', 'asc')
    expect(byWife[0].wife.givenName).toBe('Alena')
    const byYears = sortWeddingMilestones(base, 'years', 'desc')
    expect(byYears[0].years).toBeGreaterThanOrEqual(byYears[1].years)
  })
})
