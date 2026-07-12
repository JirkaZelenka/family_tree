import type { Marriage, PersonNode } from '@/types/person'

export function spouseIds(spouses: Array<Marriage | string> | undefined): string[] {
  if (!spouses) return []
  return spouses
    .map((s) => (typeof s === 'string' ? s : s.id))
    .filter((id) => id.length > 0)
}

export function deriveChildren(persons: Map<string, PersonNode>): void {
  for (const node of persons.values()) {
    node.children = []
  }
  for (const child of persons.values()) {
    for (const parentId of child.parents) {
      if (!parentId || !persons.has(parentId)) continue
      const parent = persons.get(parentId)!
      if (!parent.children.includes(child.id)) {
        parent.children.push(child.id)
      }
    }
  }
}

/** Sourozenci odvození ze společných rodičů. */
export function siblingIds(
  person: PersonNode,
  persons: Map<string, PersonNode>,
): string[] {
  const ids = new Set<string>()
  for (const parentId of person.parents) {
    const parent = persons.get(parentId)
    if (!parent) continue
    for (const childId of parent.children) {
      if (childId !== person.id) ids.add(childId)
    }
  }
  return [...ids].sort((a, b) => {
    const pa = persons.get(a)
    const pb = persons.get(b)
    const ya = pa?.birthYear ?? 9999
    const yb = pb?.birthYear ?? 9999
    if (ya !== yb) return ya - yb
    return (pa?.fullName ?? a).localeCompare(pb?.fullName ?? b, 'cs')
  })
}
