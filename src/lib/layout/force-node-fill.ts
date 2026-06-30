import type Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import { FORCE_NODE_WIDTH } from '@/lib/layout/force-layout'
import { lineageColor, pastelizeColor } from '@/lib/vault/lineage-colors'

export type ForceNodeFill =
  | { type: 'solid'; color: string }
  | { type: 'split'; left: string; right: string }

function normalizeRod(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ovi$/, '')
    .replace(/ova$/, '')
    .replace(/ové$/, '')
}

/** Příjmení odpovídá rodu — osoba zůstává v „svém“ rodu (jednolitá barva). */
export function familyNameMatchesLineage(person: PersonNode): boolean {
  if (person.maidenName) return false
  if (!person.familyName) return true
  const lineage = normalizeRod(person.lineage)
  const family = normalizeRod(person.familyName)
  if (!lineage || !family) return true
  return lineage.includes(family) || family.includes(lineage)
}

function nodeCenterX(pos: { x: number }): number {
  return pos.x + FORCE_NODE_WIDTH / 2
}

/** Původní rod osoby — pole `lineage` v datech (ne první rodič). */
function originLineage(_graph: Graph<PersonNode>, person: PersonNode): string {
  return person.lineage
}

function pickVisibleSpouse(
  graph: Graph<PersonNode>,
  person: PersonNode,
  visibleIds: Set<string>,
  positions: Map<string, { x: number; y: number }>,
  selfPos: { x: number; y: number },
): string | null {
  let best: { id: string; dist: number } | null = null
  const selfCx = nodeCenterX(selfPos)

  for (const sid of person.spouses) {
    if (!sid || !visibleIds.has(sid) || !positions.has(sid)) continue
    const dist = Math.abs(nodeCenterX(positions.get(sid)!) - selfCx)
    if (!best || dist < best.dist) best = { id: sid, dist }
  }

  return best?.id ?? null
}

function colorForLineage(
  lineage: string,
  colors: Record<string, string>,
  muted: boolean,
): string {
  const base = lineageColor(lineage, colors)
  return muted ? pastelizeColor(base, 0.68) : base
}

/**
 * Jednolitá barva pro „domácí“ členy rodu (příjmení ≈ lineage).
 * Rozdělená buňka jen u těch, kdo přišli z jiného rodu (vdaná / příchozí partner).
 */
export function resolveForceNodeFill(
  graph: Graph<PersonNode>,
  person: PersonNode,
  visibleIds: Set<string>,
  positions: Map<string, { x: number; y: number }>,
  colors: Record<string, string>,
  muted: boolean,
): ForceNodeFill {
  const solid = (lineage: string): ForceNodeFill => ({
    type: 'solid',
    color: colorForLineage(lineage, colors, muted),
  })

  if (familyNameMatchesLineage(person)) {
    return solid(person.lineage)
  }

  const pos = positions.get(person.id)
  if (!pos) return solid(person.lineage)

  const spouseId = pickVisibleSpouse(graph, person, visibleIds, positions, pos)
  if (!spouseId) return solid(person.lineage)

  const spouse = graph.getNodeAttributes(spouseId)
  const spousePos = positions.get(spouseId)!
  const fromLineage = originLineage(graph, person)
  const intoLineage = spouse.lineage

  if (fromLineage === intoLineage) {
    return solid(person.lineage)
  }

  const fromColor = colorForLineage(fromLineage, colors, muted)
  const intoColor = colorForLineage(intoLineage, colors, muted)
  const spouseOnRight = nodeCenterX(spousePos) > nodeCenterX(pos)

  return spouseOnRight
    ? { type: 'split', left: fromColor, right: intoColor }
    : { type: 'split', left: intoColor, right: fromColor }
}
