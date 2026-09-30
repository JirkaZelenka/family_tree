import { useMemo } from 'react'
import { FileText, PanelRightClose, PanelRightOpen, User, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useVaultStore } from '@/stores/vault-store'
import { getLineages } from '@/lib/graph/queries'
import { isNoAccessLineage } from '@/auth/lineage-visibility'
import { useGraphStore } from '@/stores/graph-store'
import { useViewStore, type LineageSort } from '@/stores/view-store'
import { useLayoutStore } from '@/stores/layout-store'
import {
  enrichLineageColors,
  lineageColor,
  countAffiliatedLineageMembers,
} from '@/lib/vault/lineage-colors'
import { findLineageTexts } from '@/lib/texts'
import { LineageColorPicker } from '@/components/lineage/LineageColorPicker'
import { MentionedTexts } from '@/components/texts/MentionedTexts'
import { cn } from '@/lib/utils'

const SORT_OPTIONS: LineageSort[] = ['name', 'members', 'mentions']

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
  const selectedLineage = useViewStore((s) => s.selectedLineage)
  const setSelectedLineage = useViewStore((s) => s.setSelectedLineage)
  const expandedLineages = useLayoutStore((s) => s.expandedLineages)
  const toggleLineageExpanded = useLayoutStore((s) => s.toggleLineageExpanded)
  const texts = useVaultStore((s) => s.displayTexts)

  const lineages = useMemo(() => (graph ? getLineages(graph) : []), [graph])

  const memberCounts = useMemo(
    () => countAffiliatedLineageMembers(persons.values(), lineages),
    [persons, lineages],
  )

  const colors = useMemo(
    () => enrichLineageColors(lineages, vaultColors, memberCounts),
    [lineages, vaultColors, memberCounts],
  )

  const textCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const name of lineages) {
      counts[name] = isNoAccessLineage(name) ? 0 : findLineageTexts(texts, name).length
    }
    return counts
  }, [lineages, texts])

  const sortedLineages = useMemo(() => {
    const items = lineages.map((name) => ({
      name,
      members: memberCounts[name] ?? 0,
      mentions: textCounts[name] ?? 0,
    }))
    const accessible = items.filter((item) => !isNoAccessLineage(item.name))
    const noAccess = items.filter((item) => isNoAccessLineage(item.name))
    if (lineageSort === 'members') {
      accessible.sort((a, b) => b.members - a.members || a.name.localeCompare(b.name, 'cs'))
    } else if (lineageSort === 'mentions') {
      accessible.sort((a, b) => b.mentions - a.mentions || a.name.localeCompare(b.name, 'cs'))
    } else {
      accessible.sort((a, b) => a.name.localeCompare(b.name, 'cs'))
    }
    return [...accessible, ...noAccess]
  }, [lineages, memberCounts, textCounts, lineageSort])

  const selectedOccurrences = useMemo(
    () =>
      selectedLineage && !isNoAccessLineage(selectedLineage)
        ? findLineageTexts(texts, selectedLineage)
        : [],
    [selectedLineage, texts],
  )

  const isTree = activeView === 'tree'

  const lineageLabel = (name: string) =>
    isNoAccessLineage(name) ? t('lineage.noAccess') : name

  const sortLabelKey = (sort: LineageSort) => {
    if (sort === 'members') return 'lineage.sortByMembers'
    if (sort === 'mentions') return 'lineage.sortByMentions'
    return 'lineage.sortByName'
  }

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
          {SORT_OPTIONS.map((sort) => (
            <button
              key={sort}
              type="button"
              onClick={() => setLineageSort(sort)}
              className={cn(
                'min-w-0 flex-1 rounded-md px-1.5 py-1 text-center text-[11px] leading-tight transition-colors',
                lineageSort === sort
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {t(sortLabelKey(sort))}
            </button>
          ))}
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {sortedLineages.map(({ name, members, mentions }) => {
          const baseColor = lineageColor(name, colors)
          const expanded = isTree ? expandedLineages.has(name) : true
          const selected = selectedLineage === name
          const noAccess = isNoAccessLineage(name)
          const collapsed = isTree && !expanded
          return (
            <li key={name}>
              <div
                className={cn(
                  'flex w-full items-center gap-1 rounded-md px-1 py-1 text-left text-sm transition-colors',
                  selected && 'bg-accent ring-1 ring-primary',
                  isTree && expanded && !selected && 'bg-accent/70',
                  collapsed && 'opacity-75',
                  noAccess && 'mt-1 border-t border-border/60 pt-2',
                )}
              >
                {noAccess ? (
                  <span
                    className={cn(
                      'ml-1 h-4 w-4 shrink-0 rounded-full border border-border',
                      collapsed && 'opacity-50',
                    )}
                    style={{ backgroundColor: baseColor }}
                    title={t('lineage.noAccess')}
                  />
                ) : (
                  <LineageColorPicker
                    lineage={name}
                    color={baseColor}
                    muted={collapsed}
                  />
                )}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault()
                    setSelectedLineage(name)
                    if (isTree) {
                      toggleLineageExpanded(name)
                      setHighlightedIds(new Set())
                    }
                  }}
                  className="grid min-w-0 flex-1 cursor-pointer grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-1 rounded-md px-1 py-1 hover:bg-accent/80"
                >
                  <span
                    className={cn(
                      'min-w-0 truncate font-medium',
                      collapsed && 'text-muted-foreground line-through decoration-muted-foreground/70',
                    )}
                  >
                    {lineageLabel(name)}
                  </span>
                  <span
                    className="inline-flex min-w-0 items-center justify-end gap-1 tabular-nums text-xs text-muted-foreground"
                    title={t('lineage.memberCount')}
                  >
                    <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {members}
                  </span>
                  <span
                    className="inline-flex min-w-0 items-center justify-end gap-1 tabular-nums text-xs text-muted-foreground"
                    title={t('lineage.mentionCount')}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {mentions}
                  </span>
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {texts.length > 0 && selectedLineage && !isNoAccessLineage(selectedLineage) && (
        <div className="flex max-h-[42%] min-h-0 shrink-0 flex-col border-t border-border">
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-2">
            <h3 className="min-w-0 truncate text-sm font-medium">
              {t('texts.sectionTitle')}
              <span className="ml-1 font-normal text-muted-foreground">
                · {lineageLabel(selectedLineage)}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setSelectedLineage(null)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={t('person.closeProfile')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <MentionedTexts
              occurrences={selectedOccurrences}
              emptyLabel={t('texts.emptyLineage')}
            />
          </div>
        </div>
      )}

    </aside>
  )
}
