import { useMemo } from 'react'
import { useGraphStore } from '@/stores/graph-store'
import { useTimeStore } from '@/stores/time-store'
import { useVaultStore } from '@/stores/vault-store'
import type { ViewProps } from '../types'
import type { PersonNode } from '@/types/person'

interface TreeNode {
  person: PersonNode
  children: TreeNode[]
}

function buildTree(
  persons: Map<string, PersonNode>,
  isVisible: (b: number | null, d: number | null) => boolean,
): TreeNode[] {
  const visibleIds = new Set(
    [...persons.values()]
      .filter((p) => isVisible(p.birthYear, p.deathYear))
      .map((p) => p.id),
  )

  const roots = [...persons.values()].filter((p) => {
    if (!visibleIds.has(p.id)) return false
    const hasVisibleParent = p.parents.some((pid) => visibleIds.has(pid))
    return !hasVisibleParent
  })

  const start =
    roots.length > 0 ? roots : [...persons.values()].filter((p) => visibleIds.has(p.id))

  const build = (person: PersonNode, visited: Set<string>): TreeNode => {
    visited.add(person.id)
    const children = person.children
      .map((id) => persons.get(id))
      .filter((p): p is PersonNode => !!p && !visited.has(p.id))
      .map((p) => build(p, new Set(visited)))
    return { person, children }
  }

  return start.map((p) => build(p, new Set()))
}

function hasVisibleDescendant(
  node: TreeNode,
  isVisible: (b: number | null, d: number | null) => boolean,
): boolean {
  if (isVisible(node.person.birthYear, node.person.deathYear)) return true
  return node.children.some((c) => hasVisibleDescendant(c, isVisible))
}

function TreeNodeView({
  node,
  depth,
  onSelect,
  onHover,
  selectedId,
  colors,
  isVisible,
}: {
  node: TreeNode
  depth: number
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  selectedId: string | null
  colors: Record<string, string>
  isVisible: (b: number | null, d: number | null) => boolean
}) {
  const visible = isVisible(node.person.birthYear, node.person.deathYear)
  if (!hasVisibleDescendant(node, isVisible)) return null
  const color = colors[node.person.lineage] ?? '#94a3b8'

  return (
    <div className="ml-4 border-l border-border pl-3">
      {visible && (
        <button
          type="button"
          onClick={() => onSelect(node.person.id)}
          onMouseEnter={() => onHover(node.person.id)}
          onMouseLeave={() => onHover(null)}
          className={`rounded px-2 py-1 text-sm text-left hover:bg-accent ${
            selectedId === node.person.id ? 'bg-accent ring-1 ring-primary' : ''
          }`}
          style={{ borderLeft: `3px solid ${color}` }}
        >
          {node.person.fullName}
          <span className="ml-2 text-xs text-muted-foreground">
            {node.person.birthYear ?? '?'} – {node.person.deathYear ?? '?'}
          </span>
        </button>
      )}
      {node.children.map((child) => (
        <TreeNodeView
          key={child.person.id}
          node={child}
          depth={depth + 1}
          onSelect={onSelect}
          onHover={onHover}
          selectedId={selectedId}
          colors={colors}
          isVisible={isVisible}
        />
      ))}
    </div>
  )
}

export function TreeView({ className }: ViewProps) {
  const persons = useGraphStore((s) => s.persons)
  const selectedId = useGraphStore((s) => s.selectedId)
  const setSelectedId = useGraphStore((s) => s.setSelectedId)
  const setHoveredId = useGraphStore((s) => s.setHoveredId)
  const isPersonVisible = useTimeStore((s) => s.isPersonVisible)
  const currentYear = useTimeStore((s) => s.currentYear)
  const colors = useVaultStore((s) => s.vault?.config.lineageColors ?? {})

  const trees = useMemo(
    () => buildTree(persons, isPersonVisible),
    [persons, isPersonVisible, currentYear],
  )

  return (
    <div className={`overflow-auto p-4 ${className ?? ''}`}>
      {trees.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Žádné osoby k zobrazení. Zkuste posunout časový slider nebo načíst ukázková data.
        </p>
      ) : (
        trees.map((tree) => (
          <TreeNodeView
            key={tree.person.id}
            node={tree}
            depth={0}
            onSelect={setSelectedId}
            onHover={setHoveredId}
            selectedId={selectedId}
            colors={colors}
            isVisible={isPersonVisible}
          />
        ))
      )}
    </div>
  )
}
