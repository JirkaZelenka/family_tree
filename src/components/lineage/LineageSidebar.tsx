import { useMemo } from 'react'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useVaultStore } from '@/stores/vault-store'
import { getLineages } from '@/lib/graph/queries'
import { useGraphStore } from '@/stores/graph-store'
import { useViewStore } from '@/stores/view-store'
import { useLayoutStore } from '@/stores/layout-store'
import {
  enrichLineageColors,
  lineageColor,
  countAffiliatedLineageMembers,
} from '@/lib/vault/lineage-colors'
import { LineageColorPicker } from '@/components/lineage/LineageColorPicker'
import { cn } from '@/lib/utils'

export function LineageSidebar() {
  const { t } = useTranslation()
  const graph = useGraphStore((s) => s.graph)
  const persons = useGraphStore((s) => s.persons)
  const setHighlightedIds = useGraphStore((s) => s.setHighlightedIds)
  const vaultColors = useVaultStore((s) => s.vault?.config.lineageColors ?? {})
  const activeView = useViewStore((s) => s.activeView)
  const lineageSort = useViewStore((s) => s.lineageSort)
  const setLineageSort = useViewStore((s) => s.setLineageSort)
  const lineageSidebarOpen = useViewStore((s) => s.lineageSidebarOpen)
  const setLineageSidebarOpen = useViewStore((s) => s.setLineageSidebarOpen)
  const expandedLineages = useLayoutStore((s) => s.expandedLineages)
  const toggleLineageExpanded = useLayoutStore((s) => s.toggleLineageExpanded)

  const lineages = useMemo(() => (graph ? getLineages(graph) : []), [graph])

  const memberCounts = useMemo(
    () => countAffiliatedLineageMembers(persons.values(), lineages),
    [persons, lineages],
  )

  const colors = useMemo(
    () => enrichLineageColors(lineages, vaultColors, memberCounts),
    [lineages, vaultColors, memberCounts],
  )

  const sortedLineages = useMemo(() => {
    const items = lineages.map((name) => ({ name, count: memberCounts[name] ?? 0 }))
    if (lineageSort === 'members') {
      return items.sort(
        (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'cs'),
      )
    }
    return items.sort((a, b) => a.name.localeCompare(b.name, 'cs'))
  }, [lineages, memberCounts, lineageSort])

  const isTree = activeView === 'tree'

  if (!graph) return null

  if (!lineageSidebarOpen) {
    return (
      <aside className="flex h-full w-9 shrink-0 flex-col border-l border-border heritage-chrome">
        <button
          type="button"
          onClick={() => setLineageSidebarOpen(true)}
          title={t('layout.expandLineagePanel')}
          aria-label={t('layout.expandLineagePanel')}
          className="flex h-9 w-full items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelRightOpen className="h-4 w-4" aria-hidden />
        </button>
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-72 min-h-0 shrink-0 flex-col overflow-hidden border-l border-border heritage-chrome xl:w-80">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heritage text-sm font-semibold tracking-wide">{t('lineage.panelTitle')}</h2>
          <button
            type="button"
            onClick={() => setLineageSidebarOpen(false)}
            title={t('layout.collapseLineagePanel')}
            aria-label={t('layout.collapseLineagePanel')}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <PanelRightClose className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="mt-2 flex gap-1">
          <button
            type="button"
            onClick={() => setLineageSort('name')}
            className={cn(
              'rounded-md px-2 py-1 text-xs transition-colors',
              lineageSort === 'name'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {t('lineage.sortByName')}
          </button>
          <button
            type="button"
            onClick={() => setLineageSort('members')}
            className={cn(
              'rounded-md px-2 py-1 text-xs transition-colors',
              lineageSort === 'members'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {t('lineage.sortByMembers')}
          </button>
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {sortedLineages.map(({ name, count }) => {
          const baseColor = lineageColor(name, colors)
          const expanded = isTree ? expandedLineages.has(name) : true
          return (
            <li key={name}>
              <div
                className={cn(
                  'flex w-full items-center gap-1 rounded-md px-1 py-1 text-left text-sm transition-colors',
                  isTree && expanded && 'bg-accent ring-1 ring-primary',
                  isTree && !expanded && 'opacity-80',
                )}
              >
                <LineageColorPicker
                  lineage={name}
                  color={baseColor}
                  muted={isTree && !expanded}
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault()
                    if (isTree) {
                      toggleLineageExpanded(name)
                      setHighlightedIds(new Set())
                    }
                  }}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1',
                    isTree ? 'cursor-pointer hover:bg-accent/80' : 'cursor-default',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    {count}
                  </span>
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {isTree && (
        <p className="shrink-0 border-t border-border px-4 py-2 text-[11px] leading-snug text-muted-foreground">
          {t('layout.treeHint')}
        </p>
      )}
    </aside>
  )
}
