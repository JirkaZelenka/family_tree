import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useGraphStore } from '@/stores/graph-store'
import { useVaultStore } from '@/stores/vault-store'
import { useViewStore } from '@/stores/view-store'
import { PersonMedallion } from './PersonMedallion'
import { lineageColor } from '@/lib/vault/lineage-colors'
import { Separator } from '@/components/ui/separator'
import { hasKnownDeath } from '@/lib/time/dates'
import { formatFamilyNameWithMaiden } from '@/lib/parser/markdown'
import { siblingIds } from '@/lib/graph/person-links'
import { findPersonTexts } from '@/lib/texts'
import { MentionedTexts } from '@/components/texts/MentionedTexts'
import {
  DateFieldDisplay,
  MarriageDateDisplay,
  RelativeLineYears,
} from '@/components/person/PersonDateDisplay'
import type { PersonNode } from '@/types/person'

interface PersonDetailPanelProps {
  variant?: 'default' | 'sidebar'
}

function relativeLine(rel: PersonNode | undefined, _id: string) {
  const name = rel?.redacted ? 'X' : (rel?.fullName ?? 'X')
  return (
    <>
      {name} {rel && !rel.redacted ? <RelativeLineYears person={rel} /> : null}
    </>
  )
}

export function PersonDetailPanel({ variant = 'default' }: PersonDetailPanelProps) {
  const { t } = useTranslation()
  const profilePersonId = useViewStore((s) => s.profilePersonId)
  const persons = useGraphStore((s) => s.persons)
  const colors = useVaultStore((s) => s.vault?.config.lineageColors ?? {})
  const texts = useVaultStore((s) => s.displayTexts)

  const person = profilePersonId ? persons.get(profilePersonId) : null
  const isSidebar = variant === 'sidebar'
  const occurrences = useMemo(
    () => (person && !person.redacted ? findPersonTexts(texts, person.id) : []),
    [texts, person],
  )

  if (!person || !profilePersonId) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center p-4 text-center text-sm text-muted-foreground">
        {isSidebar ? t('person.doubleClickHint') : t('person.noSelection')}
      </div>
    )
  }

  const color = lineageColor(person.lineage, colors)
  const showDeath = hasKnownDeath(person.death?.date)
  const displayName = `${person.givenName} ${formatFamilyNameWithMaiden(person)}`.trim()
  const siblings = siblingIds(person, persons)
  const note = person.note?.trim() ?? ''

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto bg-background">
        <PersonMedallion
          person={person}
          color={color}
          variant="panel"
          hideDeathIfUnknown
          displayName={displayName}
        />

        <div className="space-y-4 p-4">
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">{t('person.birth')}: </span>
              <DateFieldDisplay date={person.birth?.date} place={person.birth?.place} />
            </div>
            {showDeath && (
              <div>
                <span className="text-muted-foreground">{t('person.death')}: </span>
                <DateFieldDisplay date={person.death?.date} place={person.death?.place} />
              </div>
            )}
          </div>

          {person.parents.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-1 text-sm font-medium">{t('person.parents')}</h3>
                <ul className="space-y-1 text-sm">
                  {person.parents.map((id) => (
                    <li key={id}>{relativeLine(persons.get(id), id)}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {siblings.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-1 text-sm font-medium">{t('person.siblings')}</h3>
                <ul className="space-y-1 text-sm">
                  {siblings.map((id) => (
                    <li key={id}>{relativeLine(persons.get(id), id)}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {person.spouses.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-1 text-sm font-medium">{t('person.spouses')}</h3>
                <ul className="space-y-1 text-sm">
                  {person.spouses.map((marriage) => {
                    const rel = persons.get(marriage.id)
                    return (
                      <li key={marriage.id}>
                        {relativeLine(rel, marriage.id)}
                        <MarriageDateDisplay date={marriage.marriageDate} />
                      </li>
                    )
                  })}
                </ul>
              </div>
            </>
          )}

          {person.children.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-1 text-sm font-medium">{t('person.children')}</h3>
                <ul className="space-y-1 text-sm">
                  {person.children.map((id) => (
                    <li key={id}>{relativeLine(persons.get(id), id)}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {texts.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 text-sm font-medium">{t('texts.sectionTitle')}</h3>
                <MentionedTexts
                  occurrences={occurrences}
                  emptyLabel={t('texts.emptyPerson')}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {(note || person.links.length > 0) && (
        <div className="shrink-0 space-y-4 border-t border-border bg-background p-4">
          {note && (
            <div>
              <h3 className="mb-1 text-sm font-medium">{t('person.notes')}</h3>
              <p className="whitespace-pre-wrap text-sm">{note}</p>
            </div>
          )}
          {person.links.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">{t('person.links')}</h3>
              <ul className="space-y-3 text-sm">
                {person.links.map((item, i) => (
                  <li key={i}>
                    {item.popisek?.trim() && (
                      <div className="mb-0.5 text-muted-foreground">{item.popisek}</div>
                    )}
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-primary hover:underline"
                    >
                      {item.link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
