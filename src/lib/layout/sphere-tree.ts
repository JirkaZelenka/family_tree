import Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import { spouseIds } from '@/lib/graph/person-links'

export interface TreeUV {
  u: number
  v: number
}

const SLOT = 0.07
/** Vzdálenost středů manželů – růžová linka mezi kuličkami (Ø ≈ 0.068). */
const COUPLE_GAP = 0.12
const SIBLING_GAP = 0.055
/** Každá generace = vlastní řádek stromu (stejný poloměr / horizontála). */
const GEN_GAP = 1

function birthYear(graph: Graph<PersonNode>, id: string): number {
  return graph.getNodeAttributes(id).birthYear ?? 9999
}

function sortByAge(graph: Graph<PersonNode>, ids: string[]): string[] {
  return [...ids].sort((a, b) => birthYear(graph, a) - birthYear(graph, b))
}

function allSpouses(graph: Graph<PersonNode>, id: string): string[] {
  return spouseIds(graph.getNodeAttributes(id).spouses).filter((sid) => graph.hasNode(sid))
}

function childrenInLineage(
  graph: Graph<PersonNode>,
  id: string,
  lineage: string,
): string[] {
  return graph.getNodeAttributes(id).children.filter(
    (cid) => graph.hasNode(cid) && graph.getNodeAttributes(cid).lineage === lineage,
  )
}

function allChildren(graph: Graph<PersonNode>, parentIds: string[]): string[] {
  const set = new Set<string>()
  for (const pid of parentIds) {
    for (const cid of graph.getNodeAttributes(pid).children) {
      if (cid && graph.hasNode(cid)) set.add(cid)
    }
  }
  return sortByAge(graph, [...set])
}

function sharedChildren(
  graph: Graph<PersonNode>,
  parentIds: string[],
  lineage: string,
): string[] {
  const inLineage = new Set<string>()
  for (const pid of parentIds) {
    for (const cid of childrenInLineage(graph, pid, lineage)) {
      inLineage.add(cid)
    }
  }
  if (inLineage.size > 0) return sortByAge(graph, [...inLineage])
  return allChildren(graph, parentIds)
}

/** Manželský pár pro strom – včetně partnera z jiného rodu. */
function takeCouple(
  graph: Graph<PersonNode>,
  id: string,
  lineage: string,
  placed: Set<string>,
): string[] {
  if (placed.has(id)) return []
  placed.add(id)
  const spouses = allSpouses(graph, id).filter((s) => !placed.has(s))
  const inLineage = spouses.filter(
    (s) => graph.getNodeAttributes(s).lineage === lineage,
  )
  const pick = inLineage[0] ?? spouses[0]
  if (pick) {
    placed.add(pick)
    return sortByAge(graph, [id, pick])
  }
  return [id]
}

function unitKey(unit: string[]): string {
  return [...unit].sort().join('|')
}

function measureFamily(
  graph: Graph<PersonNode>,
  entryId: string,
  lineage: string,
  memo: Map<string, number>,
  placed: Set<string>,
): number {
  const unit = takeCouple(graph, entryId, lineage, new Set(placed))
  if (unit.length === 0) return 0
  const key = unitKey(unit)
  if (memo.has(key)) return memo.get(key)!

  const parentW = unit.length === 2 ? COUPLE_GAP + SLOT : SLOT
  const children = sharedChildren(graph, unit, lineage)
  if (children.length === 0) {
    memo.set(key, parentW)
    return parentW
  }

  let childW = 0
  const childPlaced = new Set<string>()
  for (const child of children) {
    if (childPlaced.has(child)) continue
    const couple = takeCouple(graph, child, lineage, childPlaced)
    if (couple.length === 0) continue
    childW += measureFamily(graph, couple[0], lineage, memo, placed)
    childW += SIBLING_GAP
  }
  if (children.length > 0) childW -= SIBLING_GAP

  const w = Math.max(parentW, childW)
  memo.set(key, w)
  return w
}

