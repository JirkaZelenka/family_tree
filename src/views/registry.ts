import { GitBranch, Clock } from 'lucide-react'
import type { ViewPlugin } from './types'
import { ForceView } from './force/ForceView'
import { TimelineView } from './timeline/TimelineView'

export const viewRegistry: ViewPlugin[] = [
  { id: 'tree', labelKey: 'views.tree', icon: GitBranch, Component: ForceView },
  { id: 'timeline', labelKey: 'views.timeline', icon: Clock, Component: TimelineView },
]

export function getView(id: string): ViewPlugin | undefined {
  return viewRegistry.find((v) => v.id === id)
}
