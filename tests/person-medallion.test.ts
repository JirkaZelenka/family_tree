import { describe, it, expect } from 'vitest'
import { personNameWithYear } from '@/components/person/PersonMedallion'

describe('personNameWithYear', () => {
  it('u známého roku přidá jen závorku s rokem', () => {
    expect(
      personNameWithYear('Jan Bartoň', { birthYear: 1814, birth: { date: '20.11.1814', place: '' } }, 'odhad'),
    ).toBe('Jan Bartoň (1814)')
  })

  it('u nejistého ?ROK neoznačuje odhad', () => {
    expect(
      personNameWithYear('Marie', { birthYear: 1942, birth: { date: '?1942', place: '' } }, 'odhad'),
    ).toBe('Marie (1942)')
  })

  it('u úplně neznámého ??ROK napíše odhad', () => {
    expect(
      personNameWithYear('Andrej Novák', { birthYear: 1870, birth: { date: '??1870', place: '' } }, 'odhad'),
    ).toBe('Andrej Novák (odhad: 1870)')
  })

  it('bez roku nechá jen jméno', () => {
    expect(
      personNameWithYear('X', { birthYear: null, birth: { date: '', place: '' } }, 'odhad'),
    ).toBe('X')
  })
})
