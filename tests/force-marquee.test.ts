import { describe, expect, it } from 'vitest'
import {
  nodeIntersectsGraphRect,
  nodesInGraphRect,
} from '@/lib/layout/force-marquee'
import { FORCE_NODE_HEIGHT, FORCE_NODE_WIDTH } from '@/lib/layout/force-layout'

describe('force-marquee', () => {
  it('detekuje průnik uzlu s výběrovým obdélníkem', () => {
    const rect = { x1: 100, y1: 50, x2: 200, y2: 120 }
    expect(nodeIntersectsGraphRect({ x: 120, y: 60 }, rect)).toBe(true)
    expect(
      nodeIntersectsGraphRect(
        { x: 300, y: 60 },
        rect,
      ),
    ).toBe(false)
    expect(
      nodeIntersectsGraphRect(
        { x: 90, y: 60 },
        { x1: 0, y1: 0, x2: 89, y2: 200 },
      ),
    ).toBe(false)
    expect(
      nodeIntersectsGraphRect(
        { x: 195, y: 60 },
        { x1: 0, y1: 0, x2: 194, y2: 200 },
      ),
    ).toBe(false)
    expect(
      nodeIntersectsGraphRect(
        { x: 100, y: 60 },
        {
          x1: 100 + FORCE_NODE_WIDTH + 1,
          y1: 0,
          x2: 300,
          y2: 200,
        },
      ),
    ).toBe(false)
  })

  it('vrátí viditelné uzly uvnitř obdélníku', () => {
    const positions = new Map([
      ['a', { x: 110, y: 70 }],
      ['b', { x: 400, y: 70 }],
    ])
    const rect = { x1: 100, y1: 50, x2: 250, y2: 150 }
    expect(nodesInGraphRect(new Set(['a', 'b']), positions, rect)).toEqual(['a'])
  })
})
