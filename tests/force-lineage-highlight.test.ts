import { describe, expect, it } from 'vitest'
import Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import {
  collectAncestors,
  collectDescendants,
  computeLineagePathHighlight,
  resolveLineageHighlightColors,
} from '@/lib/layout/force-lineage-highlight'
import { SMALL_LINEAGE_COLOR } from '@/lib/vault/lineage-colors'

function person(id: string, extra: Partial<PersonNode> = {}): PersonNode {
  return {
    id,
    slug: id,
    givenName: id,
    gender: 'unknown',
    lineage: 'brazdovi',
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

describe('force-lineage-highlight', () => {
  const colors = {
    brazdovi: '#fb923c',
    nagyovi: SMALL_LINEAGE_COLOR,
    bartonovi: '#e879f9',
  }

  it('sbírá předky a potomky', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode('gp', person('gp', { children: ['p'] }))
    graph.addNode('p', person('p', { parents: ['gp'], children: ['c'] }))
    graph.addNode('c', person('c', { parents: ['p'], children: ['gc'] }))
    graph.addNode('gc', person('gc', { parents: ['c'] }))

    expect([...collectAncestors(graph, 'c')]).toEqual(['p', 'gp'])
    expect([...collectDescendants(graph, 'p')]).toEqual(['c', 'gc'])
  })

  it('Šárka: nahoru oranžová, dolů žlutá (nagyovi)', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode(
      'sarka',
      person('sarka', {
        lineage: 'brazdovi',
        familyName: 'Nagyova',
        spouses: ['pavel'],
      }),
    )
    graph.addNode('pavel', person('pavel', { lineage: 'nagyovi', familyName: 'Nagy', spouses: ['sarka'] }))

    const { upColor, downColor } = resolveLineageHighlightColors(
      graph,
      graph.getNodeAttributes('sarka'),
      colors,
    )
    expect(upColor).toBe(colors.brazdovi)
    expect(downColor).toBe(colors.nagyovi)

    const hl = computeLineagePathHighlight(graph, 'sarka', colors)
    expect(hl.spouseDownKeys.has('pavel--sarka')).toBe(true)
  })
})
