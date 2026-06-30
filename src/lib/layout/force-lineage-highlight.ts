import type Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import type { ForceEdgeSegment } from '@/lib/layout/force-edges'
import { familyNameMatchesLineage } from '@/lib/layout/force-node-fill'
import { lineageColor } from '@/lib/vault/lineage-colors'

export type LineageEdgeDirection = 'up' | 'down'

export interface LineagePathHighlight {
  ancestorIds: Set<string>
  descendantIds: Set<string>
  ancestorParentChild: Set<string>
  descendantParentChild: Set<string>
  spouseUpKeys: Set<string>
  spouseDownKeys: Set<string>
  upColor: string
  downColor: string
}

export function parentChildKey(parentId: string, childId: string): string {
  return `${parentId}->${childId}`
}

export function spouseEdgeKey(a: string, b: string): string {
  return [a, b].sort().join('--')
}

export function collectAncestors(graph: Graph<PersonNode>, rootId: string): Set<string> {
  const out = new Set<string>()
  const queue = [...graph.getNodeAttributes(rootId).parents].filter(Boolean)
  while (queue.length > 0) {
    const id = queue.shift()!
    if (!id || out.has(id) || !graph.hasNode(id)) continue
    out.add(id)
    for (const pid of graph.getNodeAttributes(id).parents) {
      if (pid && !out.has(pid)) queue.push(pid)
    }
  }
  return out
}

export function collectDescendants(graph: Graph<PersonNode>, rootId: string): Set<string> {
  const out = new Set<string>()
  const queue = [...graph.getNodeAttributes(rootId).children].filter(Boolean)
  while (queue.length > 0) {
    const id = queue.shift()!
    if (!id || out.has(id) || !graph.hasNode(id)) continue
    out.add(id)
    for (const cid of graph.getNodeAttributes(id).children) {
      if (cid && !out.has(cid)) queue.push(cid)
    }
  }
  return out
}

function marriedIntoLineage(graph: Graph<PersonNode>, person: PersonNode): string | null {
  if (familyNameMatchesLineage(person)) return null
  for (const sid of person.spouses) {
    if (sid && graph.hasNode(sid)) return graph.getNodeAttributes(sid).lineage
  }
  return null
}

export function resolveLineageHighlightColors(
  graph: Graph<PersonNode>,
  person: PersonNode,
  colors: Record<string, string>,
): { upColor: string; downColor: string } {
  const upColor = lineageColor(person.lineage, colors)
  const married = marriedIntoLineage(graph, person)
  const downColor = married ? lineageColor(married, colors) : upColor
  return { upColor, downColor }
}

function collectParentChildEdges(
  graph: Graph<PersonNode>,
  chain: Set<string>,
): Set<string> {
  const edges = new Set<string>()
  for (const id of chain) {
    const attrs = graph.getNodeAttributes(id)
    for (const pid of attrs.parents) {
      if (pid && chain.has(pid)) edges.add(parentChildKey(pid, id))
    }
  }
  return edges
}

function collectSpouseKeysUp(
  graph: Graph<PersonNode>,
  selectedId: string,
  ancestors: Set<string>,
): Set<string> {
  const keys = new Set<string>()
  const chain = new Set([selectedId, ...ancestors])
  for (const id of chain) {
    const parents = graph.getNodeAttributes(id).parents.filter((p) => p && chain.has(p))
    if (parents.length < 2) continue
    for (let i = 0; i < parents.length; i++) {
      for (let j = i + 1; j < parents.length; j++) {
        keys.add(spouseEdgeKey(parents[i], parents[j]))
      }
    }
  }
  return keys
}

function collectSpouseKeysDown(
  graph: Graph<PersonNode>,
  selectedId: string,
): Set<string> {
  const keys = new Set<string>()
  const attrs = graph.getNodeAttributes(selectedId)
  for (const sid of attrs.spouses) {
    if (sid && graph.hasNode(sid)) keys.add(spouseEdgeKey(selectedId, sid))
  }
  return keys
}

export function computeLineagePathHighlight(
  graph: Graph<PersonNode>,
  selectedId: string,
  colors: Record<string, string>,
): LineagePathHighlight {
  const person = graph.getNodeAttributes(selectedId)
  const ancestorIds = collectAncestors(graph, selectedId)
  const descendantIds = collectDescendants(graph, selectedId)
  const { upColor, downColor } = resolveLineageHighlightColors(graph, person, colors)

  const ancestorChain = new Set([selectedId, ...ancestorIds])
  const descendantChain = new Set([selectedId, ...descendantIds])

  return {
    ancestorIds,
    descendantIds,
    ancestorParentChild: collectParentChildEdges(graph, ancestorChain),
    descendantParentChild: collectParentChildEdges(graph, descendantChain),
    spouseUpKeys: collectSpouseKeysUp(graph, selectedId, ancestorIds),
    spouseDownKeys: collectSpouseKeysDown(graph, selectedId),
    upColor,
    downColor,
  }
}

export function classifySegmentHighlight(
  segment: ForceEdgeSegment,
  highlight: LineagePathHighlight,
): LineageEdgeDirection | null {
  if (segment.kind === 'spouse' && segment.spouseIds) {
    const key = spouseEdgeKey(segment.spouseIds[0], segment.spouseIds[1])
    if (highlight.spouseDownKeys.has(key)) return 'down'
    if (highlight.spouseUpKeys.has(key)) return 'up'
    return null
  }

  const parents = segment.parentIds ?? []
  const children = segment.childIds ?? []

  for (const c of children) {
    for (const p of parents) {
      if (highlight.descendantParentChild.has(parentChildKey(p, c))) return 'down'
    }
  }

  for (const c of children) {
    for (const p of parents) {
      if (highlight.ancestorParentChild.has(parentChildKey(p, c))) return 'up'
    }
  }

  return null
}
