import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HighlightedExcerpt } from './HighlightedText'
import { TextDocumentDialog } from './TextDocumentDialog'
import type { TextOccurrence } from '@/types/text'

interface MentionedTextsProps {
  occurrences: TextOccurrence[]
  emptyLabel: string
}

export function MentionedTexts({ occurrences, emptyLabel }: MentionedTextsProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<TextOccurrence | null>(null)

  if (occurrences.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <>
      <ul className="space-y-2">
        {occurrences.map((occurrence) => (
          <li key={occurrence.document.filePath}>
            <button
              type="button"
              onClick={() => setOpen(occurrence)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-accent/60"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{occurrence.document.title}</div>
                  {occurrence.document.date && (
                    <div className="text-xs text-muted-foreground">{occurrence.document.date}</div>
                  )}
                </div>
                {occurrence.mentions.length > 1 && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {t('texts.occurrenceCount', { count: occurrence.mentions.length })}
                  </span>
                )}
              </div>
              <HighlightedExcerpt
                className="mt-1 line-clamp-3"
                before={occurrence.excerpt.before}
                hit={occurrence.excerpt.hit}
                after={occurrence.excerpt.after}
              />
            </button>
          </li>
        ))}
      </ul>
      <TextDocumentDialog occurrence={open} onClose={() => setOpen(null)} />
    </>
  )
}
