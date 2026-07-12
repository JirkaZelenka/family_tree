import { PersonDetailPanel } from '@/components/person/PersonDetailPanel'

export function PersonTreeSidebar() {
  return (
    <aside className="relative z-20 flex h-full min-h-0 w-72 shrink-0 flex-col border-r border-border bg-background xl:w-80">
      <PersonDetailPanel variant="sidebar" />
    </aside>
  )
}
