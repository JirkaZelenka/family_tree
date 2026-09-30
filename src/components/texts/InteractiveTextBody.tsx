import { useCallback, useMemo, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'
import type { TextMention } from '@/types/text'

export interface InteractiveTextBodyProps {
  body: string
  mentions: TextMention[]
  className?: string
  onClickPerson?: (personId: string, mentionStart: number) => void
  onClickLineage?: (lineage: string, mentionStart: number) => void
}

type Segment =
  | { kind: 'plain'; text: string }
  | { kind: 'mention'; text: string; mention: TextMention }

function buildSegments(body: string, mentions: TextMention[]): Segment[] {
  const sorted = [...mentions]
    .filter((m) => m.end > m.start)
    .sort((a, b) => a.start - b.start)
  const segments: Segment[] = []
  let cursor = 0
  for (const mention of sorted) {
    const start = Math.max(mention.start, cursor)
    const end = Math.max(mention.end, start)
    if (start > cursor) {
      segments.push({ kind: 'plain', text: body.slice(cursor, start) })
    }
    if (end > start) {
      segments.push({
        kind: 'mention',
        text: body.slice(start, end),
        mention: { ...mention, start, end },
      })
    }
    cursor = Math.max(cursor, end)
  }
  if (cursor < body.length) {
    segments.push({ kind: 'plain', text: body.slice(cursor) })
  }
  return segments
}

export function InteractiveTextBody({
  body,
  mentions,
  className,
  onClickPerson,
  onClickLineage,
}: InteractiveTextBodyProps) {
  const segments = useMemo(() => buildSegments(body, mentions), [body, mentions])

  const handleMentionClick = useCallback(
    (event: MouseEvent, mention: TextMention) => {
      // Při tažení výběru textu (komentář) nenavigovat.
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed) return
      event.preventDefault()
      event.stopPropagation()
      if (mention.kind === 'person') {
        onClickPerson?.(mention.ref, mention.start)
      } else {
        onClickLineage?.(mention.ref, mention.start)
      }
    },
    [onClickPerson, onClickLineage],
  )

  return (
    <div className={cn('whitespace-pre-wrap text-sm leading-relaxed', className)}>
      {segments.map((segment, index) => {
        if (segment.kind === 'plain') {
          return <span key={index}>{segment.text}</span>
        }
        const isPerson = segment.mention.kind === 'person'
        return (
          <mark
            key={index}
            data-mention-kind={segment.mention.kind}
            data-mention-ref={segment.mention.ref}
            data-mention-start={segment.mention.start}
            title={isPerson ? 'Klik → Strom' : 'Klik → Rod ve stromu'}
            onClick={(e) => handleMentionClick(e, segment.mention)}
            className={cn(
              'rounded-sm px-0.5 font-medium text-foreground',
              isPerson
                ? 'cursor-pointer bg-primary/25 hover:bg-primary/40'
                : 'cursor-pointer bg-amber-500/20 hover:bg-amber-500/35',
            )}
          >
            {segment.text}
          </mark>
        )
      })}
    </div>
  )
}
