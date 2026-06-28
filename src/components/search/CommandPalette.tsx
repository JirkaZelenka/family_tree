import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useSearchStore } from '@/stores/search-store'
import { useGraphStore } from '@/stores/graph-store'

export function CommandPalette() {
  const { t } = useTranslation()
  const open = useSearchStore((s) => s.commandOpen)
  const setCommandOpen = useSearchStore((s) => s.setCommandOpen)
  const runSearch = useSearchStore((s) => s.runSearch)
  const results = useSearchStore((s) => s.results)
  const setSelectedId = useGraphStore((s) => s.setSelectedId)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [setCommandOpen])

  return (
    <CommandDialog open={open} onOpenChange={setCommandOpen}>
      <CommandInput
        placeholder={t('search.placeholder')}
        onValueChange={runSearch}
      />
      <CommandList>
        <CommandEmpty>{t('search.noResults')}</CommandEmpty>
        {results.map((doc) => (
          <CommandItem
            key={doc.id}
            value={doc.fullName}
            onSelect={() => {
              setSelectedId(doc.id)
              setCommandOpen(false)
            }}
          >
            <span>{doc.fullName}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {doc.birthYear || '?'}
            </span>
          </CommandItem>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
