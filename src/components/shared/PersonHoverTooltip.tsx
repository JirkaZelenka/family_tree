import { useGraphStore } from '@/stores/graph-store'
import { LifeSpanDisplay } from '@/components/person/PersonDateDisplay'

export function PersonHoverTooltip() {
  const hoveredId = useGraphStore((s) => s.hoveredId)
  const getPerson = useGraphStore((s) => s.getPerson)

  const person = hoveredId ? getPerson(hoveredId) : null
  if (!person) return null

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md">
      <span className="font-medium">{person.fullName}</span>
      <span className="ml-2 text-muted-foreground">
        <LifeSpanDisplay person={person} />
      </span>
    </div>
  )
}
