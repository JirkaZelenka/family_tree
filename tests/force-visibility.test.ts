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
    expect(isCrossLineagePerson(p, ['bartonovi', 'zelenkovi'])).toBe(true)
  })

  it('nativní člen rodu není hraniční', () => {
    const p = person('a', 'bartonovi', { familyName: 'Barton' })
    expect(isCrossLineagePerson(p, ['bartonovi'])).toBe(false)
  })
})

describe('computeForceVisibility', () => {
  it('sbalí rod – zmizí nativní členové, hraniční jen přes příjmení', () => {
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
    expect(visibleIds.has('marta')).toBe(false)
    expect(boundaryIds.has('babi')).toBe(false)
  })

  it('vdaná žena: viditelná přes příjmení, rozsvícená když lineage sbalená', () => {
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

    const { visibleIds, boundaryIds } = computeForceVisibility(graph, {
      expandedLineages: new Set(['zelenkovi']),
      timeVisible: () => true,
    })

    expect(visibleIds.has('jirka')).toBe(true)
    expect(visibleIds.has('zuzana')).toBe(true)
    expect(boundaryIds.has('zuzana')).toBe(true)
    expect(boundaryIds.has('jirka')).toBe(false)
  })

  it('zmizí když jsou sbalené oba rody (lineage i příjmení)', () => {
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
      expandedLineages: new Set(['spilkovi']),
      timeVisible: () => true,
    })

    expect(visibleIds.has('zuzana')).toBe(true)
    expect(visibleIds.has('jirka')).toBe(false)

    const none = computeForceVisibility(graph, {
      expandedLineages: new Set(),
      timeVisible: () => true,
    })
    expect(none.visibleIds.has('zuzana')).toBe(false)
    expect(none.visibleIds.has('jirka')).toBe(false)
  })

  it('nativní člen zmizí se svým jediným rodem', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode('jan', person('jan', 'zelenkovi', { familyName: 'Zelenka' }))

    const { visibleIds } = computeForceVisibility(graph, {
      expandedLineages: new Set(['bartonovi']),
      timeVisible: () => true,
    })

    expect(visibleIds.has('jan')).toBe(false)
  })
})
