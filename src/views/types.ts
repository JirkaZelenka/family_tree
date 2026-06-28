import type { LucideIcon } from 'lucide-react'

export type ViewId = 'sphere' | 'tree' | 'force' | 'timeline' | 'map'

export interface ViewProps {
  className?: string
}

export interface ViewPlugin {
  id: ViewId
  labelKey: string
  icon: LucideIcon
  Component: React.FC<ViewProps>
}
