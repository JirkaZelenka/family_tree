import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useMemo,
  type MouseEvent,
  type ReactNode,
} from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import { Download, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TextAttachment, TextMention } from '@/types/text'

export interface InteractiveTextBodyProps {
  body: string
  mentions: TextMention[]
  attachments?: TextAttachment[]
  className?: string
  /** Rozsahy v displayBody, které mají zůstat zvýrazněné (např. zmínky osoby v dialogu). */
  highlightRanges?: Array<{ start: number; end: number }>
  onClickPerson?: (personId: string, mentionStart: number) => void
  onClickLineage?: (lineage: string, mentionStart: number) => void
  onHoverPerson?: (personId: string | null) => void
}

type MarkRange =
  | { kind: 'mention'; start: number; end: number; mention: TextMention }
  | { kind: 'attachment'; start: number; end: number; attachment: TextAttachment }
  | { kind: 'highlight'; start: number; end: number }

type Marker =
  | { kind: 'mention'; text: string; mention: TextMention }
  | { kind: 'attachment'; text: string; attachment: TextAttachment }
  | { kind: 'highlight'; text: string }

const PLACEHOLDER_RE = /\uE000FT(\d+)\uE001/g

function placeholder(id: number): string {
  return `\uE000FT${id}\uE001`
}

/** Chráněné úseky (zmínky/přílohy/highlight), aby je markdown nerozbil. */
export function protectMarkedSpans(
  body: string,
  mentions: TextMention[],
  attachments: TextAttachment[],
  highlightRanges: Array<{ start: number; end: number }> = [],
): { markdown: string; markers: Marker[] } {
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
    ...highlightRanges
      .filter((r) => r.end > r.start)
      .map((range) => ({
        kind: 'highlight' as const,
        start: range.start,
        end: range.end,
      })),
  ].sort((a, b) => a.start - b.start || b.end - a.end)

  const markers: Marker[] = []
  let markdown = ''
  let cursor = 0

  for (const range of ranges) {
    const start = Math.max(range.start, cursor)
    const end = Math.max(range.end, start)
    if (start > cursor) {
      markdown += body.slice(cursor, start)
    }
    if (end > start) {
      const text = body.slice(start, end)
      const id = markers.length
      if (range.kind === 'mention') {
        markers.push({
          kind: 'mention',
          text,
          mention: { ...range.mention, start, end },
        })
      } else if (range.kind === 'attachment') {
        markers.push({
          kind: 'attachment',
          text,
          attachment: { ...range.attachment, start, end },
        })
      } else {
        markers.push({ kind: 'highlight', text })
      }
      markdown += placeholder(id)
    }
    cursor = Math.max(cursor, end)
  }
  if (cursor < body.length) {
    markdown += body.slice(cursor)
  }
  return { markdown, markers }
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

function splitTextWithMarkers(
  text: string,
  markers: Marker[],
  renderMarker: (marker: Marker, key: string) => ReactNode,
): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  const re = new RegExp(PLACEHOLDER_RE.source, 'g')
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index))
    }
    const marker = markers[Number(match[1])]
    if (marker) {
      nodes.push(renderMarker(marker, `m-${match.index}-${match[1]}`))
    } else {
      nodes.push(match[0])
    }
    last = match.index + match[0].length
  }
  if (last < text.length) {
    nodes.push(text.slice(last))
  }
  return nodes
}

function injectMarkers(
  children: ReactNode,
  markers: Marker[],
  renderMarker: (marker: Marker, key: string) => ReactNode,
): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === 'string') {
      const parts = splitTextWithMarkers(child, markers, renderMarker)
      return parts.length === 1 ? parts[0] : parts
    }
    if (typeof child === 'number') {
      return child
    }
    if (!isValidElement<{ children?: ReactNode }>(child)) {
      return child
    }
    if (child.props.children == null) {
      return child
    }
    return cloneElement(child, {
      ...child.props,
      children: injectMarkers(child.props.children, markers, renderMarker),
    })
  })
}

