import { useTranslation } from 'react-i18next'
import { useVaultStore } from '@/stores/vault-store'
import { getLineages } from '@/lib/graph/queries'
import { useGraphStore } from '@/stores/graph-store'

export function LineageLegend() {
  const { t } = useTranslation()
  const graph = useGraphStore((s) => s.graph)
  const colors = useVaultStore((s) => s.vault?.config.lineageColors ?? {})

  if (!graph) return null
  const lineages = getLineages(graph)

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 text-xs">
      <span className="text-muted-foreground">{t('person.lineage')}:</span>
      {lineages.map((lineage) => (
        <div key={lineage} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: colors[lineage] ?? '#94a3b8' }}
          />
          <span>{lineage}</span>
        </div>
      ))}
    </div>
  )
}
