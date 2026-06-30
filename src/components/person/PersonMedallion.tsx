import { Badge } from '@/components/ui/badge'
import { formatLifeSpan } from '@/lib/time/dates'
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
}

export function PersonMedallion({
  person,
  color,
  variant = 'card',
  className,
}: PersonMedallionProps) {
  const photo = person.media.find((m) => m.type === 'photo')
  const isPanel = variant === 'panel'

  return (
    <div
      className={cn(
        'w-full overflow-hidden bg-card',
        isPanel
          ? 'border-b border-border shadow-sm'
          : 'rounded-xl border border-border shadow-sm',
        className,
      )}
    >
      <div
        className={cn(
          'relative w-full bg-gradient-to-br from-black/10 to-black/30',
          isPanel ? 'h-32' : 'h-16',
        )}
        style={{ backgroundColor: color }}
      >
        <div
          className={cn(
            'absolute left-1/2 flex -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted font-semibold text-slate-800 shadow-lg',
            isPanel ? 'bottom-0 h-24 w-24 translate-y-1/2 text-2xl' : 'top-4 h-16 w-16 text-lg',
          )}
        >
          {photo ? (
            <img
              src={photo.path}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            personInitials(person)
          )}
        </div>
      </div>
      <div
        className={cn(
          'w-full text-center',
          isPanel ? 'px-4 pb-5 pt-14' : 'px-3 pb-4 pt-9',
        )}
      >
        <h2
          className={cn(
            'font-semibold leading-tight',
            isPanel ? 'text-xl' : 'text-lg',
          )}
        >
          {person.fullName}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground tabular-nums">
          {formatLifeSpan(person.birthYear, person.deathYear)}
        </p>
        {person.birth?.place && (
          <p className="mt-1 text-xs text-muted-foreground">{person.birth.place}</p>
        )}
        <Badge
          className="mt-3"
          style={{ backgroundColor: color }}
        >
          {person.lineage}
        </Badge>
      </div>
    </div>
  )
}