function markdownComponents(
  markers: Marker[],
  renderMarker: (marker: Marker, key: string) => ReactNode,
): Components {
  const withMarks = (nodes: ReactNode) => injectMarkers(nodes, markers, renderMarker)

  return {
    h1: ({ children }) => (
      <h1 className="mb-3 mt-6 font-heritage text-2xl font-semibold tracking-wide first:mt-0">
        {withMarks(children)}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-2 mt-6 font-heritage text-xl font-semibold tracking-wide first:mt-0">
        {withMarks(children)}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-5 font-heritage text-lg font-semibold tracking-wide first:mt-0">
        {withMarks(children)}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mb-1.5 mt-4 text-base font-semibold first:mt-0">{withMarks(children)}</h4>
    ),
    p: ({ children }) => <p className="mb-3 last:mb-0">{withMarks(children)}</p>,
    strong: ({ children }) => <strong className="font-semibold">{withMarks(children)}</strong>,
    em: ({ children }) => <em className="italic">{withMarks(children)}</em>,
    ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{withMarks(children)}</ul>,
    ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{withMarks(children)}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{withMarks(children)}</li>,
    blockquote: ({ children }) => (
      <blockquote className="mb-3 border-l-2 border-primary/40 pl-3 italic text-muted-foreground">
        {withMarks(children)}
      </blockquote>
    ),
    hr: () => <hr className="my-6 border-border" />,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        {withMarks(children)}
      </a>
    ),
    br: () => <br />,
  }
}

export function InteractiveTextBody({
  body,
  mentions,
  attachments = [],
  className,
  highlightRanges = [],
  onClickPerson,
  onClickLineage,
  onHoverPerson,
}: InteractiveTextBodyProps) {
  const { markdown, markers } = useMemo(
    () => protectMarkedSpans(body, mentions, attachments, highlightRanges),
    [body, mentions, attachments, highlightRanges],
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

  const renderMarker = useCallback(
    (marker: Marker, key: string) => {
      if (marker.kind === 'attachment') {
        return (
          <AttachmentInline
            key={key}
            attachment={marker.attachment}
            text={marker.text}
          />
        )
      }
      if (marker.kind === 'highlight') {
        return (
          <mark
            key={key}
            className="rounded-sm bg-primary/25 px-0.5 font-medium text-foreground"
          >
            {marker.text}
          </mark>
        )
      }

      const isPerson = marker.mention.kind === 'person'
      const clickable = Boolean(onClickPerson || onClickLineage)
      const hoverable = Boolean(onHoverPerson) && isPerson
      return (
        <mark
          key={key}
          data-mention-kind={marker.mention.kind}
          data-mention-ref={marker.mention.ref}
          data-mention-start={marker.mention.start}
          title={
            clickable
              ? isPerson
                ? 'Klik → Strom'
                : 'Klik → Rod ve stromu'
              : hoverable
                ? 'Najetí → Strom vpravo'
                : undefined
          }
          onClick={clickable ? (e) => handleMentionClick(e, marker.mention) : undefined}
          onMouseEnter={() => {
            if (isPerson) onHoverPerson?.(marker.mention.ref)
          }}
          onMouseLeave={() => {
            if (isPerson) onHoverPerson?.(null)
          }}
          className={cn(
            'rounded-sm px-0.5 font-medium text-foreground',
            isPerson
              ? cn(
                  'bg-primary/25',
                  clickable && 'cursor-pointer hover:bg-primary/40',
                  !clickable && hoverable && 'hover:bg-primary/40',
                )
              : cn('bg-amber-500/20', clickable && 'cursor-pointer hover:bg-amber-500/35'),
          )}
        >
          {marker.text}
        </mark>
      )
    },
    [handleMentionClick, onClickLineage, onClickPerson, onHoverPerson],
  )

  const components = useMemo(
    () => markdownComponents(markers, renderMarker),
    [markers, renderMarker],
  )

  return (
    <div className={cn('formatted-text-body text-sm leading-relaxed', className)}>
      <ReactMarkdown components={components}>{markdown}</ReactMarkdown>
    </div>
  )
}
