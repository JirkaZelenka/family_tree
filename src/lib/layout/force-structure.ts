import Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import { spouseIds } from '@/lib/graph/person-links'

const SLOT = 0.1
const COUPLE_GAP = 0.11
const SIBLING_GAP = 0.05
const CLUSTER_GAP = 0.35

function birthYear(graph: Graph<PersonNode>, id: string): number {
  return graph.getNodeAttributes(id).birthYear ?? 9999
}

function sortByAge(graph: Graph<PersonNode>, ids: string[]): string[] {
  return [...ids].sort((a, b) => birthYear(graph, a) - birthYear(graph, b))
}

function unitKey(unit: string[]): string {
  return [...unit].sort().join('|')
}

function visibleSpouses(
  graph: Graph<PersonNode>,
  id: string,
  visibleIds: Set<string>,
): string[] {
  return spouseIds(graph.getNodeAttributes(id).spouses).filter((sid) => visibleIds.has(sid))
}

function visibleChildren(
  graph: Graph<PersonNode>,
  parentIds: string[],
  visibleIds: Set<string>,
): string[] {
  const set = new Set<string>()
  for (const pid of parentIds) {
    for (const cid of graph.getNodeAttributes(pid).children) {
      if (cid && visibleIds.has(cid)) set.add(cid)
    }
  }
  return sortByAge(graph, [...set])
}

function takeVisibleCouple(
  graph: Graph<PersonNode>,
  id: string,
  visibleIds: Set<string>,
  placed: Set<string>,
): string[] {
  if (placed.has(id)) return []
  placed.add(id)
  const spouses = visibleSpouses(graph, id, visibleIds).filter((s) => !placed.has(s))
  const pick = spouses[0]
  if (pick) {
    placed.add(pick)
    return sortByAge(graph, [id, pick])
  }
  return [id]
}

function measureVisibleFamily(
  graph: Graph<PersonNode>,
  entryId: string,
  visibleIds: Set<string>,
  memo: Map<string, number>,
  placed: Set<string>,
): number {
  const unit = takeVisibleCouple(graph, entryId, visibleIds, new Set(placed))
  if (unit.length === 0) return 0
  const key = unitKey(unit)
  if (memo.has(key)) return memo.get(key)!

  const parentW = unit.length === 2 ? COUPLE_GAP + SLOT : SLOT
  const children = visibleChildren(graph, unit, visibleIds)
  if (children.length === 0) {
    memo.set(key, parentW)
    return parentW
  }

  let childW = 0
  const childPlaced = new Set<string>()
  for (const child of children) {
    if (childPlaced.has(child)) continue
    const couple = takeVisibleCouple(graph, child, visibleIds, childPlaced)
    if (couple.length === 0) continue
    childW += measureVisibleFamily(graph, couple[0], visibleIds, memo, placed)
    childW += SIBLING_GAP
  }
  if (children.length > 0) childW -= SIBLING_GAP

  const w = Math.max(parentW, childW)
  memo.set(key, w)
  return w
}

function placeVisibleFamily(
  graph: Graph<PersonNode>,
  entryId: string,
  uLeft: number,
  positions: Map<string, number>,
  visibleIds: Set<string>,
  placed: Set<string>,
  memo: Map<string, number>,
): void {
  const unit = takeVisibleCouple(graph, entryId, visibleIds, placed)
  if (unit.length === 0) return

  const totalW = measureVisibleFamily(graph, unit[0], visibleIds, memo, new Set(placed))
  const uCenter = uLeft + totalW / 2

  if (unit.length === 1) {
    positions.set(unit[0], uCenter)
  } else {
    positions.set(unit[0], uCenter - COUPLE_GAP / 2)
    positions.set(unit[1], uCenter + COUPLE_GAP / 2)
  }

  const children = visibleChildren(graph, unit, visibleIds)
  if (children.length === 0) return

  let childLeft = uLeft
  const childPlaced = new Set<string>()
  for (const child of children) {
    if (childPlaced.has(child)) continue
    const couple = takeVisibleCouple(graph, child, visibleIds, childPlaced)
    if (couple.length === 0) continue
    const cw = measureVisibleFamily(graph, couple[0], visibleIds, memo, placed)
    placeVisibleFamily(graph, couple[0], childLeft, positions, visibleIds, placed, memo)
    childLeft += cw + SIBLING_GAP
  }
}

