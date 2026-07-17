import type { LucideIcon } from 'lucide-react'

export type ViewId = 'tree' | 'timeline' | 'calendar'

export interface ViewProps {
  className?: string
}

export interface ViewPlugin {
  id: ViewId
  labelKey: string
  icon: LucideIcon
  Component: React.FC<ViewProps>
}
