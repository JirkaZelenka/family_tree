import { describe, it, expect } from 'vitest'
import Graph from 'graphology'
import { layoutLineagePedigree, resolvePlacementLineage, resolveCouplePlane } from '@/lib/layout/sphere-tree'
import type { PersonNode } from '@/types/person'

function person(
  id: string,
  lineage: string,
  birthYear: number,
  opts: Partial<PersonNode> = {},
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
    ...opts,
  }
}

describe('layoutLineagePedigree', () => {
  it('places parents side by side and children in a row below', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode('p1', person('p1', 'test', 1960, { gender: 'male', spouses: ['p2'], children: ['c1', 'c2'] }))
    graph.addNode('p2', person('p2', 'test', 1963, { gender: 'female', spouses: ['p1'], children: ['c1', 'c2'] }))
    graph.addNode('c1', person('c1', 'test', 1990, { parents: ['p1', 'p2'] }))
    graph.addNode('c2', person('c2', 'test', 1993, { parents: ['p1', 'p2'] }))

    const layout = layoutLineagePedigree(graph, 'test')
    const p1 = layout.get('p1')!
    const p2 = layout.get('p2')!
    const c1 = layout.get('c1')!
    const c2 = layout.get('c2')!

    expect(p1.u).toBeLessThan(p2.u)
    expect(c1.u).toBeLessThan(c2.u)
    expect(Math.abs(p1.u - p2.u)).toBeCloseTo(0.12, 2)
    expect(c1.v).toBeGreaterThan(p1.v)
    expect(c2.v).toBeGreaterThan(p1.v)
  })

  it('includes cross-lineage spouse in pedigree layout', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode('p1', person('p1', 'zelenkovi', 1963, { gender: 'male', spouses: ['p2'], children: ['c1'] }))
    graph.addNode('p2', person('p2', 'bartonovi', 1968, { gender: 'female', spouses: ['p1'], children: ['c1'] }))
    graph.addNode('c1', person('c1', 'zelenkovi', 1993, { parents: ['p1', 'p2'] }))

    const layout = layoutLineagePedigree(graph, 'zelenkovi')
    expect(layout.has('p2')).toBe(true)
    const p1 = layout.get('p1')!
    const p2 = layout.get('p2')!
    expect(p1.v).toBe(p2.v)
    expect(Math.abs(p1.u - p2.u)).toBeCloseTo(0.12, 2)
  })

  it('places childless cross-lineage spouses on shared plane', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode('1', person('1', 'zelenkovi', 1993, { spouses: ['13'] }))
    graph.addNode('13', person('13', 'spilkovi', 1995, { spouses: ['1'] }))

    expect(resolvePlacementLineage(graph, '1')).toBe('zelenkovi')
    expect(resolvePlacementLineage(graph, '13')).toBe('zelenkovi')
    expect(resolveCouplePlane(graph, ['1', '13'])).toBe('zelenkovi')
  })
})
