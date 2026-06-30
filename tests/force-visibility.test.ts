import { describe, expect, it } from 'vitest'
import Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import {
  computeForceVisibility,
  isCrossLineagePerson,
} from '@/lib/layout/force-visibility'

function person(
  id: string,
  lineage: string,
  extra: Partial<PersonNode> = {},
): PersonNode {
  return {
    id,
    slug: id,
    givenName: id,
    gender: 'unknown',
    lineage,
    parents: [],
    spouses: [],
    children: [],
    tags: [],
    media: [],
    sources: [],
    fullName: id,
    birthYear: 1950,
    deathYear: null,
    body: '',
    filePath: '',
    ...extra,
  }
}

describe('isCrossLineagePerson', () => {
  it('rozpozná jiné příjmení než rod', () => {
    const p = person('a', 'bartonovi', { familyName: 'Zelenkova' })
    expect(isCrossLineagePerson(p)).toBe(true)
  })

  it('nativní člen rodu není hraniční', () => {
    const p = person('a', 'bartonovi', { familyName: 'Barton' })
    expect(isCrossLineagePerson(p)).toBe(false)
  })
})

describe('computeForceVisibility', () => {
  it('sbalí rod – zmizí nativní členové', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode(
      'deda',
      person('deda', 'bartonovi', {
        familyName: 'Barton',
        spouses: ['babi'],
        children: ['marta'],
      }),
    )
    graph.addNode(
      'babi',
      person('babi', 'hynkovi', {
        familyName: 'Bartonova',
        spouses: ['deda'],
        children: ['marta'],
      }),
    )
    graph.addNode(
      'marta',
      person('marta', 'bartonovi', {
        familyName: 'Brazdova',
        parents: ['deda', 'babi'],
      }),
    )

    const expanded = new Set(['hynkovi'])
    const { visibleIds, boundaryIds } = computeForceVisibility(graph, {
      expandedLineages: expanded,
      timeVisible: () => true,
    })

    expect(visibleIds.has('deda')).toBe(false)
    expect(visibleIds.has('babi')).toBe(true)
    expect(visibleIds.has('marta')).toBe(true)
    expect(boundaryIds.has('marta')).toBe(true)
  })

  it('hraniční osoba zmizí bez viditelného jiného rodu', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode(
      'zuzana',
      person('zuzana', 'spilkovi', {
        familyName: 'Zelenkova',
        spouses: ['jirka'],
      }),
    )
    graph.addNode(
      'jirka',
      person('jirka', 'zelenkovi', { familyName: 'Zelenka', spouses: ['zuzana'] }),
    )

    const { visibleIds } = computeForceVisibility(graph, {
      expandedLineages: new Set(['zelenkovi']),
      timeVisible: () => true,
    })

    expect(visibleIds.has('jirka')).toBe(true)
    expect(visibleIds.has('zuzana')).toBe(true)
  })

  it('bez rozbaleného druhého rodu hraniční osoba zmizí', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode(
      'zuzana',
      person('zuzana', 'spilkovi', {
        familyName: 'Zelenkova',
        spouses: ['jirka'],
      }),
    )
    graph.addNode(
      'jirka',
      person('jirka', 'zelenkovi', { familyName: 'Zelenka', spouses: ['zuzana'] }),
    )

    const { visibleIds } = computeForceVisibility(graph, {
      expandedLineages: new Set(),
      timeVisible: () => true,
    })

    expect(visibleIds.has('zuzana')).toBe(false)
    expect(visibleIds.has('jirka')).toBe(false)
  })
})
