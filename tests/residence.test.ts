import { describe, expect, it } from 'vitest'
import type { PersonNode } from '@/types/person'
import {
  buildResidenceSegments,
  jitterOffset,
  residencePlaceAtYear,
} from '@/lib/map/residence'

function person(partial: Partial<PersonNode> & Pick<PersonNode, 'id'>): PersonNode {
  return {
    slug: partial.id,
    givenName: partial.givenName ?? partial.id,
    gender: 'unknown',
    lineage: 'test',
    birth: { date: '', place: '' },
    death: { date: '', place: '' },
    parents: [],
    spouses: [],
    moving: [],
    links: [],
    internal_note: '',
    note: '',
    children: [],
    fullName: partial.givenName ?? partial.id,
    birthYear: null,
    deathYear: null,
    body: '',
    filePath: `${partial.id}.md`,
    ...partial,
  }
}

describe('residence', () => {
  it('starts at birth place', () => {
    const persons = new Map<string, PersonNode>([
      [
        '1',
        person({
          id: '1',
          birth: { date: '1900', place: 'Praha' },
          birthYear: 1900,
        }),
      ],
    ])
    const segments = buildResidenceSegments(persons.get('1')!, persons)
    expect(residencePlaceAtYear(segments, 1920)).toBe('Praha')
  })

  it('moves when a child is born elsewhere', () => {
    const persons = new Map<string, PersonNode>([
      [
        'p',
        person({
          id: 'p',
          birth: { date: '1900', place: 'Brno' },
          birthYear: 1900,
          children: ['c'],
        }),
      ],
      [
        'c',
        person({
          id: 'c',
          birth: { date: '1930', place: 'Praha' },
          birthYear: 1930,
          parents: ['p'],
        }),
      ],
    ])
    const segments = buildResidenceSegments(persons.get('p')!, persons)
    expect(residencePlaceAtYear(segments, 1929)).toBe('Brno')
    expect(residencePlaceAtYear(segments, 1930)).toBe('Praha')
    expect(residencePlaceAtYear(segments, 1950)).toBe('Praha')
  })

  it('ignores child born in the same place', () => {
    const persons = new Map<string, PersonNode>([
      [
        'p',
        person({
          id: 'p',
          birth: { date: '1900', place: 'Praha' },
          birthYear: 1900,
          children: ['c'],
        }),
      ],
      [
        'c',
        person({
          id: 'c',
          birth: { date: '1930', place: 'Praha' },
          birthYear: 1930,
        }),
      ],
    ])
    const segments = buildResidenceSegments(persons.get('p')!, persons)
    expect(segments).toEqual([
      { place: 'Praha', fromYear: 1900, toYear: null },
    ])
  })

  it('applies explicit moving over child birth in the same year', () => {
    const persons = new Map<string, PersonNode>([
      [
        'p',
        person({
          id: 'p',
          birth: { date: '1900', place: 'Brno' },
          birthYear: 1900,
          children: ['c'],
          moving: [{ date: '1930', from: 'Brno', to: 'Vídeň' }],
        }),
      ],
      [
        'c',
        person({
          id: 'c',
          birth: { date: '1930', place: 'Praha' },
          birthYear: 1930,
        }),
      ],
    ])
    const segments = buildResidenceSegments(persons.get('p')!, persons)
    expect(residencePlaceAtYear(segments, 1930)).toBe('Vídeň')
    expect(segments.map((s) => s.place)).toEqual(['Brno', 'Praha', 'Vídeň'])
  })

  it('jitters multiple people at one place', () => {
    const a = jitterOffset('1', 0, 3)
    const b = jitterOffset('2', 1, 3)
    expect(a.dLat !== 0 || a.dLon !== 0).toBe(true)
    expect(a.dLat === b.dLat && a.dLon === b.dLon).toBe(false)
    expect(jitterOffset('x', 0, 1)).toEqual({ dLat: 0, dLon: 0 })
  })
})
