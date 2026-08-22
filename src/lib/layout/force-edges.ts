import type Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import { collectFamilyUnits } from '@/lib/layout/sphere-tree'
import { spouseIds } from '@/lib/graph/person-links'
import { FORCE_NODE_HEIGHT, FORCE_NODE_WIDTH } from '@/lib/layout/force-layout'
import {
  isMarriageVisibleAtYear,
  resolveMarriageYear,
} from '@/lib/time/dates'

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
  /** Rok sňatku (odhadnutý), jen u `spouse`. */
  marriageYear?: number | null
}

export interface BuildForceEdgeOptions {
  currentYear?: number
  showAll?: boolean
}

function nodeTopCenter(pos: { x: number; y: number }) {
  return { x: pos.x + FORCE_NODE_WIDTH / 2, y: pos.y }
}

function nodeCenter(pos: { x: number; y: number }) {
  return { x: pos.x + FORCE_NODE_WIDTH / 2, y: pos.y + FORCE_NODE_HEIGHT / 2 }
}

function marriageDateBetween(a: PersonNode, b: PersonNode): string {
  for (const s of a.spouses) {
    if (typeof s === 'string') {
      if (s === b.id) return ''
      continue
    }
    if (s.id === b.id) return s.marriageDate ?? ''
  }
  for (const s of b.spouses) {
    if (typeof s === 'string') {
      if (s === a.id) return ''
      continue
    }
    if (s.id === a.id) return s.marriageDate ?? ''
  }
  return ''
}

function sharedChildBirthYears(
  graph: Graph<PersonNode>,
  a: PersonNode,
  b: PersonNode,
): number[] {
  const years: number[] = []
  for (const childId of a.children) {
    if (!b.children.includes(childId) || !graph.hasNode(childId)) continue
    const y = graph.getNodeAttributes(childId).birthYear
    if (y !== null) years.push(y)
  }
  return years
}

function marriageYearForCouple(
  graph: Graph<PersonNode>,
  idA: string,
  idB: string,
): number | null {
  if (!graph.hasNode(idA) || !graph.hasNode(idB)) return null
  const a = graph.getNodeAttributes(idA)
  const b = graph.getNodeAttributes(idB)
  return resolveMarriageYear(marriageDateBetween(a, b), {
    birthYearA: a.birthYear,
    birthYearB: b.birthYear,
    childBirthYears: sharedChildBirthYears(graph, a, b),
  })
}

function shouldShowSpouseAtYear(
  marriageYear: number | null,
  opts?: BuildForceEdgeOptions,
): boolean {
  if (opts?.showAll) return true
  if (opts?.currentYear == null) return true
  return isMarriageVisibleAtYear(marriageYear, opts.currentYear)
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

function pushSpouseSegment(
  segments: ForceEdgeSegment[],
  seenSpouse: Set<string>,
  graph: Graph<PersonNode>,
  idA: string,
  idB: string,
  positions: Map<string, { x: number; y: number }>,
  opts?: BuildForceEdgeOptions,
): void {
  const spouseKey = [idA, idB].sort().join('--')
  if (seenSpouse.has(spouseKey)) return
  seenSpouse.add(spouseKey)

  const marriageYear = marriageYearForCouple(graph, idA, idB)
  if (!shouldShowSpouseAtYear(marriageYear, opts)) return

  const pa = positions.get(idA)
  const pb = positions.get(idB)
  if (!pa || !pb) return

  segments.push({
    id: `spouse-${spouseKey}`,
    kind: 'spouse',
    spouseIds: [idA, idB],
    marriageYear,
    points: [nodeCenter(pa), nodeCenter(pb)],
  })
}

export function buildForceEdgeSegments(
  graph: Graph<PersonNode>,
  visibleIds: Set<string>,
  positions: Map<string, { x: number; y: number }>,
  opts?: BuildForceEdgeOptions,
): ForceEdgeSegment[] {
  const segments: ForceEdgeSegment[] = []
  const seenSpouse = new Set<string>()

  for (const unit of collectVisibleFamilyUnits(graph, visibleIds)) {
    const unitKey = `${unit.parentIds.sort().join('|')}=>${unit.childIds.sort().join('|')}`

    if (unit.parentIds.length === 2) {
      const [a, b] = unit.parentIds
      pushSpouseSegment(segments, seenSpouse, graph, a, b, positions, opts)
    }

    segments.push(...buildDescentRake(unit.parentIds, unit.childIds, positions, unitKey))
  }

  graph.forEachNode((id, attrs) => {
    if (!visibleIds.has(id)) return
    for (const sid of spouseIds(attrs.spouses)) {
      if (!sid || !visibleIds.has(sid)) continue
      pushSpouseSegment(segments, seenSpouse, graph, id, sid, positions, opts)
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

function hash01(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

/** Mírně prohnutá inkoustová křivka místo rovných hrábí. */
export function historicalPathD(segment: ForceEdgeSegment): string {
  const points = segment.points
  if (points.length < 2) return ''

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    if (len < 0.5) {
      d += ` L ${b.x} ${b.y}`
      continue
    }
    const nx = -dy / len
    const ny = dx / len
    const bowSign = hash01(`${segment.id}:${i}`) > 0.5 ? 1 : -1
    const bow = bowSign * Math.min(16, Math.max(5, len * 0.1))
    const c1x = a.x + dx * 0.33 + nx * bow
    const c1y = a.y + dy * 0.33 + ny * bow
    const c2x = a.x + dx * 0.67 + nx * bow
    const c2y = a.y + dy * 0.67 + ny * bow
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${b.x} ${b.y}`
  }
  return d
}

export function offsetSegmentPoints(
  points: Array<{ x: number; y: number }>,
  offset: number,
): Array<{ x: number; y: number }> {
  if (points.length < 2) return points
  const result: Array<{ x: number; y: number }> = []
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    const dx = next.x - prev.x
    const dy = next.y - prev.y
    const len = Math.hypot(dx, dy) || 1
    result.push({
      x: points[i].x + (-dy / len) * offset,
      y: points[i].y + (dx / len) * offset,
    })
  }
  return result
}

export function historicalOffsetPathD(segment: ForceEdgeSegment, offset: number): string {
  return historicalPathD({
    ...segment,
    points: offsetSegmentPoints(segment.points, offset),
  })
}

export function segmentMidpoint(segment: ForceEdgeSegment): { x: number; y: number } {
  const pts = segment.points
  if (pts.length === 0) return { x: 0, y: 0 }
  if (pts.length === 1) return pts[0]

  let total = 0
  const lens: number[] = []
  for (let i = 1; i < pts.length; i++) {
    const length = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    lens.push(length)
    total += length
  }

  let remain = total / 2
  for (let i = 1; i < pts.length; i++) {
    const length = lens[i - 1]
    if (remain <= length || i === pts.length - 1) {
      const t = length === 0 ? 0 : remain / length
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t,
      }
    }
    remain -= length
  }
  return pts[pts.length - 1]
}
