import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useViewStore } from '@/stores/view-store'
import { PersonDetailPanel } from './PersonDetailPanel'
import { useVaultStore } from '@/stores/vault-store'
import { lineageColor } from '@/lib/vault/lineage-colors'
import { useDetailPerson } from '@/hooks/useDetailPerson'
import { cn } from '@/lib/utils'

export function PersonDetailSidebar() {
  const { t } = useTranslation()
  const collapsed = useViewStore((s) => s.detailPanelCollapsed)
  const setCollapsed = useViewStore((s) => s.setDetailPanelCollapsed)
  const { person, isPreview, pinnedPerson } = useDetailPerson()
  const colors = useVaultStore((s) => s.vault?.config.lineageColors ?? {})
  const tabPerson = collapsed ? pinnedPerson : (pinnedPerson ?? person)

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 shrink-0 overflow-hidden border-l border-border bg-background transition-[width] duration-200 ease-out',
        collapsed ? 'w-11' : 'w-72 xl:w-80',
      )}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex h-full w-full flex-col items-center gap-3 py-4 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={t('person.expandPanel')}
          aria-label={t('person.expandPanel')}
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          {tabPerson ? (
            <span
              className="max-h-[min(12rem,40vh)] truncate text-[10px] font-medium tracking-wide [writing-mode:vertical-rl]"
              style={{ color: lineageColor(tabPerson.lineage, colors) }}
            >
              {tabPerson.givenName}
            </span>
          ) : (
            <span className="text-[10px] font-medium tracking-wide [writing-mode:vertical-rl]">
              {t('person.panelTab')}
            </span>
          )}
        </button>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-2 py-1.5">
            <span className="px-2 text-xs font-medium text-muted-foreground">
              {isPreview && pinnedPerson
                ? t('person.previewPerson')
                : pinnedPerson
                  ? t('person.selectedPerson')
                  : t('person.previewPerson')}
            </span>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={t('person.collapsePanel')}
              aria-label={t('person.collapsePanel')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <PersonDetailPanel />
          </div>
        </div>
      )}
    </aside>
  )
}
