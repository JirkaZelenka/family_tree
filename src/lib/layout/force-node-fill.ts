import type Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import { FORCE_NODE_WIDTH } from '@/lib/layout/force-layout'
import {
  familyNameMatchesLineage,
  lineageColor,
  lineageKeyForFamilyName,
  pastelizeColor,
  rodNamesMatch,
} from '@/lib/vault/lineage-colors'
import { spouseIds } from '@/lib/graph/person-links'

export type ForceNodeFill =
  | { type: 'solid'; color: string }
  | { type: 'split'; left: string; right: string }

function nodeCenterX(pos: { x: number }): number {
  return pos.x + FORCE_NODE_WIDTH / 2
}

function colorForLineage(
  lineage: string,
  colors: Record<string, string>,
  muted: boolean,
): string {
  const base = lineageColor(lineage, colors)
  return muted ? pastelizeColor(base, 0.68) : base
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

  for (const sid of spouseIds(person.spouses)) {
    if (!sid || !visibleIds.has(sid) || !positions.has(sid)) continue
    const dist = Math.abs(nodeCenterX(positions.get(sid)!) - selfCx)
    if (!best || dist < best.dist) best = { id: sid, dist }
  }

  return best?.id ?? null
}

function splitFill(
  fromLineage: string,
  intoLineage: string,
  colors: Record<string, string>,
  muted: boolean,
  pos: { x: number; y: number } | undefined,
  spousePos: { x: number; y: number } | undefined,
): ForceNodeFill {
  const fromColor = colorForLineage(fromLineage, colors, muted)
  const intoColor = colorForLineage(intoLineage, colors, muted)

  if (pos && spousePos) {
    const spouseOnRight = nodeCenterX(spousePos) > nodeCenterX(pos)
    return spouseOnRight
      ? { type: 'split', left: fromColor, right: intoColor }
      : { type: 'split', left: intoColor, right: fromColor }
  }

  return { type: 'split', left: fromColor, right: intoColor }
}

function graphLineageKeys(graph: Graph<PersonNode>): Set<string> {
  const keys = new Set<string>()
  graph.forEachNode((_id, attrs) => keys.add(attrs.lineage))
  return keys
}

/**
 * Jednolitá barva pro „domácí“ členy rodu (příjmení ≈ lineage).
 * Rozdělená buňka: lineage = původní rod, familyName = rod podle aktuálního příjmení.
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

  const colorKeys = Object.keys(colors)
  const originLineage = person.lineage
  const pos = positions.get(person.id)
  const preferredLineages = graphLineageKeys(graph)

  if (familyNameMatchesLineage(person)) {
    return solid(originLineage)
  }

  const nameLineage = lineageKeyForFamilyName(
    person.familyName,
    colorKeys,
    originLineage,
    preferredLineages,
  )

  if (!rodNamesMatch(originLineage, nameLineage)) {
    const spouseId =
      pos != null
        ? pickVisibleSpouse(graph, person, visibleIds, positions, pos)
        : null
    const spousePos = spouseId ? positions.get(spouseId) : undefined
    return splitFill(
      originLineage,
      nameLineage,
      colors,
      muted,
      pos,
      spousePos,
    )
  }

  if (!pos) return solid(originLineage)

  const spouseId = pickVisibleSpouse(graph, person, visibleIds, positions, pos)
  if (!spouseId) return solid(originLineage)

  const spouse = graph.getNodeAttributes(spouseId)
  const spouseLineage = lineageKeyForFamilyName(
    spouse.familyName,
    colorKeys,
    spouse.lineage,
    preferredLineages,
  )

  if (rodNamesMatch(originLineage, spouseLineage)) {
    return solid(originLineage)
  }

  return splitFill(
    originLineage,
    spouseLineage,
    colors,
    muted,
    pos,
    positions.get(spouseId),
  )
}