function visibleRoots(
  graph: Graph<PersonNode>,
  visibleIds: Set<string>,
  subset: Set<string>,
): string[] {
  const roots: string[] = []
  for (const id of subset) {
    const attrs = graph.getNodeAttributes(id)
    const hasVisibleParent = attrs.parents.some(
      (pid) => pid && visibleIds.has(pid) && subset.has(pid),
    )
    if (!hasVisibleParent) roots.push(id)
  }
  return sortByAge(graph, roots)
}

function youngestDescendantYear(
  graph: Graph<PersonNode>,
  entryId: string,
  visibleIds: Set<string>,
  memo: Map<string, number>,
): number {
  if (memo.has(entryId)) return memo.get(entryId)!
  const attrs = graph.getNodeAttributes(entryId)
  let youngest = attrs.birthYear ?? -Infinity
  for (const cid of attrs.children) {
    if (!cid || !visibleIds.has(cid)) continue
    youngest = Math.max(youngest, youngestDescendantYear(graph, cid, visibleIds, memo))
  }
  memo.set(entryId, youngest)
  return youngest
}

function familyNeighbour(
  graph: Graph<PersonNode>,
  id: string,
  visibleIds: Set<string>,
): string[] {
  const attrs = graph.getNodeAttributes(id)
  const out: string[] = []
  for (const pid of attrs.parents) if (pid && visibleIds.has(pid)) out.push(pid)
  for (const cid of attrs.children) if (cid && visibleIds.has(cid)) out.push(cid)
  for (const sid of spouseIds(attrs.spouses)) if (visibleIds.has(sid)) out.push(sid)
  return out
}

function connectedComponents(
  graph: Graph<PersonNode>,
  visibleIds: Set<string>,
): Set<string>[] {
  const components: Set<string>[] = []
  const seen = new Set<string>()

  for (const start of visibleIds) {
    if (seen.has(start)) continue
    const component = new Set<string>()
    const queue = [start]
    while (queue.length > 0) {
      const id = queue.shift()!
      if (seen.has(id)) continue
      seen.add(id)
      component.add(id)
      for (const nid of familyNeighbour(graph, id, visibleIds)) {
        if (!seen.has(nid)) queue.push(nid)
      }
    }
    components.push(component)
  }

  return components
}

function layoutComponentU(
  graph: Graph<PersonNode>,
  component: Set<string>,
  visibleIds: Set<string>,
): Map<string, number> {
  const positions = new Map<string, number>()
  const placed = new Set<string>()
  const memo = new Map<string, number>()
  const youngMemo = new Map<string, number>()

  const roots = visibleRoots(graph, visibleIds, component)
  roots.sort(
    (a, b) =>
      youngestDescendantYear(graph, b, visibleIds, youngMemo) -
      youngestDescendantYear(graph, a, visibleIds, youngMemo),
  )

  let uCursor = 0
  for (const root of roots) {
    if (placed.has(root)) continue
    const w = measureVisibleFamily(graph, root, visibleIds, memo, placed)
    placeVisibleFamily(graph, root, uCursor, positions, visibleIds, placed, memo)
    uCursor += w + SIBLING_GAP
  }

  for (const id of component) {
    if (positions.has(id)) continue
    const w = measureVisibleFamily(graph, id, visibleIds, memo, placed)
    placeVisibleFamily(graph, id, uCursor, positions, visibleIds, placed, memo)
    uCursor += w + SIBLING_GAP
  }

  return positions
}

/** Kompaktní horizontální rozložení po rodinných clusterech. */
export function layoutVisiblePedigreeU(
  graph: Graph<PersonNode>,
  visibleIds: Set<string>,
): Map<string, number> {
  const components = connectedComponents(graph, visibleIds)
  components.sort((a, b) => {
    const minA = Math.min(...[...a].map((id) => birthYear(graph, id)))
    const minB = Math.min(...[...b].map((id) => birthYear(graph, id)))
    return minA - minB
  })

  const merged = new Map<string, number>()
  let clusterOffset = 0

  for (const component of components) {
    const local = layoutComponentU(graph, component, visibleIds)
    let minU = Infinity
    let maxU = -Infinity
    for (const u of local.values()) {
      minU = Math.min(minU, u)
      maxU = Math.max(maxU, u)
    }
    if (!Number.isFinite(minU)) continue

    for (const [id, u] of local) {
      merged.set(id, u - minU + clusterOffset)
    }
    clusterOffset += maxU - minU + CLUSTER_GAP
  }

  return merged
}
