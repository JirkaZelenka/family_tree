import type { PersonNode } from '@/types/person'
import {
  dateFieldSegments,
  lifeSpanSegments,
  relativeYearSpanSegments,
  type DateTextSegment,
} from '@/lib/time/dates'
import { cn } from '@/lib/utils'

const uncertainClass = 'italic text-red-600'

export function DateSegments({ segments }: { segments: DateTextSegment[] }) {
  if (segments.length === 0) return <>?</>
  return (
    <>
      {segments.map((seg, i) => (
        <span key={i} className={seg.uncertain ? uncertainClass : undefined}>
          {seg.text}
        </span>
      ))}
    </>
  )
}

export function LifeSpanDisplay({
  person,
  hideDeathIfUnknown = false,
  className,
}: {
  person: Pick<PersonNode, 'birth' | 'death' | 'birthYear' | 'deathYear'>
  hideDeathIfUnknown?: boolean
  className?: string
}) {
  const segments = lifeSpanSegments(
    person.birth?.date,
    person.death?.date,
    person.birthYear,
    person.deathYear,
    { hideDeathIfUnknown },
  )
  return (
    <span className={className}>
      <DateSegments segments={segments} />
    </span>
  )
}

export function DateFieldDisplay({
  date,
  place,
}: {
  date?: string
  place?: string
}) {
  const segments = dateFieldSegments(date)
  const placeText = place?.trim()
  return (
    <>
      <DateSegments segments={segments} />
      {placeText ? ` — ${placeText}` : null}
    </>
  )
}

export function LifeSpanSvg({
  person,
  x,
  y,
  className = 'fill-slate-700 text-[9px] opacity-80',
}: {
  person: Pick<PersonNode, 'birth' | 'death' | 'birthYear' | 'deathYear'>
  x: number
  y: number
  className?: string
}) {
  const segments = lifeSpanSegments(
    person.birth?.date,
    person.death?.date,
    person.birthYear,
    person.deathYear,
  )
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      className={className}
      style={{ pointerEvents: 'none' }}
    >
      {segments.map((seg, i) => (
        <tspan
          key={i}
          fill={seg.uncertain ? '#dc2626' : undefined}
          fontStyle={seg.uncertain ? 'italic' : undefined}
        >
          {seg.text}
        </tspan>
      ))}
    </text>
  )
}

export function marriageDateSegments(date: string | undefined): DateTextSegment[] {
  return dateFieldSegments(date)
}

export function MarriageDateDisplay({ date }: { date?: string }) {
  const trimmed = date?.trim()
  if (!trimmed) return null
  return (
    <>
      {' — '}
      <DateSegments segments={marriageDateSegments(date)} />
    </>
  )
}

export function relativeYearsDisplay(
  person: Pick<PersonNode, 'birth' | 'death' | 'birthYear' | 'deathYear'> | undefined,
): DateTextSegment[] {
  if (!person) return [{ text: '?', uncertain: false }]
  return relativeYearSpanSegments(
    person.birth?.date,
    person.death?.date,
    person.birthYear,
    person.deathYear,
  )
}

export function RelativeLineYears({
  person,
  className,
}: {
  person: Pick<PersonNode, 'birth' | 'death' | 'birthYear' | 'deathYear'> | undefined
  className?: string
}) {
  return (
    <span className={cn(className)}>
      (<DateSegments segments={relativeYearsDisplay(person)} />)
    </span>
  )
}
