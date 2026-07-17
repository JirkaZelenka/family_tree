import { GitBranch, Clock, CalendarDays, Map } from 'lucide-react'
import type { ViewPlugin } from './types'
import { ForceView } from './force/ForceView'
import { TimelineView } from './timeline/TimelineView'
import { CalendarView } from './calendar/CalendarView'
import { MapView } from './map/MapView'

export const viewRegistry: ViewPlugin[] = [
  { id: 'tree', labelKey: 'views.tree', icon: GitBranch, Component: ForceView },
  { id: 'timeline', labelKey: 'views.timeline', icon: Clock, Component: TimelineView },
  { id: 'calendar', labelKey: 'views.calendar', icon: CalendarDays, Component: CalendarView },
  { id: 'map', labelKey: 'views.map', icon: Map, Component: MapView },
]

export function getView(id: string): ViewPlugin | undefined {
  return viewRegistry.find((v) => v.id === id)
}
