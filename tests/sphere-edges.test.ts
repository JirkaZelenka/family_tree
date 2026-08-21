import { describe, it, expect } from 'vitest'
import Graph from 'graphology'
import { buildTreeEdges, styleForTreeEdge } from '@/lib/layout/sphere-edges'
import type { LineagePlane } from '@/lib/layout/sphere'

const plane: LineagePlane = {
  lineage: 'test',
  normal: [0, 0, 1],
  tangentU: [1, 0, 0],
  tangentV: [0, 1, 0],
  anchorTheta: 0,
  anchorPhi: Math.PI / 2,
}

describe('buildTreeEdges', () => {
  it('always draws pink spouse line between married couple', () => {
    const graph = new Graph()
    graph.addNode('a', { spouses: ['b'], parents: [], children: [] })
    graph.addNode('b', { spouses: ['a'], parents: [], children: [] })

    const positions = new Map([
      [
        'a',
        {
          x: -0.06,
          y: 0,
          z: 0.5,
          layoutU: -0.06,
          treeRadius: 0.5,
          displayPlane: 'test',
        },
      ],
      [
        'b',
        {
          x: 0.06,
          y: 0,
          z: 0.5,
          layoutU: 0.06,
          treeRadius: 0.5,
          displayPlane: 'test',
        },
      ],
    ]) as never

    const segs = buildTreeEdges(graph as never, positions, new Map([['test', plane]]))
    const spouse = segs.filter((s) => s.kind === 'spouse')
    expect(spouse).toHaveLength(1)
    expect(spouse[0].points[0].x).toBeCloseTo(-0.06)
    expect(spouse[0].points[1].x).toBeCloseTo(0.06)
  })

  it('přepíná barvy hran mezi historickým a moderním režimem', () => {
    expect(styleForTreeEdge('spouse', true, 'modern').color).toBe('#f43f5e')
    expect(styleForTreeEdge('descent', true, 'modern').color).toBe('#f8fafc')
    expect(styleForTreeEdge('spouse', true, 'heritage').color).toBe('#c45c72')
    expect(styleForTreeEdge('descent', true, 'heritage').color).toBe('#d7c4a3')
  })
})
