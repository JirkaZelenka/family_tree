import { useTranslation } from 'react-i18next'
import { useVaultStore } from '@/stores/vault-store'
import { getLineages } from '@/lib/graph/queries'
import { useGraphStore } from '@/stores/graph-store'
import { useViewStore } from '@/stores/view-store'
import { useLayoutStore } from '@/stores/layout-store'

export function LineageLegend() {
  const { t } = useTranslation()
  const graph = useGraphStore((s) => s.graph)
  const colors = useVaultStore((s) => s.vault?.config.lineageColors ?? {})
  const activeView = useViewStore((s) => s.activeView)
  const focusedLineage = useLayoutStore((s) => s.focusedLineage)
  const setFocusedLineage = useLayoutStore((s) => s.setFocusedLineage)

  if (!graph) return null
  const lineages = getLineages(graph)
  const isSphere = activeView === 'sphere'

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 text-xs">
      <span className="text-muted-foreground">{t('person.lineage')}:</span>
      {lineages.map((lineage) => {
        const active = isSphere && focusedLineage === lineage
        const Tag = isSphere ? 'button' : 'div'
        return (
          <Tag
            key={lineage}
            type={isSphere ? 'button' : undefined}
            onClick={isSphere ? () => setFocusedLineage(active ? null : lineage) : undefined}
            className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors ${
              isSphere ? 'cursor-pointer hover:bg-accent' : ''
            } ${active ? 'bg-accent ring-1 ring-primary' : ''}`}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: colors[lineage] ?? '#94a3b8' }}
            />
            <span>{lineage}</span>
          </Tag>
        )
      })}
      {isSphere && (
        <span className="ml-auto text-muted-foreground">{t('layout.sphereHint')}</span>
      )}
    </div>
  )
}
