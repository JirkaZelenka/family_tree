import { describe, expect, it } from 'vitest'
import Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import { buildForceEdgeSegments } from '@/lib/layout/force-edges'
import { FORCE_NODE_HEIGHT, FORCE_NODE_WIDTH } from '@/lib/layout/force-layout'

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

describe('buildForceEdgeSegments', () => {
  it('vykreslí hrábě mezi rodiči a sourozenci', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode(
      'dad',
      person('dad', {
        spouses: ['mom'],
        children: ['c1', 'c2'],
        birthYear: 1963,
      }),
    )
    graph.addNode(
      'mom',
      person('mom', {
        lineage: 'bartonovi',
        spouses: ['dad'],
        children: ['c1', 'c2'],
        birthYear: 1968,
      }),
    )
    graph.addNode('c1', person('c1', { parents: ['dad', 'mom'], birthYear: 1993 }))
    graph.addNode('c2', person('c2', { parents: ['dad', 'mom'], birthYear: 1996 }))

    const visible = new Set(['dad', 'mom', 'c1', 'c2'])
    const positions = new Map([
      ['dad', { x: 100, y: 50 }],
      ['mom', { x: 280, y: 55 }],
      ['c1', { x: 120, y: 200 }],
      ['c2', { x: 300, y: 205 }],
    ])

    const segments = buildForceEdgeSegments(graph, visible, positions)
    const spouse = segments.find((s) => s.kind === 'spouse')
    const descent = segments.find((s) => s.kind === 'descent')
    const horizontals = segments.filter((s) => s.id.includes('branch-horiz'))
    const childBranches = segments.filter(
      (s) => s.kind === 'branch' && s.id.includes('branch-') && !s.id.includes('branch-horiz'),
    )

    expect(spouse).toBeDefined()
    const midY = 50 + FORCE_NODE_HEIGHT / 2
    expect(spouse!.points[0].y).toBe(midY)
    expect(spouse!.points[1].y).toBe(55 + FORCE_NODE_HEIGHT / 2)
    expect(descent).toBeDefined()
    expect(horizontals.length).toBeGreaterThanOrEqual(2)
    expect(childBranches.length).toBeGreaterThanOrEqual(2)

    const barY = horizontals[0]!.points[0].y
    expect(descent!.points[1].y).toBe(barY)
    expect(horizontals[0]!.points[0].x).not.toBe(horizontals[0]!.points[1].x)
  })

  it('nepřidá dvojité linky od každého rodiče ke každému dítěti', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode('dad', person('dad', { children: ['c1', 'c2'] }))
    graph.addNode('c1', person('c1', { parents: ['dad'] }))
    graph.addNode('c2', person('c2', { parents: ['dad'] }))

    const visible = new Set(['dad', 'c1', 'c2'])
    const positions = new Map([
      ['dad', { x: 200, y: 40 }],
      ['c1', { x: 100, y: 180 }],
      ['c2', { x: 300, y: 185 }],
    ])

    const segments = buildForceEdgeSegments(graph, visible, positions)
    const parentChildLike = segments.filter((s) => s.kind !== 'spouse')
    expect(parentChildLike.length).toBeLessThan(6)
    expect(segments.some((s) => s.kind === 'descent')).toBe(true)
  })

  it('ukáže růžovou spojnici až od roku sňatku', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode(
      'dad',
      person('dad', {
        spouses: [{ id: 'mom', marriageDate: '1964' }],
        children: ['c1'],
        birthYear: 1940,
      }),
    )
    graph.addNode(
      'mom',
      person('mom', {
        lineage: 'bartonovi',
        spouses: [{ id: 'dad', marriageDate: '1964' }],
        children: ['c1'],
        birthYear: 1942,
      }),
    )
    graph.addNode('c1', person('c1', { parents: ['dad', 'mom'], birthYear: 1965 }))

    const visible = new Set(['dad', 'mom', 'c1'])
    const positions = new Map([
      ['dad', { x: 100, y: 50 }],
      ['mom', { x: 280, y: 55 }],
      ['c1', { x: 180, y: 200 }],
    ])

    const before = buildForceEdgeSegments(graph, visible, positions, {
      currentYear: 1963,
    })
    expect(before.some((s) => s.kind === 'spouse')).toBe(false)

    const after = buildForceEdgeSegments(graph, visible, positions, {
      currentYear: 1964,
    })
    expect(after.some((s) => s.kind === 'spouse')).toBe(true)

    const showAll = buildForceEdgeSegments(graph, visible, positions, {
      currentYear: 1963,
      showAll: true,
    })
    expect(showAll.some((s) => s.kind === 'spouse')).toBe(true)
  })
})
