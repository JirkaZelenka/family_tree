import type Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import type { ForceNodeLayout } from '@/types/vault'
import { layoutVisiblePedigreeU } from '@/lib/layout/force-structure'
import { BIRTH_BAND_SIZE } from '@/lib/layout/sphere-bands'

export const FORCE_HORIZONTAL_SCALE = 172
export const FORCE_PADDING = 40
export const FORCE_TIMELINE_WIDTH = 72
export const FORCE_NODE_WIDTH = 148
export const FORCE_NODE_HEIGHT = 52
export const FORCE_PIXELS_PER_YEAR = 5
export const FORCE_MIN_TIMELINE_HEIGHT = 360
export const FORCE_NODE_GAP_X = 24
export const FORCE_NODE_GAP_Y = 16

export interface ForceNodePosition {
  x: number
  y: number
  lineage: string
  birthYear: number | null
  pinned?: boolean
}

export interface ForceTimelineTick {
  year: number
  y: number
  label: string
}

export interface ForceLayoutResult {
  positions: Map<string, ForceNodePosition>
  timelineTicks: ForceTimelineTick[]
  yearMin: number
  yearMax: number
  contentWidth: number
  width: number
  height: number
}

export function birthYearToCenterY(
  birthYear: number | null,
  yearMin: number,
  yearMax: number,
  timelineHeight: number,
): number {
  const year = birthYear ?? yearMax + 10
  const span = Math.max(yearMax - yearMin, 1)
  const t = (year - yearMin) / span
  return FORCE_PADDING + t * timelineHeight
}

export function buildTimelineTicks(
  yearMin: number,
  yearMax: number,
  timelineHeight: number,
): ForceTimelineTick[] {
  const ticks: ForceTimelineTick[] = []
  const start = Math.floor(yearMin / BIRTH_BAND_SIZE) * BIRTH_BAND_SIZE
  for (let year = start; year <= yearMax + BIRTH_BAND_SIZE; year += BIRTH_BAND_SIZE) {
    const y = birthYearToCenterY(year, yearMin, yearMax, timelineHeight)
    ticks.push({ year, y, label: String(year) })
  }
  return ticks
}

function yearRangeForVisible(
  graph: Graph<PersonNode>,
  visibleIds: Set<string>,
): { yearMin: number; yearMax: number } {
  const years: number[] = []
  for (const id of visibleIds) {
    const y = graph.getNodeAttributes(id).birthYear
    if (y !== null) years.push(y)
  }
  if (years.length === 0) {
    const now = new Date().getFullYear()
    return { yearMin: now - 80, yearMax: now }
  }
  return { yearMin: Math.min(...years), yearMax: Math.max(...years) }
}

function nodeTopLeftY(centerY: number): number {
  return centerY - FORCE_NODE_HEIGHT / 2
}

function rectsOverlap(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  return (
    ax + FORCE_NODE_WIDTH + FORCE_NODE_GAP_X > bx &&
    bx + FORCE_NODE_WIDTH + FORCE_NODE_GAP_X > ax &&
    ay + FORCE_NODE_HEIGHT + FORCE_NODE_GAP_Y > by &&
    by + FORCE_NODE_HEIGHT + FORCE_NODE_GAP_Y > ay
  )
}

export function resolveNodeOverlaps(
  positions: Map<string, ForceNodePosition>,
  visibleIds: Set<string>,
): void {
  const ids = [...visibleIds].filter((id) => {
    const pos = positions.get(id)
    return pos && !pos.pinned
  })
  const minX = FORCE_TIMELINE_WIDTH + FORCE_PADDING

  for (let pass = 0; pass < 80; pass++) {
    let moved = false

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = positions.get(ids[i])!
        const b = positions.get(ids[j])!
        if (a.pinned && b.pinned) continue
        if (!rectsOverlap(a.x, a.y, b.x, b.y)) continue

        const overlapX =
          FORCE_NODE_WIDTH + FORCE_NODE_GAP_X - Math.abs(b.x - a.x)
        const push = Math.max(overlapX / 2 + 1, 8)

        if (!a.pinned && !b.pinned) {
          if (a.x <= b.x) {
            a.x -= push
            b.x += push
          } else {
            a.x += push
            b.x -= push
          }
        } else if (a.pinned) {
          b.x += push * (b.x >= a.x ? 1 : -1)
        } else {
          a.x += push * (a.x >= b.x ? 1 : -1)
        }
        moved = true
      }
    }

    for (const id of ids) {
      const p = positions.get(id)!
      if (p.pinned) continue
      if (p.x < minX) {
        p.x = minX
        moved = true
      }
    }

    if (!moved) break
  }
}

export function computeForceLayout(
  graph: Graph<PersonNode>,
  visibleIds: Set<string>,
  savedNodes: Record<string, ForceNodeLayout> = {},
  autoLayout: Record<string, ForceNodeLayout> = {},
): ForceLayoutResult {
  const { yearMin, yearMax } = yearRangeForVisible(graph, visibleIds)
  const span = Math.max(yearMax - yearMin, 1)
  const timelineHeight = Math.max(span * FORCE_PIXELS_PER_YEAR, FORCE_MIN_TIMELINE_HEIGHT)
  const timelineTicks = buildTimelineTicks(yearMin, yearMax, timelineHeight)

  const uMap = layoutVisiblePedigreeU(graph, visibleIds)
  let minU = Infinity
  let maxU = -Infinity
  for (const u of uMap.values()) {
    minU = Math.min(minU, u)
    maxU = Math.max(maxU, u)
  }
  if (!Number.isFinite(minU)) {
    minU = 0
    maxU = 0
  }

  const positions = new Map<string, ForceNodePosition>()
  const baseX = FORCE_TIMELINE_WIDTH + FORCE_PADDING
  const hasManualPositions = Object.keys(savedNodes).length > 0

  for (const id of visibleIds) {
    const attrs = graph.getNodeAttributes(id)
    const centerY = birthYearToCenterY(attrs.birthYear, yearMin, yearMax, timelineHeight)
    const y = nodeTopLeftY(centerY)
    const manual = savedNodes[id]
    const frozen = autoLayout[id]

    let x: number
    let pinned = false

    if (manual) {
      x = manual.x
      pinned = true
    } else if (hasManualPositions && frozen) {
      x = frozen.x
      pinned = true
    } else {
      const u = uMap.get(id) ?? 0
      x = baseX + (u - minU) * FORCE_HORIZONTAL_SCALE
    }

    positions.set(id, {
      x,
      y,
      lineage: attrs.lineage,
      birthYear: attrs.birthYear,
      pinned: pinned || undefined,
    })
  }

  if (!hasManualPositions) {
    resolveNodeOverlaps(positions, visibleIds)
  }

  let contentWidth = FORCE_TIMELINE_WIDTH + FORCE_PADDING
  let height = FORCE_PADDING + FORCE_NODE_HEIGHT

  for (const pos of positions.values()) {
    contentWidth = Math.max(contentWidth, pos.x + FORCE_NODE_WIDTH + FORCE_PADDING)
    height = Math.max(height, pos.y + FORCE_NODE_HEIGHT + FORCE_PADDING)
  }

  height = Math.max(height, FORCE_PADDING * 2 + timelineHeight)

  return {
    positions,
    timelineTicks,
    yearMin,
    yearMax,
    contentWidth,
    width: contentWidth,
    height,
  }
}
