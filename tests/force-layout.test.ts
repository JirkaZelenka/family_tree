import { describe, expect, it } from 'vitest'
import Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import {
  computeForceLayout,
  FORCE_NODE_GAP_X,
  FORCE_NODE_GAP_Y,
  FORCE_NODE_HEIGHT,
  FORCE_NODE_WIDTH,
  resolveNodeOverlaps,
} from '@/lib/layout/force-layout'
import { layoutVisiblePedigreeU } from '@/lib/layout/force-structure'

function person(
  id: string,
  lineage: string,
  birthYear: number,
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
    birthYear,
    deathYear: null,
    body: '',
    filePath: '',
    ...extra,
  }
}

function overlaps(positions: Map<string, { x: number; y: number }>): boolean {
  const ids = [...positions.keys()]
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = positions.get(ids[i])!
      const b = positions.get(ids[j])!
      const overlapX = FORCE_NODE_WIDTH + FORCE_NODE_GAP_X - Math.abs(b.x - a.x)
      const overlapY = FORCE_NODE_HEIGHT + FORCE_NODE_GAP_Y - Math.abs(b.y - a.y)
      if (overlapX > 0 && overlapY > 0) return true
    }
  }
  return false
}

describe('computeForceLayout', () => {
  it('umístí starší osobu výš než mladší', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode('old', person('old', 'novak', 1940))
    graph.addNode('young', person('young', 'novak', 1990, { parents: ['old'] }))

    const visible = new Set(['old', 'young'])
    const layout = computeForceLayout(graph, visible)

    const oldY = layout.positions.get('old')!.y
    const youngY = layout.positions.get('young')!.y
    expect(oldY).toBeLessThan(youngY)
  })

  it('po rozložení se uzly nepřekrývají', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode('a', person('a', 'novak', 1990))
    graph.addNode('b', person('b', 'novak', 1990))
    graph.addNode('c', person('c', 'novak', 1991))
    graph.addNode('d', person('d', 'novak', 1991, { spouses: ['c'] }))

    const visible = new Set(['a', 'b', 'c', 'd'])
    const layout = computeForceLayout(graph, visible)
    expect(overlaps(layout.positions)).toBe(false)
  })

  it('manželé mají blízké x', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode('a', person('a', 'novak', 1990, { spouses: ['b'] }))
    graph.addNode('b', person('b', 'novak', 1992, { spouses: ['a'] }))

    const visible = new Set(['a', 'b'])
    const u = layoutVisiblePedigreeU(graph, visible)
    expect(Math.abs((u.get('a') ?? 0) - (u.get('b') ?? 0))).toBeLessThan(0.2)
  })

  it('při ručním posunu jednoho uzlu ostatní zůstanou na místě', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode('a', person('a', 'novak', 1990))
    graph.addNode('b', person('b', 'novak', 1990))
    graph.addNode('c', person('c', 'novak', 1991))

    const visible = new Set(['a', 'b', 'c'])
    const initial = computeForceLayout(graph, visible)
    const auto: Record<string, { x: number }> = {}
    for (const [id, pos] of initial.positions) {
      auto[id] = { x: pos.x }
    }

    const moved = computeForceLayout(graph, visible, { a: { x: auto.a.x + 240 } }, auto)

    expect(moved.positions.get('b')!.x).toBe(initial.positions.get('b')!.x)
    expect(moved.positions.get('c')!.x).toBe(initial.positions.get('c')!.x)
    expect(moved.positions.get('a')!.x).toBe(auto.a.x + 240)
  })

  it('resolveNodeOverlaps oddělí překrývající se uzly', () => {
    const positions = new Map([
      ['a', { x: 100, y: 100, lineage: 'x', birthYear: 1990 }],
      ['b', { x: 110, y: 105, lineage: 'x', birthYear: 1990 }],
    ])
    resolveNodeOverlaps(positions, new Set(['a', 'b']))
    expect(overlaps(positions)).toBe(false)
  })
})
