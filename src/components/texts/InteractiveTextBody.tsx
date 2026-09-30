import { useCallback, useMemo, type MouseEvent } from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TextAttachment, TextMention } from '@/types/text'

export interface InteractiveTextBodyProps {
  body: string
  mentions: TextMention[]
  attachments?: TextAttachment[]
  className?: string
  onClickPerson?: (personId: string, mentionStart: number) => void
  onClickLineage?: (lineage: string, mentionStart: number) => void
}

type MarkRange =
  | { kind: 'mention'; start: number; end: number; mention: TextMention }
  | { kind: 'attachment'; start: number; end: number; attachment: TextAttachment }

type Segment =
  | { kind: 'plain'; text: string }
  | { kind: 'mention'; text: string; mention: TextMention }
  | { kind: 'attachment'; text: string; attachment: TextAttachment }

function buildSegments(
  body: string,
  mentions: TextMention[],
  attachments: TextAttachment[],
): Segment[] {
  const ranges: MarkRange[] = [
    ...mentions
      .filter((m) => m.end > m.start)
      .map((mention) => ({
        kind: 'mention' as const,
        start: mention.start,
        end: mention.end,
        mention,
      })),
    ...attachments
      .filter((a) => a.end > a.start)
      .map((attachment) => ({
        kind: 'attachment' as const,
        start: attachment.start,
        end: attachment.end,
        attachment,
      })),
  ].sort((a, b) => a.start - b.start || a.end - b.end)

  const segments: Segment[] = []
  let cursor = 0
  for (const range of ranges) {
    const start = Math.max(range.start, cursor)
    const end = Math.max(range.end, start)
    if (start > cursor) {
      segments.push({ kind: 'plain', text: body.slice(cursor, start) })
    }
    if (end > start) {
      const text = body.slice(start, end)
      if (range.kind === 'mention') {
        segments.push({ kind: 'mention', text, mention: { ...range.mention, start, end } })
      } else {
        segments.push({
          kind: 'attachment',
          text,
          attachment: { ...range.attachment, start, end },
        })
      }
    }
    cursor = Math.max(cursor, end)
  }
  if (cursor < body.length) {
    segments.push({ kind: 'plain', text: body.slice(cursor) })
  }
  return segments
}

function AttachmentInline({ attachment, text }: { attachment: TextAttachment; text: string }) {
  if (attachment.kind === 'audio') {
    return (
      <span className="my-2 block rounded-md border border-border bg-background/70 p-3">
        <span className="mb-2 block text-sm font-medium text-foreground">{text}</span>
        <audio controls preload="metadata" className="w-full max-w-lg" src={attachment.resolvedUrl}>
          <a href={attachment.resolvedUrl} className="text-primary underline">
            {text}
          </a>
        </audio>
      </span>
    )
  }

  if (attachment.kind === 'pdf') {
    return (
      <a
        href={attachment.resolvedUrl}
        target="_blank"
        rel="noreferrer"
        download
        className="inline-flex items-center gap-1 rounded-sm bg-sky-500/15 px-1 font-medium text-sky-800 underline-offset-2 hover:bg-sky-500/25 hover:underline dark:text-sky-200"
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        {text}
      </a>
    )
  }

  return (
    <a
      href={attachment.resolvedUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-sm bg-emerald-500/15 px-0.5 font-medium text-emerald-800 underline-offset-2 hover:bg-emerald-500/25 hover:underline dark:text-emerald-200"
    >
      {text}
      <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
    </a>
  )
}

export function InteractiveTextBody({
  body,
  mentions,
  attachments = [],
  className,
  onClickPerson,
  onClickLineage,
}: InteractiveTextBodyProps) {
  const segments = useMemo(
    () => buildSegments(body, mentions, attachments),
    [body, mentions, attachments],
  )

  const handleMentionClick = useCallback(
    (event: MouseEvent, mention: TextMention) => {
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
        if (segment.kind === 'attachment') {
          return (
            <AttachmentInline
              key={index}
              attachment={segment.attachment}
              text={segment.text}
            />
          )
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
