import type Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import { collectFamilyUnits } from '@/lib/layout/sphere-tree'
import { spouseIds } from '@/lib/graph/person-links'
import { FORCE_NODE_HEIGHT, FORCE_NODE_WIDTH } from '@/lib/layout/force-layout'

export type ForceEdgeKind = 'spouse' | 'descent' | 'branch'

export interface ForceEdgeSegment {
  id: string
  kind: ForceEdgeKind
  points: Array<{ x: number; y: number }>
  parentIds?: string[]
  childIds?: string[]
  spouseIds?: string[]
  /** Konkrétní dítě u svislé větve hráběte (ne celá rodinná jednotka). */
  targetChildId?: string
}

function nodeTopCenter(pos: { x: number; y: number }) {
  return { x: pos.x + FORCE_NODE_WIDTH / 2, y: pos.y }
}

function nodeCenter(pos: { x: number; y: number }) {
  return { x: pos.x + FORCE_NODE_WIDTH / 2, y: pos.y + FORCE_NODE_HEIGHT / 2 }
}

function collectVisibleFamilyUnits(
  graph: Graph<PersonNode>,
  visibleIds: Set<string>,
): Array<{ parentIds: string[]; childIds: string[] }> {
  const units: Array<{ parentIds: string[]; childIds: string[] }> = []
  const seen = new Set<string>()
  const lineages = new Set<string>()

  for (const id of visibleIds) {
    lineages.add(graph.getNodeAttributes(id).lineage)
  }

  for (const lineage of lineages) {
    for (const unit of collectFamilyUnits(graph, lineage)) {
      const visibleParents = unit.parentIds.filter((pid) => visibleIds.has(pid))
      const visibleChildren = unit.childIds.filter((cid) => visibleIds.has(cid))
      if (visibleParents.length === 0 || visibleChildren.length === 0) continue

      const key = `${[...visibleParents].sort().join('|')}=>${[...visibleChildren].sort().join('|')}`
      if (seen.has(key)) continue
      seen.add(key)
      units.push({ parentIds: visibleParents, childIds: visibleChildren })
    }
  }

  return units
}

function buildDescentRake(
  parentIds: string[],
  childIds: string[],
  positions: Map<string, { x: number; y: number }>,
  unitKey: string,
): ForceEdgeSegment[] {
  const parentPts = parentIds
    .map((id) => positions.get(id))
    .filter((p): p is { x: number; y: number } => !!p)
    .map(nodeCenter)

  const visibleChildIds = childIds.filter((id) => positions.has(id))
  const childPts = visibleChildIds
    .map((id) => positions.get(id)!)
    .map(nodeTopCenter)

  if (parentPts.length === 0 || childPts.length === 0) return []

  const stemX = parentPts.reduce((s, p) => s + p.x, 0) / parentPts.length
  const stemStartY = Math.max(...parentPts.map((p) => p.y))
  const minChildY = Math.min(...childPts.map((p) => p.y))
  const barY = stemStartY + (minChildY - stemStartY) * 0.5

  const segments: ForceEdgeSegment[] = [
    {
      id: `descent-${unitKey}`,
      kind: 'descent',
      parentIds: [...parentIds],
      childIds: [...childIds],
      points: [
        { x: stemX, y: stemStartY },
        { x: stemX, y: barY },
      ],
    },
  ]

  if (childPts.length === 1) {
    segments.push({
      id: `branch-${unitKey}-0`,
      kind: 'branch',
      parentIds: [...parentIds],
      childIds: [...childIds],
      targetChildId: visibleChildIds[0],
      points: [
        { x: stemX, y: barY },
        childPts[0],
      ],
    })
    return segments
  }

  childPts.forEach((child, i) => {
    if (Math.abs(child.x - stemX) > 0.5) {
      segments.push({
        id: `branch-horiz-${unitKey}-${i}`,
        kind: 'branch',
        parentIds: [...parentIds],
        childIds: [...childIds],
        targetChildId: visibleChildIds[i],
        points: [
          { x: stemX, y: barY },
          { x: child.x, y: barY },
        ],
      })
    }

    segments.push({
      id: `branch-${unitKey}-${i}`,
      kind: 'branch',
      parentIds: [...parentIds],
      childIds: [...childIds],
      targetChildId: visibleChildIds[i],
      points: [
        { x: child.x, y: barY },
        child,
      ],
    })
  })

  return segments
}

export function buildForceEdgeSegments(
  graph: Graph<PersonNode>,
  visibleIds: Set<string>,
  positions: Map<string, { x: number; y: number }>,
): ForceEdgeSegment[] {
  const segments: ForceEdgeSegment[] = []
  const seenSpouse = new Set<string>()

  for (const unit of collectVisibleFamilyUnits(graph, visibleIds)) {
    const unitKey = `${unit.parentIds.sort().join('|')}=>${unit.childIds.sort().join('|')}`

    if (unit.parentIds.length === 2) {
      const [a, b] = unit.parentIds
      const spouseKey = [a, b].sort().join('--')
      if (!seenSpouse.has(spouseKey)) {
        seenSpouse.add(spouseKey)
        const pa = positions.get(a)
        const pb = positions.get(b)
        if (pa && pb) {
          segments.push({
            id: `spouse-${spouseKey}`,
            kind: 'spouse',
            spouseIds: [a, b],
            points: [nodeCenter(pa), nodeCenter(pb)],
          })
        }
      }
    }

    segments.push(...buildDescentRake(unit.parentIds, unit.childIds, positions, unitKey))
  }

  graph.forEachNode((id, attrs) => {
    if (!visibleIds.has(id)) return
    for (const sid of spouseIds(attrs.spouses)) {
      if (!sid || !visibleIds.has(sid)) continue
      const key = [id, sid].sort().join('--')
      if (seenSpouse.has(key)) continue
      seenSpouse.add(key)

      const pa = positions.get(id)
      const pb = positions.get(sid)
      if (!pa || !pb) continue

      segments.push({
        id: `spouse-${key}`,
        kind: 'spouse',
        spouseIds: [id, sid],
        points: [nodeCenter(pa), nodeCenter(pb)],
      })
    }
  })

  return segments
}

function segmentToPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return ''
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')
}

export function segmentPathD(segment: ForceEdgeSegment): string {
  return segmentToPath(segment.points)
}
