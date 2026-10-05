import { describe, expect, it } from 'vitest'
import {
  collectFocusNeighborhood,
  transformToFocusPerson,
} from '@/lib/layout/story-tree-focus'
import type { PersonNode } from '@/types/person'
import type { ForceNodePosition } from '@/lib/layout/force-layout'

function person(
  partial: Partial<PersonNode> & Pick<PersonNode, 'id' | 'fullName'>,
): PersonNode {
  return {
    givenName: partial.givenName ?? partial.fullName.split(' ')[0] ?? 'X',
    familyName: partial.familyName ?? '',
    lineage: partial.lineage ?? 'Testovi',
    gender: partial.gender ?? 'unknown',
    parents: partial.parents ?? [],
    children: partial.children ?? [],
    spouses: partial.spouses ?? [],
    birthYear: partial.birthYear ?? null,
    deathYear: partial.deathYear ?? null,
    redacted: false,
    ...partial,
  } as PersonNode
}

describe('collectFocusNeighborhood', () => {
  it('includes two generations up/down plus spouses and siblings', () => {
    const persons = new Map<string, PersonNode>([
      ['gp', person({ id: 'gp', fullName: 'Děda', children: ['p'] })],
      ['p', person({ id: 'p', fullName: 'Otec', parents: ['gp'], children: ['a', 'sib'], spouses: [{ id: 'm', marriageDate: '' }] })],
      ['m', person({ id: 'm', fullName: 'Matka', spouses: [{ id: 'p', marriageDate: '' }], children: ['a', 'sib'] })],
      ['sib', person({ id: 'sib', fullName: 'Sourozenec', parents: ['p', 'm'] })],
      ['a', person({ id: 'a', fullName: 'Já', parents: ['p', 'm'], children: ['c'], spouses: [{ id: 's', marriageDate: '' }] })],
      ['s', person({ id: 's', fullName: 'Partner', spouses: [{ id: 'a', marriageDate: '' }] })],
      ['c', person({ id: 'c', fullName: 'Dítě', parents: ['a'], children: ['gc'] })],
      ['gc', person({ id: 'gc', fullName: 'Vnouče', parents: ['c'] })],
    ])

    const neighborhood = collectFocusNeighborhood('a', persons, 2)
    expect(neighborhood.has('gp')).toBe(true)
    expect(neighborhood.has('p')).toBe(true)
    expect(neighborhood.has('m')).toBe(true)
    expect(neighborhood.has('sib')).toBe(true)
    expect(neighborhood.has('s')).toBe(true)
    expect(neighborhood.has('c')).toBe(true)
    expect(neighborhood.has('gc')).toBe(true)
  })
})

describe('transformToFocusPerson', () => {
  it('returns a centered transform for the focus person', () => {
    const persons = new Map<string, PersonNode>([
      ['a', person({ id: 'a', fullName: 'Já', parents: ['p'], children: ['c'] })],
      ['p', person({ id: 'p', fullName: 'Otec', children: ['a'] })],
      ['c', person({ id: 'c', fullName: 'Dítě', parents: ['a'] })],
    ])
    const positions = new Map<string, ForceNodePosition>([
      ['p', { x: 100, y: 0, lineage: 'Testovi', birthYear: 1900 }],
      ['a', { x: 100, y: 200, lineage: 'Testovi', birthYear: 1930 }],
      ['c', { x: 100, y: 400, lineage: 'Testovi', birthYear: 1960 }],
    ])

    const transform = transformToFocusPerson('a', positions, persons, 800, 600)
    expect(transform).not.toBeNull()
    expect(transform!.k).toBeGreaterThan(0.5)
    expect(transform!.k).toBeLessThanOrEqual(1.85)
    // Center of node a (100+84, 200+34) should map near view center
    const cx = 100 + 168 / 2
    const cy = 200 + 68 / 2
    expect(transform!.x + cx * transform!.k).toBeCloseTo(400, 0)
    expect(transform!.y + cy * transform!.k).toBeCloseTo(300, 0)
  })
})
