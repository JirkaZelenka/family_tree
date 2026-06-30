import { FORCE_NODE_HEIGHT, FORCE_NODE_WIDTH } from '@/lib/layout/force-layout'

export interface GraphPoint {
  x: number
  y: number
}

export interface GraphRect {
  x1: number
  y1: number
  x2: number
  y2: number
}

export function clientToGraph(
  clientX: number,
  clientY: number,
  svgRect: DOMRect,
  transform: { x: number; y: number; k: number },
): GraphPoint {
  const sx = clientX - svgRect.left
  const sy = clientY - svgRect.top
  return {
    x: (sx - transform.x) / transform.k,
    y: (sy - transform.y) / transform.k,
  }
}

export function graphRectFromClients(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  svgRect: DOMRect,
  transform: { x: number; y: number; k: number },
): GraphRect {
  const a = clientToGraph(x1, y1, svgRect, transform)
  const b = clientToGraph(x2, y2, svgRect, transform)
  return {
    x1: Math.min(a.x, b.x),
    y1: Math.min(a.y, b.y),
    x2: Math.max(a.x, b.x),
    y2: Math.max(a.y, b.y),
  }
}

export function nodeIntersectsGraphRect(
  pos: { x: number; y: number },
  rect: GraphRect,
): boolean {
  const nx = pos.x
  const ny = pos.y
  return !(
    rect.x2 < nx ||
    rect.x1 > nx + FORCE_NODE_WIDTH ||
    rect.y2 < ny ||
    rect.y1 > ny + FORCE_NODE_HEIGHT
  )
}

export function nodesInGraphRect(
  visibleIds: Iterable<string>,
  positions: Map<string, { x: number; y: number }>,
  rect: GraphRect,
): string[] {
  const ids: string[] = []
  for (const id of visibleIds) {
    const pos = positions.get(id)
    if (pos && nodeIntersectsGraphRect(pos, rect)) ids.push(id)
  }
  return ids
}
