import type Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import { spouseIds } from '@/lib/graph/person-links'

const CS_LABELS: Record<string, string> = {
  parent: 'rodič',
  child: 'dítě',
  sibling: 'sourozenec',
  spouse: 'manžel/ka',
  grandparent: 'prarodič',
  grandchild: 'vnouče',
  uncle: 'strýc',
  aunt: 'teta',
  nephew: 'synovec',
  niece: 'neteř',
  cousin: 'bratranec/sestřenice',
  'great-grandparent': 'praprarodič',
  'great-grandchild': 'prapravnuk/vnučka',
  ancestor: 'předek',
  descendant: 'potomek',
  unrelated: 'nepříbuzní',
}

export interface KinshipResult {
  label: string
  labelCs: string
  degree: number
  commonAncestorId: string | null
  pathA: string[]
  pathB: string[]
}

function bfsPath(
  graph: Graph<PersonNode>,
  start: string,
  end: string,
): string[] | null {
  const queue: Array<{ id: string; path: string[] }> = [{ id: start, path: [start] }]
  const visited = new Set<string>([start])
  while (queue.length > 0) {
    const { id, path } = queue.shift()!
    if (id === end) return path
    const node = graph.getNodeAttributes(id)
    const neighbors = new Set<string>([
      ...node.parents,
      ...node.children,
      ...spouseIds(node.spouses),
    ])
    graph.forEachNeighbor(id, (n) => neighbors.add(n))
    for (const n of neighbors) {
      if (visited.has(n)) continue
      visited.add(n)
      queue.push({ id: n, path: [...path, n] })
    }
  }
  return null
}

function relationshipFromPaths(
  pathA: string[],
  pathB: string[],
  commonId: string,
): { label: string; degree: number } {
  const upA = pathA.indexOf(commonId)
  const upB = pathB.indexOf(commonId)
  const distA = upA
  const distB = upB
  const degree = distA + distB

  if (degree === 0) return { label: 'self', degree: 0 }
  if (distA === 1 && distB === 0) return { label: 'parent', degree: 1 }
  if (distA === 0 && distB === 1) return { label: 'child', degree: 1 }
  if (distA === 1 && distB === 1) return { label: 'sibling', degree: 2 }
  if (distA === 0 && distB === 2) return { label: 'grandchild', degree: 2 }
  if (distA === 2 && distB === 0) return { label: 'grandparent', degree: 2 }
  if (distA === 1 && distB === 2) return { label: 'nephew', degree: 3 }
  if (distA === 2 && distB === 1) return { label: 'uncle', degree: 3 }
  if (distA === 2 && distB === 2) return { label: 'cousin', degree: 4 }
  if (distA > distB) return { label: 'ancestor', degree }
  if (distB > distA) return { label: 'descendant', degree }
  return { label: 'unrelated', degree }
}

export function computeKinship(
  graph: Graph<PersonNode>,
  personA: string,
  personB: string,
): KinshipResult | null {
  if (!graph.hasNode(personA) || !graph.hasNode(personB)) return null
  if (personA === personB) {
    return {
      label: 'self',
      labelCs: 'tatáž osoba',
      degree: 0,
      commonAncestorId: personA,
      pathA: [personA],
      pathB: [personB],
    }
  }

  const ancestorsA = new Set<string>()
  const queueA: string[] = [personA]
  const parentMapA = new Map<string, string>()
  while (queueA.length > 0) {
    const id = queueA.shift()!
    if (ancestorsA.has(id)) continue
    ancestorsA.add(id)
    const node = graph.getNodeAttributes(id)
    for (const p of node.parents) {
      parentMapA.set(p, id)
      queueA.push(p)
    }
  }

  let common: string | null = null
  const queueB: string[] = [personB]
  const visitedB = new Set<string>()
  while (queueB.length > 0) {
    const id = queueB.shift()!
    if (visitedB.has(id)) continue
    visitedB.add(id)
    if (ancestorsA.has(id)) {
      common = id
      break
    }
    const node = graph.getNodeAttributes(id)
    for (const p of node.parents) queueB.push(p)
  }

  if (!common) {
    const path = bfsPath(graph, personA, personB)
    if (!path) {
      return {
        label: 'unrelated',
        labelCs: CS_LABELS.unrelated,
        degree: -1,
        commonAncestorId: null,
        pathA: [personA],
        pathB: [personB],
      }
    }
    return {
      label: 'unrelated',
      labelCs: 'vzdáleně propojeni',
      degree: path.length - 1,
      commonAncestorId: null,
      pathA: path,
      pathB: [...path].reverse(),
    }
  }

  const pathA: string[] = []
  let cur: string | null = personA
  while (cur && cur !== common) {
    pathA.push(cur)
    const node = graph.getNodeAttributes(cur)
    cur = node.parents[0] ?? null
  }
  pathA.push(common)

  const pathB: string[] = []
  cur = personB
  while (cur && cur !== common) {
    pathB.push(cur)
    const node = graph.getNodeAttributes(cur)
    cur = node.parents[0] ?? null
  }
  pathB.push(common)

  const { label, degree } = relationshipFromPaths(pathA, pathB, common)
  return {
    label,
    labelCs: CS_LABELS[label] ?? label,
    degree,
    commonAncestorId: common,
    pathA,
    pathB,
  }
}
