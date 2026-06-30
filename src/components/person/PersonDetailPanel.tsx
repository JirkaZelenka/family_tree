import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGraphStore } from '@/stores/graph-store'
import { useVaultStore } from '@/stores/vault-store'
import { getContemporaries } from '@/lib/graph/queries'
import { Badge } from '@/components/ui/badge'
import { PersonMedallion } from './PersonMedallion'
import { lineageColor } from '@/lib/vault/lineage-colors'
import { Separator } from '@/components/ui/separator'
import { formatLifeSpan } from '@/lib/time/dates'
import { PersonForm } from './PersonForm'
import { Button } from '@/components/ui/button'
import { useDetailPerson } from '@/hooks/useDetailPerson'

export function PersonDetailPanel() {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const { person, detailId, selectedId, isPreview } = useDetailPerson()
  const graph = useGraphStore((s) => s.graph)
  const setHighlightedIds = useGraphStore((s) => s.setHighlightedIds)
  const persons = useGraphStore((s) => s.persons)
  const colors = useVaultStore((s) => s.vault?.config.lineageColors ?? {})

  if (!person || !detailId) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center p-4 text-sm text-muted-foreground">
        {t('person.noSelection')}
      </div>
    )
  }

  const color = lineageColor(person.lineage, colors)
  const canEdit = !isPreview && selectedId === detailId

  const contemporaries =
    graph && detailId ? getContemporaries(graph, detailId) : []

  const showContemporaries = () => {
    setHighlightedIds(new Set(contemporaries))
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <PersonMedallion person={person} color={color} variant="panel" />

      <div className="space-y-4 p-4">
        {canEdit && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              {t('person.edit')}
            </Button>
          </div>
        )}

        <Separator />

        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">{t('person.birth')}: </span>
            {person.birth?.date ?? '?'}
            {person.birth?.place && ` — ${person.birth.place}`}
          </div>
          <div>
            <span className="text-muted-foreground">{t('person.death')}: </span>
            {person.death?.date ?? '?'}
            {person.death?.place && ` — ${person.death.place}`}
          </div>
          <div className="text-muted-foreground">
            {formatLifeSpan(person.birthYear, person.deathYear)}
          </div>
        </div>

        {person.parents.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-medium">{t('person.parents')}</h3>
            <ul className="space-y-1 text-sm">
              {person.parents.map((id) => (
                <li key={id}>{persons.get(id)?.fullName ?? id}</li>
              ))}
            </ul>
          </div>
        )}

        {person.spouses.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-medium">{t('person.spouses')}</h3>
            <ul className="space-y-1 text-sm">
              {person.spouses.map((id) => (
                <li key={id}>{persons.get(id)?.fullName ?? id}</li>
              ))}
            </ul>
          </div>
        )}

        {person.children.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-medium">{t('person.children')}</h3>
            <ul className="space-y-1 text-sm">
              {person.children.map((id) => (
                <li key={id}>{persons.get(id)?.fullName ?? id}</li>
              ))}
            </ul>
          </div>
        )}

        {person.tags.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-medium">{t('person.tags')}</h3>
            <div className="flex flex-wrap gap-1">
              {person.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {person.media.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-medium">{t('person.media')}</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {person.media.map((m, i) => (
                <li key={i}>
                  [{m.type}] {m.caption ?? m.path}
                </li>
              ))}
            </ul>
          </div>
        )}

        {person.body && (
          <div className="prose prose-invert prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm">{person.body}</pre>
          </div>
        )}

        {contemporaries.length > 0 && (
          <div>
            <button
              type="button"
              onClick={showContemporaries}
              className="text-sm text-primary hover:underline"
            >
              {t('person.contemporaries')} ({contemporaries.length})
            </button>
          </div>
        )}

        {canEdit && editing && (
          <PersonForm person={person} onClose={() => setEditing(false)} />
        )}
      </div>
    </div>
  )
}
