import type { PersonNode } from '@/types/person'
import { siblingIds, spouseIds } from '@/lib/graph/person-links'
import {
  FORCE_NODE_HEIGHT,
  FORCE_NODE_WIDTH,
  type ForceNodePosition,
} from '@/lib/layout/force-layout'

export interface ViewTransform {
  x: number
  y: number
  k: number
}

/** Rodinné okolí: 2 generace nahoru/dolů + partneři a sourozenci. */
export function collectFocusNeighborhood(
  personId: string,
  persons: Map<string, PersonNode>,
  generations = 2,
): Set<string> {
  const result = new Set<string>([personId])

  let frontier = [personId]
  for (let g = 0; g < generations; g++) {
    const next: string[] = []
    for (const id of frontier) {
      const person = persons.get(id)
      if (!person) continue
      for (const parentId of person.parents) {
        if (!parentId || result.has(parentId)) continue
        result.add(parentId)
        next.push(parentId)
      }
    }
    frontier = next
  }

  frontier = [personId]
  for (let g = 0; g < generations; g++) {
    const next: string[] = []
    for (const id of frontier) {
      const person = persons.get(id)
      if (!person) continue
      for (const childId of person.children) {
        if (!childId || result.has(childId)) continue
        result.add(childId)
        next.push(childId)
      }
    }
    frontier = next
  }

  const focus = persons.get(personId)
  if (!focus) return result

  for (const id of spouseIds(focus.spouses)) result.add(id)
  for (const id of siblingIds(focus, persons)) result.add(id)

  for (const parentId of focus.parents) {
    const parent = persons.get(parentId)
    if (!parent) continue
    for (const id of spouseIds(parent.spouses)) result.add(id)
    for (const id of siblingIds(parent, persons)) result.add(id)
  }

  for (const childId of focus.children) {
    const child = persons.get(childId)
    if (!child) continue
    for (const id of spouseIds(child.spouses)) result.add(id)
  }

  return result
}

export function transformToFocusPerson(
  personId: string,
  positions: Map<string, ForceNodePosition>,
  persons: Map<string, PersonNode>,
  viewW: number,
  viewH: number,
): ViewTransform | null {
  const focusPos = positions.get(personId)
  if (!focusPos) return null

  const neighborhood = collectFocusNeighborhood(personId, persons, 2)
  let minX = focusPos.x
  let minY = focusPos.y
  let maxX = focusPos.x + FORCE_NODE_WIDTH
  let maxY = focusPos.y + FORCE_NODE_HEIGHT
  let found = false

  for (const id of neighborhood) {
    const pos = positions.get(id)
    if (!pos) continue
    found = true
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    maxX = Math.max(maxX, pos.x + FORCE_NODE_WIDTH)
    maxY = Math.max(maxY, pos.y + FORCE_NODE_HEIGHT)
  }

  if (!found) {
    minX = focusPos.x
    minY = focusPos.y
    maxX = focusPos.x + FORCE_NODE_WIDTH
    maxY = focusPos.y + FORCE_NODE_HEIGHT
  }

  const padX = 48
  const padY = 36
  const contentW = Math.max(maxX - minX + padX * 2, FORCE_NODE_WIDTH * 3)
  const contentH = Math.max(maxY - minY + padY * 2, FORCE_NODE_HEIGHT * 5)
  const k = Math.min(
    1.85,
    Math.max(0.55, Math.min((viewW - 24) / contentW, (viewH - 24) / contentH)),
  )

  const cx = focusPos.x + FORCE_NODE_WIDTH / 2
  const cy = focusPos.y + FORCE_NODE_HEIGHT / 2
  return {
    k,
    x: viewW / 2 - cx * k,
    y: viewH / 2 - cy * k,
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** Plynulá interpolace kamery; vrací cancel funkci. */
export function animateViewTransform(
  from: ViewTransform,
  to: ViewTransform,
  durationMs: number,
  onFrame: (next: ViewTransform) => void,
  onDone?: () => void,
): () => void {
  let raf = 0
  let cancelled = false
  const start = performance.now()

  const tick = (now: number) => {
    if (cancelled) return
    const t = Math.min(1, (now - start) / durationMs)
    const e = easeInOutCubic(t)
    onFrame({
      x: from.x + (to.x - from.x) * e,
      y: from.y + (to.y - from.y) * e,
      k: from.k + (to.k - from.k) * e,
    })
    if (t < 1) {
      raf = requestAnimationFrame(tick)
    } else {
      onDone?.()
    }
  }

  raf = requestAnimationFrame(tick)
  return () => {
    cancelled = true
    cancelAnimationFrame(raf)
  }
}
