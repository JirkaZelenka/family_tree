import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useGraphStore } from '@/stores/graph-store'
import { useViewStore } from '@/stores/view-store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  birthdaysInMonth,
  collectLivingBirthdays,
  collectUpcomingMilestones,
  formatCzechDate,
  sortMilestones,
  type MilestoneSortKey,
} from '@/lib/time/birthdays'
import { dateDisplayText } from '@/lib/time/dates'
import type { ViewProps } from '../types'

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

function monthGrid(year: number, month: number): (number | null)[] {
  // month: 1–12; pondělí = první sloupec
  const first = new Date(year, month - 1, 1)
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean
  direction: 'asc' | 'desc'
}) {
  if (!active) return <ArrowUpDown className="size-3.5 opacity-40" />
  return direction === 'asc' ? (
    <ArrowUp className="size-3.5" />
  ) : (
    <ArrowDown className="size-3.5" />
  )
}

export function CalendarView({ className }: ViewProps) {
  const { t } = useTranslation()
  const persons = useGraphStore((s) => s.persons)
  const selectedId = useGraphStore((s) => s.selectedId)
  const setSelectedId = useGraphStore((s) => s.setSelectedId)
  const setProfilePersonId = useViewStore((s) => s.setProfilePersonId)

  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  }))
  const [sortKey, setSortKey] = useState<MilestoneSortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const living = useMemo(
    () => collectLivingBirthdays(persons.values()),
    [persons],
  )

  const byDay = useMemo(
    () => birthdaysInMonth(living, cursor.year, cursor.month),
    [living, cursor.year, cursor.month],
  )

  const cells = useMemo(
    () => monthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  )

  const milestones = useMemo(() => {
    const upcoming = collectUpcomingMilestones(living, today, { limit: 50 })
    return sortMilestones(upcoming, sortKey, sortDir)
  }, [living, today, sortKey, sortDir])

  const monthTitle = useMemo(() => {
    const d = new Date(cursor.year, cursor.month - 1, 1)
    return d.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })
  }, [cursor.year, cursor.month])

  const isCurrentMonth =
    cursor.year === today.getFullYear() && cursor.month === today.getMonth() + 1

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month - 1 + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })
  }

  function toggleSort(key: MilestoneSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'asc' : 'asc')
    }
  }

  return (
    <div
      className={cn(
        'absolute inset-0 overflow-auto bg-background p-4 md:p-6',
        className,
      )}
    >
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {t('calendar.title')}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t('calendar.prevMonth')}
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-w-[10rem] capitalize"
                onClick={() =>
                  setCursor({
                    year: today.getFullYear(),
                    month: today.getMonth() + 1,
                  })
                }
              >
                {monthTitle}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t('calendar.nextMonth')}
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('calendar.subtitle')}
          </p>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-medium text-muted-foreground">
              {WEEKDAY_KEYS.map((key) => (
                <div key={key} className="px-1 py-2">
                  {t(`calendar.weekdays.${key}`)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-[minmax(4.5rem,auto)]">
              {cells.map((day, i) => {
                if (day === null) {
                  return (
                    <div
                      key={`e-${i}`}
                      className="border-b border-r border-border/60 bg-muted/20"
                    />
                  )
                }
                const birthdays = byDay.get(day) ?? []
                const isToday =
                  isCurrentMonth && day === today.getDate()
                return (
                  <div
                    key={`${cursor.year}-${cursor.month}-${day}`}
                    className={cn(
                      'flex min-h-[4.5rem] flex-col gap-0.5 border-b border-r border-border/60 p-1.5',
                      birthdays.length > 0 && 'bg-primary/5',
                      isToday && 'ring-1 ring-inset ring-primary/40',
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs font-medium tabular-nums',
                        isToday ? 'text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {day}
                    </span>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {birthdays.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          title={p.fullName}
                          onClick={() => setSelectedId(p.id)}
                          onDoubleClick={() => setProfilePersonId(p.id)}
                          className={cn(
                            'truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight hover:bg-primary/15',
                            selectedId === p.id &&
                              'bg-primary/20 font-medium ring-1 ring-primary/30',
                          )}
                        >
                          {p.givenName}
                          {p.familyName ? ` ${p.familyName}` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="min-w-0">
          <h2 className="mb-1 text-lg font-semibold tracking-tight">
            {t('calendar.milestonesTitle')}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('calendar.milestonesSubtitle')}
          </p>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1.1fr_1.1fr_1fr_auto] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              {(
                [
                  ['givenName', 'calendar.colGivenName'],
                  ['familyName', 'calendar.colFamilyName'],
                  ['date', 'calendar.colBirthday'],
                  ['age', 'calendar.colAge'],
                ] as const
              ).map(([key, labelKey]) => (
                <button
                  key={key}
                  type="button"
                  className="inline-flex items-center gap-1 text-left hover:text-foreground"
                  onClick={() => toggleSort(key)}
                >
                  {t(labelKey)}
                  <SortIcon active={sortKey === key} direction={sortDir} />
                </button>
              ))}
            </div>
            <ScrollArea className="h-[min(32rem,calc(100vh-16rem))]">
              {milestones.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {t('calendar.noMilestones')}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {milestones.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(m.personId)}
                        onDoubleClick={() => setProfilePersonId(m.personId)}
                        className={cn(
                          'grid w-full grid-cols-[1.1fr_1.1fr_1fr_auto] gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent/50',
                          selectedId === m.personId && 'bg-accent',
                        )}
                      >
                        <span className="truncate">{m.givenName}</span>
                        <span className="truncate">{m.familyName || '—'}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {dateDisplayText(m.birthDate)}
                          <span className="mt-0.5 block text-[11px] opacity-70">
                            {formatCzechDate(m.milestoneDate)}
                          </span>
                        </span>
                        <span className="min-w-[2.5rem] text-right font-semibold tabular-nums text-primary">
                          {m.age}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>
        </section>
      </div>
    </div>
  )
}