function placeFamily(
  graph: Graph<PersonNode>,
  entryId: string,
  lineage: string,
  uLeft: number,
  v: number,
  positions: Map<string, TreeUV>,
  placed: Set<string>,
  memo: Map<string, number>,
): void {
  const unit = takeCouple(graph, entryId, lineage, placed)
  if (unit.length === 0) return

  const totalW = measureFamily(graph, unit[0], lineage, memo, new Set(placed))
  const uCenter = uLeft + totalW / 2

  if (unit.length === 1) {
    positions.set(unit[0], { u: uCenter, v })
  } else {
    positions.set(unit[0], { u: uCenter - COUPLE_GAP / 2, v })
    positions.set(unit[1], { u: uCenter + COUPLE_GAP / 2, v })
  }

  const children = sharedChildren(graph, unit, lineage)
  if (children.length === 0) return

  let childLeft = uLeft
  const childPlaced = new Set<string>()
  for (const child of children) {
    if (childPlaced.has(child)) continue
    const couple = takeCouple(graph, child, lineage, childPlaced)
    if (couple.length === 0) continue
    const cw = measureFamily(graph, couple[0], lineage, memo, placed)
    placeFamily(graph, couple[0], lineage, childLeft, v + GEN_GAP, positions, placed, memo)
    childLeft += cw + SIBLING_GAP
  }
}

function rootsInLineage(graph: Graph<PersonNode>, lineage: string): string[] {
  const ids: string[] = []
  graph.forEachNode((id, attrs) => {
    if (attrs.lineage !== lineage) return
    const hasLineageParent = attrs.parents.some(
      (pid) => pid && graph.hasNode(pid) && graph.getNodeAttributes(pid).lineage === lineage,
    )
    if (!hasLineageParent) ids.push(id)
  })
  return sortByAge(graph, ids)
}

function membersOfLineage(graph: Graph<PersonNode>, lineage: string): string[] {
  const ids: string[] = []
  graph.forEachNode((id, attrs) => {
    if (attrs.lineage === lineage) ids.push(id)
  })
  return ids
}

function centerTree(positions: Map<string, TreeUV>): void {
  if (positions.size === 0) return
  let minU = Infinity
  let maxU = -Infinity
  for (const { u } of positions.values()) {
    minU = Math.min(minU, u)
    maxU = Math.max(maxU, u)
  }
  const shift = -(minU + maxU) / 2
  if (Math.abs(shift) < 1e-6) return
  for (const [id, uv] of positions) {
    positions.set(id, { u: uv.u + shift, v: uv.v })
  }
}

/** Rodokmen: rodiče vedle sebe, potomci v řadě pod nimi (2D strom / hrábě). */
export function layoutLineagePedigree(
  graph: Graph<PersonNode>,
  lineage: string,
): Map<string, TreeUV> {
  const positions = new Map<string, TreeUV>()
  const placed = new Set<string>()
  const memo = new Map<string, number>()
  const roots = rootsInLineage(graph, lineage)

  let uCursor = 0
  for (const root of roots) {
    if (placed.has(root)) continue
    const w = measureFamily(graph, root, lineage, memo, placed)
    placeFamily(graph, root, lineage, uCursor, 0, positions, placed, memo)
    uCursor += w + SIBLING_GAP
  }

  for (const id of membersOfLineage(graph, lineage)) {
    if (placed.has(id)) continue
    const w = measureFamily(graph, id, lineage, memo, placed)
    placeFamily(graph, id, lineage, uCursor, 0, positions, placed, memo)
    uCursor += w + SIBLING_GAP
  }

  fillMissingOnPlane(graph, lineage, positions)
  centerTree(positions)
  return positions
}

/** Doplní lidi na rovině rodu, které pedigree walk minul (např. bezdětný manžel z jiného rodu). */
function fillMissingOnPlane(
  graph: Graph<PersonNode>,
  planeLineage: string,
  tree2d: Map<string, TreeUV>,
): void {
  const onPlane = graph
    .nodes()
    .filter((id) => resolvePlacementLineage(graph, id) === planeLineage)

  let maxU = -Infinity
  let maxV = 0
  for (const { u, v } of tree2d.values()) {
    maxU = Math.max(maxU, u)
    maxV = Math.max(maxV, v)
  }
  if (!Number.isFinite(maxU)) maxU = 0

  let orphanU = maxU + SIBLING_GAP

  for (const id of onPlane) {
    if (tree2d.has(id)) continue

    const attrs = graph.getNodeAttributes(id)
    let placed = false

    for (const sid of spouseIds(attrs.spouses)) {
      if (!sid || !graph.hasNode(sid)) continue
      if (resolvePlacementLineage(graph, sid) !== planeLineage) continue
      const sp = tree2d.get(sid)
      if (!sp) continue
      const couple = sortByAge(graph, [id, sid])
      if (couple[0] === id) {
        tree2d.set(id, { u: sp.u - COUPLE_GAP / 2, v: sp.v })
        tree2d.set(sid, { u: sp.u + COUPLE_GAP / 2, v: sp.v })
      } else {
        tree2d.set(id, { u: sp.u + COUPLE_GAP / 2, v: sp.v })
        tree2d.set(sid, { u: sp.u - COUPLE_GAP / 2, v: sp.v })
      }
      placed = true
      break
    }

    if (!placed) {
      tree2d.set(id, { u: orphanU, v: maxV })
      orphanU += SLOT + SIBLING_GAP
    }
  }
}

