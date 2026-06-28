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

function buildTree(persons: Map<string, PersonNode>): TreeNode[] {
  const childIds = new Set<string>()
  persons.forEach((p) => {
    if (p.parents.length > 0) childIds.add(p.id)
  })

  const roots = [...persons.values()].filter((p) => p.parents.length === 0)
  const start = roots.length > 0 ? roots : [...persons.values()].slice(0, 3)

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

function TreeNodeView({
  node,
  depth,
  onSelect,
  selectedId,
  colors,
  isVisible,
}: {
  node: TreeNode
  depth: number
  onSelect: (id: string) => void
  selectedId: string | null
  colors: Record<string, string>
  isVisible: (b: number | null, d: number | null) => boolean
}) {
  const visible = isVisible(node.person.birthYear, node.person.deathYear)
  if (!visible) return null
  const color = colors[node.person.lineage] ?? '#94a3b8'

  return (
    <div className="ml-4 border-l border-border pl-3">
      <button
        type="button"
        onClick={() => onSelect(node.person.id)}
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
      {node.children.map((child) => (
        <TreeNodeView
          key={child.person.id}
          node={child}
          depth={depth + 1}
          onSelect={onSelect}
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
  const isPersonVisible = useTimeStore((s) => s.isPersonVisible)
  const colors = useVaultStore((s) => s.vault?.config.lineageColors ?? {})

  const trees = useMemo(() => buildTree(persons), [persons])

  return (
    <div className={`overflow-auto p-4 ${className ?? ''}`}>
      {trees.map((tree) => (
        <TreeNodeView
          key={tree.person.id}
          node={tree}
          depth={0}
          onSelect={setSelectedId}
          selectedId={selectedId}
          colors={colors}
          isVisible={isPersonVisible}
        />
      ))}
    </div>
  )
}
