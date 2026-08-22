import { LifeSpanDisplay } from '@/components/person/PersonDateDisplay'
import type { PersonNode } from '@/types/person'
import { cn } from '@/lib/utils'

function personInitials(person: PersonNode): string {
  const g = person.givenName.trim().charAt(0)
  const f = person.familyName?.trim().charAt(0) ?? ''
  return (g + f).toUpperCase() || '?'
}

interface PersonMedallionProps {
  person: PersonNode
  color: string
  variant?: 'card' | 'panel'
  className?: string
  hideLineage?: boolean
  hideDeathIfUnknown?: boolean
  displayName?: string
}

export function PersonMedallion({
  person,
  color,
  variant = 'card',
  className,
  hideDeathIfUnknown = false,
  displayName,
}: PersonMedallionProps) {
  const isPanel = variant === 'panel'
  const name = displayName ?? person.fullName
  const nameWithYear =
    person.birthYear != null ? `${name} (${person.birthYear})` : name

  if (isPanel) {
    return (
      <div
        className={cn(
          'relative w-full overflow-hidden border-b border-border bg-card',
          className,
        )}
      >
        <div className="relative px-3 pb-3 pt-3" style={{ backgroundColor: color }}>
          <div className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-background/90 bg-background/95 text-sm font-semibold text-slate-800 shadow-sm">
            {personInitials(person)}
          </div>
          <div className="min-h-[2.75rem] pr-14">
            <h2 className="text-base font-semibold leading-tight text-slate-950">
              {nameWithYear}
            </h2>
            <p className="mt-0.5 text-xs tabular-nums text-slate-800/85">
              <LifeSpanDisplay person={person} hideDeathIfUnknown={hideDeathIfUnknown} />
            </p>
            {person.birth?.place?.trim() && (
              <p className="mt-0.5 text-[11px] text-slate-800/75">{person.birth.place}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-full overflow-hidden bg-card',
        'rounded-xl border border-border shadow-sm',
        className,
      )}
    >
      <div
        className="relative h-16 w-full"
        style={{ backgroundColor: color }}
      >
        <div className="absolute left-1/2 top-4 flex h-16 w-16 -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted font-semibold text-lg text-slate-800 shadow-lg">
          {personInitials(person)}
        </div>
      </div>
      <div className="w-full px-3 pb-4 pt-9 text-center">
        <h2 className="text-lg font-semibold leading-tight">
          {nameWithYear}
        </h2>
        <p className="mt-1.5 text-sm tabular-nums text-muted-foreground">
          <LifeSpanDisplay person={person} hideDeathIfUnknown={hideDeathIfUnknown} />
        </p>
        {person.birth?.place?.trim() && (
          <p className="mt-1 text-xs text-muted-foreground">{person.birth.place}</p>
        )}
      </div>
    </div>
  )
}
