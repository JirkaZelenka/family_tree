import { useTranslation } from 'react-i18next'
import { useVaultStore } from '@/stores/vault-store'
import { getLineages } from '@/lib/graph/queries'
import { useGraphStore } from '@/stores/graph-store'
import { useViewStore } from '@/stores/view-store'
import { useLayoutStore } from '@/stores/layout-store'
import { enrichLineageColors, lineageColor, pastelizeColor, countLineageMembers } from '@/lib/vault/lineage-colors'

export function LineageLegend() {
  const { t } = useTranslation()
  const graph = useGraphStore((s) => s.graph)
  const setHighlightedIds = useGraphStore((s) => s.setHighlightedIds)
  const vaultColors = useVaultStore((s) => s.vault?.config.lineageColors ?? {})
  const activeView = useViewStore((s) => s.activeView)
  const focusedLineage = useLayoutStore((s) => s.focusedLineage)
  const setFocusedLineage = useLayoutStore((s) => s.setFocusedLineage)
  const expandedLineages = useLayoutStore((s) => s.expandedLineages)
  const toggleLineageExpanded = useLayoutStore((s) => s.toggleLineageExpanded)

  if (!graph) return null
  const lineages = getLineages(graph)
  const memberCounts = countLineageMembers(
    graph.nodes().map((id) => graph.getNodeAttributes(id).lineage),
  )
  const colors = enrichLineageColors(lineages, vaultColors, memberCounts)
  const isSphere = activeView === 'sphere'
  const isForce = activeView === 'force'

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 text-xs">
      <span className="text-muted-foreground">{t('person.lineage')}:</span>
      {lineages.map((lineage) => {
        const baseColor = lineageColor(lineage, colors)
        const expanded = isForce ? expandedLineages.has(lineage) : true
        const active = isSphere && focusedLineage === lineage
        const swatchColor =
          isForce && !expanded ? pastelizeColor(baseColor, 0.7) : baseColor

        return (
          <button
            key={lineage}
            type="button"
            onClick={() => {
              if (isSphere) {
                setFocusedLineage(active ? null : lineage)
                return
              }
              if (isForce) {
                toggleLineageExpanded(lineage)
                setHighlightedIds(new Set())
              }
            }}
            className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors ${
              isSphere || isForce ? 'cursor-pointer hover:bg-accent' : 'cursor-default'
            } ${active || (isForce && expanded) ? 'bg-accent ring-1 ring-primary' : ''} ${
              isForce && !expanded ? 'opacity-70' : ''
            }`}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: swatchColor }}
            />
            <span>{lineage}</span>
          </button>
        )
      })}
      {isSphere && (
        <span className="ml-auto text-muted-foreground">{t('layout.sphereHint')}</span>
      )}
      {isForce && (
        <span className="ml-auto text-muted-foreground">{t('layout.forceHint')}</span>
      )}
    </div>
  )
}
