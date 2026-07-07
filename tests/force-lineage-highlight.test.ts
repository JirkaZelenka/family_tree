import { describe, expect, it } from 'vitest'
import Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import {
  collectAncestors,
  collectDescendants,
  classifySegmentHighlight,
  computeLineagePathHighlight,
  resolveLineageHighlightColors,
} from '@/lib/layout/force-lineage-highlight'
import { buildForceEdgeSegments } from '@/lib/layout/force-edges'
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

  it('používá barvu rodu; manželské hrany nezvýrazňuje', () => {
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
    expect(downColor).toBe(colors.brazdovi)

    const visible = new Set(['sarka', 'pavel'])
    const positions = new Map([
      ['sarka', { x: 100, y: 200 }],
      ['pavel', { x: 280, y: 200 }],
    ])
    const segments = buildForceEdgeSegments(graph, visible, positions)
    const spouseSeg = segments.find((s) => s.kind === 'spouse')
    const hl = computeLineagePathHighlight(graph, 'sarka', colors)
    expect(classifySegmentHighlight(spouseSeg!, hl)).toBeNull()
  })

  it('nezvýrazní větev ke strýci; sourozence ano jen při výběru rodiče', () => {
    const graph = new Graph<PersonNode>()
    graph.addNode('gp', person('gp', { children: ['parent', 'uncle'] }))
    graph.addNode('parent', person('parent', { parents: ['gp'], children: ['me', 'sibling'] }))
    graph.addNode('uncle', person('uncle', { parents: ['gp'], children: ['cousin'] }))
    graph.addNode('cousin', person('cousin', { parents: ['uncle'] }))
    graph.addNode('me', person('me', { parents: ['parent'] }))
    graph.addNode('sibling', person('sibling', { parents: ['parent'] }))

    const visible = new Set(['gp', 'parent', 'uncle', 'cousin', 'me', 'sibling'])
    const positions = new Map([
      ['gp', { x: 200, y: 40 }],
      ['parent', { x: 120, y: 160 }],
      ['uncle', { x: 360, y: 160 }],
      ['cousin', { x: 400, y: 300 }],
      ['me', { x: 80, y: 300 }],
      ['sibling', { x: 240, y: 300 }],
    ])

    const segments = buildForceEdgeSegments(graph, visible, positions)
    const hl = computeLineagePathHighlight(graph, 'me', colors)

    const uncleBranch = segments.find(
      (s) => s.targetChildId === 'uncle' && s.kind === 'branch',
    )
    const parentBranch = segments.find(
      (s) => s.targetChildId === 'parent' && s.kind === 'branch',
    )
    const cousinBranch = segments.find(
      (s) => s.targetChildId === 'cousin' && s.kind === 'branch',
    )
    const siblingBranch = segments.find(
      (s) => s.targetChildId === 'sibling' && s.kind === 'branch',
    )

    expect(classifySegmentHighlight(uncleBranch!, hl)).toBeNull()
    expect(classifySegmentHighlight(parentBranch!, hl)).toBe('up')
    expect(classifySegmentHighlight(cousinBranch!, hl)).toBeNull()
    expect(classifySegmentHighlight(siblingBranch!, hl)).toBeNull()

    const parentHoriz = segments.find(
      (s) => s.targetChildId === 'parent' && s.id.includes('branch-horiz'),
    )
    expect(parentHoriz).toBeDefined()
    expect(classifySegmentHighlight(parentHoriz!, hl)).toBe('up')

    const uncleHoriz = segments.find(
      (s) => s.targetChildId === 'uncle' && s.id.includes('branch-horiz'),
    )
    if (uncleHoriz) {
      expect(classifySegmentHighlight(uncleHoriz, hl)).toBeNull()
    }

    const hlFromParent = computeLineagePathHighlight(graph, 'parent', colors)
    const meBranch = segments.find((s) => s.targetChildId === 'me' && s.kind === 'branch')
    expect(classifySegmentHighlight(meBranch!, hlFromParent)).toBe('down')
    expect(classifySegmentHighlight(siblingBranch!, hlFromParent)).toBe('down')
    expect(classifySegmentHighlight(cousinBranch!, hlFromParent)).toBeNull()
  })
})
