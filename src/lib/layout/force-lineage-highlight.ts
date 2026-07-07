import type Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import type { ForceEdgeSegment } from '@/lib/layout/force-edges'
import { lineageColor } from '@/lib/vault/lineage-colors'

export type LineageEdgeDirection = 'up' | 'down'

export interface LineagePathHighlight {
  ancestorIds: Set<string>
  descendantIds: Set<string>
  ancestorParentChild: Set<string>
  descendantParentChild: Set<string>
  upColor: string
  downColor: string
}

export function parentChildKey(parentId: string, childId: string): string {
  return `${parentId}->${childId}`
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

export function resolveLineageHighlightColors(
  _graph: Graph<PersonNode>,
  person: PersonNode,
  colors: Record<string, string>,
): { upColor: string; downColor: string } {
  const color = lineageColor(person.lineage, colors)
  return { upColor: color, downColor: color }
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
    upColor,
    downColor,
  }
}

function childOnParentChildPath(childId: string, parentChildKeys: Set<string>): boolean {
  for (const key of parentChildKeys) {
    const sep = key.indexOf('->')
    if (sep === -1) continue
    if (key.slice(sep + 2) === childId) return true
  }
  return false
}

function pathChildrenInUnit(
  childIds: string[],
  parentChildKeys: Set<string>,
): string[] {
  return childIds.filter((id) => childOnParentChildPath(id, parentChildKeys))
}

function directionForTargetChild(
  targetChildId: string,
  highlight: LineagePathHighlight,
): LineageEdgeDirection | null {
  if (childOnParentChildPath(targetChildId, highlight.descendantParentChild)) return 'down'
  if (childOnParentChildPath(targetChildId, highlight.ancestorParentChild)) return 'up'
  return null
}

export function classifySegmentHighlight(
  segment: ForceEdgeSegment,
  highlight: LineagePathHighlight,
): LineageEdgeDirection | null {
  if (segment.kind === 'spouse') return null

  if (segment.targetChildId) {
    return directionForTargetChild(segment.targetChildId, highlight)
  }

  const children = segment.childIds ?? []

  if (segment.kind === 'descent') {
    if (pathChildrenInUnit(children, highlight.descendantParentChild).length > 0) return 'down'
    if (pathChildrenInUnit(children, highlight.ancestorParentChild).length > 0) return 'up'
    return null
  }

  return null
}
