import { Globe, GitBranch, Network, Clock, Map } from 'lucide-react'
import type { ViewPlugin } from './types'
import { SphereView } from './sphere/SphereView'
import { TreeView } from './tree/TreeView'
import { ForceView } from './force/ForceView'
import { TimelineView } from './timeline/TimelineView'
import { MapView } from './map/MapView'

export const viewRegistry: ViewPlugin[] = [
  { id: 'sphere', labelKey: 'views.sphere', icon: Globe, Component: SphereView },
  { id: 'tree', labelKey: 'views.tree', icon: GitBranch, Component: TreeView },
  { id: 'force', labelKey: 'views.force', icon: Network, Component: ForceView },
  { id: 'timeline', labelKey: 'views.timeline', icon: Clock, Component: TimelineView },
  { id: 'map', labelKey: 'views.map', icon: Map, Component: MapView },
]

export function getView(id: string): ViewPlugin | undefined {
  return viewRegistry.find((v) => v.id === id)
}
