import { useVaultStore } from '@/stores/vault-store'
import { useTimeStore } from '@/stores/time-store'
import {
  birthYearToCenterY,
  FORCE_EVENT_LABEL_TOP_OFFSET,
  FORCE_EVENT_SPAN_X,
  FORCE_TIMELINE_WIDTH,
} from '@/lib/layout/force-layout'

interface ForceTimelineEventsProps {
  yearMin: number
  yearMax: number
  timelineHeight: number
}

export function ForceTimelineEvents({
  yearMin,
  yearMax,
  timelineHeight,
}: ForceTimelineEventsProps) {
  const events = useVaultStore((s) => s.vault?.events ?? [])
  const currentYear = useTimeStore((s) => s.currentYear)

  if (events.length === 0) return null

  const labelRight = FORCE_TIMELINE_WIDTH - 6
  const labelWidth = labelRight - FORCE_EVENT_SPAN_X - 4

  return (
    <>
      {events
        .slice()
        .sort((a, b) => a.year - b.year)
        .map((ev, i) => {
          const y = birthYearToCenterY(ev.year, yearMin, yearMax, timelineHeight)
          const active =
            ev.endYear != null
              ? currentYear >= ev.year && currentYear <= ev.endYear
              : Math.abs(ev.year - currentYear) < 5

          return (
            <div
              key={`${ev.year}-${i}`}
              className={`absolute select-none text-right text-[8px] leading-snug ${
                active ? 'font-medium text-primary' : 'text-muted-foreground'
              }`}
              style={{
                left: FORCE_EVENT_SPAN_X + 2,
                top: y - FORCE_EVENT_LABEL_TOP_OFFSET,
                width: labelWidth,
                maxWidth: labelWidth,
              }}
              title={`${ev.year} — ${ev.label}`}
            >
              <span className="font-mono tabular-nums">{ev.year}</span>
              <span className="opacity-70"> · </span>
              <span className="whitespace-normal break-words">{ev.label}</span>
            </div>
          )
        })}
    </>
  )
}

export function ForceTimelineEventsLayer({
  transform,
  layoutWidth,
  layoutHeight,
  yearMin,
  yearMax,
  timelineHeight,
}: ForceTimelineEventsProps & {
  transform: { x: number; y: number; k: number }
  layoutWidth: number
  layoutHeight: number
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible select-none">
      <div
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          transformOrigin: '0 0',
          width: layoutWidth,
          height: layoutHeight,
        }}
      >
        <ForceTimelineEvents
          yearMin={yearMin}
          yearMax={yearMax}
          timelineHeight={timelineHeight}
        />
      </div>
    </div>
  )
}
