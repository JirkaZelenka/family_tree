import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useViewStore } from '@/stores/view-store'
import { PersonDetailPanel } from '@/components/person/PersonDetailPanel'
import { Button } from '@/components/ui/button'

export function PersonTreeSidebar() {
  const { t } = useTranslation()
  const personSidebarOpen = useViewStore((s) => s.personSidebarOpen)
  const setPersonSidebarOpen = useViewStore((s) => s.setPersonSidebarOpen)
  const profilePersonId = useViewStore((s) => s.profilePersonId)
  const setProfilePersonId = useViewStore((s) => s.setProfilePersonId)

  if (!personSidebarOpen) {
    return (
      <aside className="relative z-20 flex h-full w-9 shrink-0 flex-col border-r border-border bg-background">
        <button
          type="button"
          onClick={() => setPersonSidebarOpen(true)}
          title={t('layout.expandPersonPanel')}
          aria-label={t('layout.expandPersonPanel')}
          className="flex h-9 w-full items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelLeftOpen className="h-4 w-4" aria-hidden />
        </button>
      </aside>
    )
  }

  return (
    <aside className="relative z-20 flex h-full min-h-0 w-72 shrink-0 flex-col border-r border-border bg-background xl:w-80">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-2 py-1">
        <button
          type="button"
          onClick={() => setPersonSidebarOpen(false)}
          title={t('layout.collapsePersonPanel')}
          aria-label={t('layout.collapsePersonPanel')}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelLeftClose className="h-4 w-4" aria-hidden />
        </button>
        {profilePersonId ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setProfilePersonId(null)}
            aria-label={t('person.closeProfile')}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <span className="h-8 w-8" aria-hidden />
        )}
      </div>
      <div className="min-h-0 flex-1">
        <PersonDetailPanel variant="sidebar" />
      </div>
    </aside>
  )
}