/**
 * Na které rovině kreslit rodinu (hrábě / manželskou linku).
 */
export function resolveCouplePlane(graph: Graph<PersonNode>, parentIds: string[]): string {
  if (parentIds.length === 0) return 'unknown'
  if (parentIds.length === 1) return graph.getNodeAttributes(parentIds[0]).lineage

  const a = graph.getNodeAttributes(parentIds[0])
  const b = graph.getNodeAttributes(parentIds[1])
  if (a.lineage === b.lineage) return a.lineage

  const hasLineageParents = (attrs: PersonNode, lineage: string) =>
    attrs.parents.some(
      (pid) => pid && graph.hasNode(pid) && graph.getNodeAttributes(pid).lineage === lineage,
    )

  const aRooted = hasLineageParents(a, a.lineage)
  const bRooted = hasLineageParents(b, b.lineage)
  if (aRooted && !bRooted) return a.lineage
  if (bRooted && !aRooted) return b.lineage
  return a.lineage
}

/**
 * Na které rovině rodu umístit osobu (3D pozice).
 * Rodič z jiného rodu jde na rovinu dětí; bezdětný pár sdílí rovinu.
 */
export function resolvePlacementLineage(graph: Graph<PersonNode>, id: string): string {
  const attrs = graph.getNodeAttributes(id)
  const own = attrs.lineage

  const childLineages = attrs.children
    .filter((cid) => cid && graph.hasNode(cid))
    .map((cid) => graph.getNodeAttributes(cid).lineage)

  if (childLineages.length > 0) {
    const counts = new Map<string, number>()
    for (const l of childLineages) counts.set(l, (counts.get(l) ?? 0) + 1)

    let dominant = own
    let max = 0
    for (const [l, n] of counts) {
      if (n > max) {
        max = n
        dominant = l
      }
    }

    if (dominant !== own) return dominant
    return own
  }

  for (const sid of spouseIds(attrs.spouses)) {
    if (!sid || !graph.hasNode(sid)) continue
    const spouse = graph.getNodeAttributes(sid)
    if (spouse.lineage === own) continue
    return resolveCouplePlane(graph, sortByAge(graph, [id, sid]))
  }

  return own
}

export interface FamilyUnit {
  parentIds: string[]
  childIds: string[]
  lineage: string
}

export function collectFamilyUnits(
  graph: Graph<PersonNode>,
  lineage: string,
): FamilyUnit[] {
  const units: FamilyUnit[] = []
  const seen = new Set<string>()

  function walk(entryId: string, placed: Set<string>) {
    const couple = takeCouple(graph, entryId, lineage, placed)
    if (couple.length === 0) return
    const key = unitKey(couple)
    if (seen.has(key)) return
    seen.add(key)
    const children = sharedChildren(graph, couple, lineage)
    units.push({ parentIds: couple, childIds: children, lineage })
    const childPlaced = new Set<string>()
    for (const child of children) walk(child, childPlaced)
  }

  const rootPlaced = new Set<string>()
  for (const root of rootsInLineage(graph, lineage)) {
    walk(root, rootPlaced)
  }

  for (const id of membersOfLineage(graph, lineage)) {
    walk(id, new Set<string>())
  }

  return units
}

/** Všechny manželské páry včetně bezdětných (např. Jirka + Zuzana). */
export function collectSpouseUnits(graph: Graph<PersonNode>): FamilyUnit[] {
  const units: FamilyUnit[] = []
  const seen = new Set<string>()

  graph.forEachNode((id, attrs) => {
    for (const sid of spouseIds(attrs.spouses)) {
      if (!sid || !graph.hasNode(sid)) continue
      const key = [id, sid].sort().join('--')
      if (seen.has(key)) continue
      seen.add(key)
      const couple = sortByAge(graph, [id, sid])
      units.push({
        parentIds: couple,
        childIds: [],
        lineage: resolveCouplePlane(graph, couple),
      })
    }
  })

  return units
}
