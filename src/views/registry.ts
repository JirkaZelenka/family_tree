import { GitBranch, Clock, CalendarDays } from 'lucide-react'
import type { ViewPlugin } from './types'
import { ForceView } from './force/ForceView'
import { TimelineView } from './timeline/TimelineView'
import { CalendarView } from './calendar/CalendarView'

export const viewRegistry: ViewPlugin[] = [
  { id: 'tree', labelKey: 'views.tree', icon: GitBranch, Component: ForceView },
  { id: 'timeline', labelKey: 'views.timeline', icon: Clock, Component: TimelineView },
  { id: 'calendar', labelKey: 'views.calendar', icon: CalendarDays, Component: CalendarView },
]

export function getView(id: string): ViewPlugin | undefined {
  return viewRegistry.find((v) => v.id === id)
}
