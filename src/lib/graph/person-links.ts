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
