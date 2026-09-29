import { describe, it, expect } from 'vitest'
import { spouseIds, deriveChildren } from '@/lib/graph/person-links'
import type { PersonNode } from '@/types/person'

describe('person-links', () => {
  it('spouseIds vrátí id partnerů', () => {
    expect(
      spouseIds([
        { id: '2', marriage: { date: '1990' } },
        { id: '5' },
      ]),
    ).toEqual(['2', '5'])
  })

  it('deriveChildren naplní children z parents', () => {
    const persons = new Map<string, PersonNode>([
      [
        'p',
        {
          id: 'p',
          slug: 'p',
          givenName: 'P',
          gender: 'male',
          lineage: 'x',
          parents: [],
          spouses: [],
          children: [],
          tags: [],
          media: [],
          sources: [],
          fullName: 'P',
          birthYear: null,
          deathYear: null,
          body: '',
          filePath: '',
        },
      ],
      [
        'c',
        {
          id: 'c',
          slug: 'c',
          givenName: 'C',
          gender: 'male',
          lineage: 'x',
          parents: ['p'],
          spouses: [],
          children: [],
          tags: [],
          media: [],
          sources: [],
          fullName: 'C',
          birthYear: null,
          deathYear: null,
          body: '',
          filePath: '',
        },
      ],
    ])
    deriveChildren(persons)
    expect(persons.get('p')?.children).toEqual(['c'])
  })
})
