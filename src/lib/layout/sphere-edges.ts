import * as THREE from 'three'
import Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import type { LineagePlane, SpherePosition } from '@/lib/layout/sphere'
import { layoutPointTo3D } from '@/lib/layout/sphere'
import { resolveCouplePlane } from '@/lib/layout/sphere-tree'
import { spouseIds } from '@/lib/graph/person-links'

export type TreeEdgeKind = 'spouse' | 'descent' | 'branch'

export interface TreeEdgeSegment {
  points: THREE.Vector3[]
  kind: TreeEdgeKind
}

function ballVec(p: SpherePosition): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.y, p.z)
}

function toVec3(plane: LineagePlane, u: number, r: number): THREE.Vector3 {
  const p = layoutPointTo3D(u, r, plane)
  return new THREE.Vector3(p.x, p.y, p.z)
}

function avgU(pts: Array<{ u: number }>): number {
  return pts.reduce((s, p) => s + p.u, 0) / Math.max(pts.length, 1)
}

/** Svislík + větev sourozenců – konce u kuliček dětí, ne ve vzduchu. */
function buildDescentRake(
  plane: LineagePlane,
  parentPositions: SpherePosition[],
  childPositions: SpherePosition[],
): TreeEdgeSegment[] {
  if (parentPositions.length === 0 || childPositions.length === 0) return []

  const parentPts = parentPositions.map((p) => ({ u: p.layoutU, r: p.treeRadius }))
  const childPts = childPositions.map((p) => ({ u: p.layoutU, r: p.treeRadius }))

  const midU = avgU(parentPts)
  const parentRowR = parentPts[0].r
  const minChildR = Math.min(...childPts.map((c) => c.r))
  const barR = (parentRowR + minChildR) / 2

  const stemStart = new THREE.Vector3()
  for (const p of parentPositions) stemStart.add(ballVec(p))
  stemStart.divideScalar(parentPositions.length)

  const segments: TreeEdgeSegment[] = []

  segments.push({
    kind: 'descent',
    points: [stemStart, toVec3(plane, midU, barR)],
  })

  if (childPositions.length === 1) {
    segments.push({
      kind: 'branch',
      points: [toVec3(plane, midU, barR), ballVec(childPositions[0])],
    })
    return segments
  }

  const childUs = childPts.map((c) => c.u)
  const minU = Math.min(...childUs)
  const maxU = Math.max(...childUs)

  segments.push({
    kind: 'branch',
    points: [toVec3(plane, minU, barR), toVec3(plane, maxU, barR)],
  })

  for (const child of childPositions) {
    segments.push({
      kind: 'branch',
      points: [toVec3(plane, child.layoutU, barR), ballVec(child)],
    })
  }

  return segments
}

export interface ParentChildGroup {
  parentIds: string[]
  childIds: string[]
  planeLineage: string
}

export function groupChildrenByParents(graph: Graph<PersonNode>): ParentChildGroup[] {
  const byParents = new Map<string, string[]>()

  graph.forEachNode((childId, attrs) => {
    const parents = attrs.parents.filter((p) => p && graph.hasNode(p)).sort()
    if (parents.length === 0) return
    const key = parents.join('|')
    const list = byParents.get(key) ?? []
    list.push(childId)
    byParents.set(key, list)
  })

  return [...byParents.entries()].map(([key, childIds]) => ({
    parentIds: key.split('|'),
    childIds: childIds.sort((a, b) => {
      const ya = graph.getNodeAttributes(a).birthYear ?? 9999
      const yb = graph.getNodeAttributes(b).birthYear ?? 9999
      return ya - yb
    }),
    planeLineage: resolveCouplePlane(graph, key.split('|')),
  }))
}

/**
 * Všechny hrany stromu:
 * 1) každý manželský pár = růžová linka mezi kuličkami (vždy)
 * 2) každá skupina rodič→děti = hrábě (bez duplicitní manželské linky)
 */
export function buildTreeEdges(
  graph: Graph<PersonNode>,
  positions: Map<string, SpherePosition>,
  lineagePlanes: Map<string, LineagePlane>,
): TreeEdgeSegment[] {
  const segments: TreeEdgeSegment[] = []
  const spouseDone = new Set<string>()

  graph.forEachNode((id, attrs) => {
    for (const sid of spouseIds(attrs.spouses)) {
      if (!graph.hasNode(sid)) continue
      const key = [id, sid].sort().join('--')
      if (spouseDone.has(key)) continue
      spouseDone.add(key)

      const pa = positions.get(id)
      const pb = positions.get(sid)
      if (!pa || !pb) continue

      segments.push({
        kind: 'spouse',
        points: [ballVec(pa), ballVec(pb)],
      })
    }
  })

  for (const group of groupChildrenByParents(graph)) {
    const plane = lineagePlanes.get(group.planeLineage)
    if (!plane) continue

    const parentPositions = group.parentIds
      .map((id) => positions.get(id))
      .filter((p): p is SpherePosition => !!p)
    const childPositions = group.childIds
      .map((id) => positions.get(id))
      .filter((p): p is SpherePosition => !!p)

    if (parentPositions.length === 0 || childPositions.length === 0) continue

    segments.push(...buildDescentRake(plane, parentPositions, childPositions))
  }

  return segments
}

function edgeStyle(kind: TreeEdgeKind, active: boolean) {
  switch (kind) {
    case 'spouse':
      return { color: '#c45c72', lineWidth: active ? 2.2 : 1.2, opacity: active ? 0.9 : 0.45 }
    case 'descent':
      return { color: '#d7c4a3', lineWidth: active ? 1.7 : 1.0, opacity: active ? 0.92 : 0.42 }
    case 'branch':
      return { color: '#c4a35a', lineWidth: active ? 1.35 : 0.8, opacity: active ? 0.88 : 0.36 }
  }
}

export function styleForTreeEdge(kind: TreeEdgeKind, active: boolean) {
  return edgeStyle(kind, active)
}
