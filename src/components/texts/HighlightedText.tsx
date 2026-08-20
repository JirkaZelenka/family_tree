import { cn } from '@/lib/utils'

export function HighlightedExcerpt({
  before,
  hit,
  after,
  className,
}: {
  before: string
  hit: string
  after: string
  className?: string
}) {
  return (
    <p className={cn('text-sm leading-relaxed text-muted-foreground', className)}>
      {before}
      <mark className="rounded-sm bg-primary/25 px-0.5 font-medium text-foreground">{hit}</mark>
      {after}
    </p>
  )
}

export function HighlightedBody({
  body,
  ranges,
  className,
}: {
  body: string
  ranges: Array<{ start: number; end: number }>
  className?: string
}) {
  const segments: Array<{ text: string; mark: boolean }> = []
  let cursor = 0
  const sorted = [...ranges]
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start)

  for (const range of sorted) {
    const start = Math.max(range.start, cursor)
    const end = Math.max(range.end, start)
    if (start > cursor) {
      segments.push({ text: body.slice(cursor, start), mark: false })
    }
    if (end > start) {
      segments.push({ text: body.slice(start, end), mark: true })
    }
    cursor = Math.max(cursor, end)
  }
  if (cursor < body.length) {
    segments.push({ text: body.slice(cursor), mark: false })
  }

  return (
    <div className={cn('whitespace-pre-wrap text-sm leading-relaxed', className)}>
      {segments.map((segment, index) =>
        segment.mark ? (
          <mark
            key={index}
            className="rounded-sm bg-primary/25 px-0.5 font-medium text-foreground"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </div>
  )
}
