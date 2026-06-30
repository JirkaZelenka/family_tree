import { describe, expect, it } from 'vitest'
import Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import { resolveForceNodeFill } from '@/lib/layout/force-node-fill'
import { SMALL_LINEAGE_COLOR } from '@/lib/vault/lineage-colors'

function person(
  id: string,
  extra: Partial<PersonNode> = {},
): PersonNode {
  return {
    id,
    slug: id,
    givenName: id,
    gender: 'unknown',
    lineage: 'zelenkovi',
    parents: [],
    spouses: [],
    children: [],
    tags: [],
    media: [],
    sources: [],
    fullName: id,
    birthYear: 1990,
    deathYear: null,
    body: '',
    filePath: '',
    ...extra,
  }
}

describe('resolveForceNodeFill', () => {
  const colors = {
    spilkovi: '#38bdf8',
    zelenkovi: '#4ade80',
    brazdovi: '#fb923c',
    nagyovi: SMALL_LINEAGE_COLOR,
  }

  it('bez manžela vrátí jednolitou barvu', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode('a', person('a', { lineage: 'zelenkovi' }))
    const visible = new Set(['a'])
    const positions = new Map([['a', { x: 100, y: 50 }]])

    const fill = resolveForceNodeFill(
      graph,
      graph.getNodeAttributes('a'),
      visible,
      positions,
      colors,
      false,
    )
    expect(fill).toEqual({ type: 'solid', color: colors.zelenkovi })
  })

  it('rozdělí barvu podle rodu rodičů a manžela', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode(
      'zuzana',
      person('zuzana', {
        lineage: 'spilkovi',
        familyName: 'Zelenkova',
        parents: ['dad', 'mom'],
        spouses: ['jirka'],
      }),
    )
    graph.addNode('dad', person('dad', { lineage: 'spilkovi' }))
    graph.addNode('mom', person('mom', { lineage: 'spilkovi' }))
    graph.addNode('jirka', person('jirka', { lineage: 'zelenkovi', spouses: ['zuzana'] }))

    const visible = new Set(['zuzana', 'jirka', 'dad', 'mom'])
    const positions = new Map([
      ['zuzana', { x: 200, y: 80 }],
      ['jirka', { x: 380, y: 80 }],
    ])

    const fill = resolveForceNodeFill(
      graph,
      graph.getNodeAttributes('zuzana'),
      visible,
      positions,
      colors,
      false,
    )

    expect(fill).toEqual({
      type: 'split',
      left: colors.spilkovi,
      right: colors.zelenkovi,
    })
  })

  it('prohodí strany když je manžel vlevo', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode(
      'zuzana',
      person('zuzana', {
        lineage: 'spilkovi',
        familyName: 'Zelenkova',
        parents: ['dad'],
        spouses: ['jirka'],
      }),
    )
    graph.addNode('dad', person('dad', { lineage: 'spilkovi' }))
    graph.addNode('jirka', person('jirka', { lineage: 'zelenkovi', spouses: ['zuzana'] }))

    const visible = new Set(['zuzana', 'jirka'])
    const positions = new Map([
      ['zuzana', { x: 380, y: 80 }],
      ['jirka', { x: 200, y: 80 }],
    ])

    const fill = resolveForceNodeFill(
      graph,
      graph.getNodeAttributes('zuzana'),
      visible,
      positions,
      colors,
      false,
    )

    expect(fill).toEqual({
      type: 'split',
      left: colors.zelenkovi,
      right: colors.spilkovi,
    })
  })

  it('použije lineage osoby, ne rod prvního rodiče (Šárka Brazdovi / Nagyová)', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode(
      'sarka',
      person('sarka', {
        lineage: 'brazdovi',
        familyName: 'Nagyova',
        parents: ['marta', 'mirek'],
        spouses: ['pavel'],
      }),
    )
    graph.addNode('marta', person('marta', { lineage: 'bartonovi' }))
    graph.addNode('mirek', person('mirek', { lineage: 'brazdovi' }))
    graph.addNode('pavel', person('pavel', { lineage: 'nagyovi', familyName: 'Nagy', spouses: ['sarka'] }))

    const visible = new Set(['sarka', 'pavel'])
    const positions = new Map([
      ['sarka', { x: 200, y: 80 }],
      ['pavel', { x: 380, y: 80 }],
    ])

    const fill = resolveForceNodeFill(
      graph,
      graph.getNodeAttributes('sarka'),
      visible,
      positions,
      colors,
      false,
    )

    expect(fill).toEqual({
      type: 'split',
      left: colors.brazdovi,
      right: colors.nagyovi,
    })
  })

  it('manžel s odpovídajícím příjmením má jednolitou barvu rodu', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode(
      'jirka',
      person('jirka', {
        lineage: 'zelenkovi',
        familyName: 'Zelenka',
        parents: ['dad'],
        spouses: ['zuzana'],
      }),
    )
    graph.addNode('dad', person('dad', { lineage: 'zelenkovi' }))
    graph.addNode(
      'zuzana',
      person('zuzana', {
        lineage: 'spilkovi',
        familyName: 'Zelenkova',
        spouses: ['jirka'],
      }),
    )

    const visible = new Set(['jirka', 'zuzana'])
    const positions = new Map([
      ['jirka', { x: 380, y: 80 }],
      ['zuzana', { x: 200, y: 80 }],
    ])

    const fill = resolveForceNodeFill(
      graph,
      graph.getNodeAttributes('jirka'),
      visible,
      positions,
      colors,
      false,
    )
    expect(fill).toEqual({ type: 'solid', color: colors.zelenkovi })
  })

  it('u stejného rodu jako manžel nedělí buňku', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode('a', person('a', { lineage: 'zelenkovi', spouses: ['b'] }))
    graph.addNode('b', person('b', { lineage: 'zelenkovi', spouses: ['a'] }))

    const visible = new Set(['a', 'b'])
    const positions = new Map([
      ['a', { x: 100, y: 50 }],
      ['b', { x: 280, y: 50 }],
    ])

    const fill = resolveForceNodeFill(
      graph,
      graph.getNodeAttributes('a'),
      visible,
      positions,
      colors,
      false,
    )
    expect(fill.type).toBe('solid')
  })
})
