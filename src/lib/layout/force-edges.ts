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
