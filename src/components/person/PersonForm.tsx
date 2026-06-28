import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGraphStore } from '@/stores/graph-store'
import { useVaultStore } from '@/stores/vault-store'
import { serializePersonMarkdown } from '@/lib/parser/markdown'
import type { PersonNode } from '@/types/person'

interface PersonFormProps {
  person: PersonNode
  onClose: () => void
}

export function PersonForm({ person, onClose }: PersonFormProps) {
  const { t } = useTranslation()
  const loadFromRecords = useGraphStore((s) => s.loadFromRecords)
  const vault = useVaultStore((s) => s.vault)
  const updatePersonFile = useVaultStore((s) => s.updatePersonFile)
  const setVault = useVaultStore((s) => s.setVault)

  const [givenName, setGivenName] = useState(person.givenName)
  const [familyName, setFamilyName] = useState(person.familyName ?? '')
  const [birthDate, setBirthDate] = useState(person.birth?.date ?? '')
  const [deathDate, setDeathDate] = useState(person.death?.date ?? '')
  const [body, setBody] = useState(person.body)

  const save = () => {
    if (!vault) return
    const updated = {
      ...person,
      givenName,
      familyName: familyName || undefined,
      birth: { ...person.birth, date: birthDate || undefined },
      death: { ...person.death, date: deathDate || undefined },
      body,
    }
    const record = {
      frontmatter: {
        id: updated.id,
        slug: updated.slug,
        givenName: updated.givenName,
        familyName: updated.familyName,
        maidenName: updated.maidenName,
        gender: updated.gender,
        lineage: updated.lineage,
        birth: updated.birth,
        death: updated.death,
        parents: updated.parents,
        spouses: updated.spouses,
        children: updated.children,
        tags: updated.tags,
        confidence: updated.confidence,
        media: updated.media,
        sources: updated.sources,
      },
      body,
      filePath: person.filePath,
    }
    const content = serializePersonMarkdown(record)
    updatePersonFile(person.filePath, content)
    const people = vault.people.map((p) =>
      p.frontmatter.id === person.id ? record : p,
    )
    setVault({ ...vault, people })
    loadFromRecords(people)
    onClose()
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <h3 className="text-sm font-medium">{t('person.edit')}</h3>
      <div>
        <Label>Jméno</Label>
        <Input value={givenName} onChange={(e) => setGivenName(e.target.value)} />
      </div>
      <div>
        <Label>Příjmení</Label>
        <Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
      </div>
      <div>
        <Label>{t('person.birth')}</Label>
        <Input value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      </div>
      <div>
        <Label>{t('person.death')}</Label>
        <Input value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
      </div>
      <div>
        <Label>Biografie</Label>
        <textarea
          className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save}>
          Uložit
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Zrušit
        </Button>
      </div>
    </div>
  )
}
