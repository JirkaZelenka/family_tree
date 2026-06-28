import { useGraphStore } from '@/stores/graph-store'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function PersonHoverTooltip() {
  const hoveredId = useGraphStore((s) => s.hoveredId)
  const getPerson = useGraphStore((s) => s.getPerson)

  const person = hoveredId ? getPerson(hoveredId) : null
  if (!person) return null

  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2">
      <Tooltip open>
        <TooltipTrigger asChild>
          <span className="sr-only">{person.fullName}</span>
        </TooltipTrigger>
        <TooltipContent>
          {person.fullName} ({person.birthYear ?? '?'} – {person.deathYear ?? '?'})
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
