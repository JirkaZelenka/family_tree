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
import {
  collectUpcomingWeddingMilestones,
  collectWeddingAnniversaries,
  sortWeddingMilestones,
  weddingsInMonth,
  type WeddingMilestoneSortKey,
} from '@/lib/time/weddings'
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

function personLabel(givenName: string, familyName: string): string {
  return familyName ? `${givenName} ${familyName}` : givenName
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
  const [weddingSortKey, setWeddingSortKey] =
    useState<WeddingMilestoneSortKey>('date')
  const [weddingSortDir, setWeddingSortDir] = useState<'asc' | 'desc'>('asc')

  const visiblePeople = useMemo(
    () => [...persons.values()].filter((p) => !p.redacted),
    [persons],
  )

  const living = useMemo(
    () => collectLivingBirthdays(visiblePeople),
    [visiblePeople],
  )

  const exactWeddings = useMemo(
    () =>
      collectWeddingAnniversaries(visiblePeople, {
        requireExactDate: true,
        requireOneLiving: true,
      }),
    [visiblePeople],
  )

  const livingWeddings = useMemo(
    () =>
      collectWeddingAnniversaries(visiblePeople, { requireOneLiving: true }),
    [visiblePeople],
  )

  const byDay = useMemo(
    () => birthdaysInMonth(living, cursor.year, cursor.month),
    [living, cursor.year, cursor.month],
  )

  const weddingsByDay = useMemo(
    () => weddingsInMonth(exactWeddings, cursor.year, cursor.month),
    [exactWeddings, cursor.year, cursor.month],
  )

  const cells = useMemo(
    () => monthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  )

  const milestones = useMemo(() => {
    const upcoming = collectUpcomingMilestones(living, today, { limit: 50 })
    return sortMilestones(upcoming, sortKey, sortDir)
  }, [living, today, sortKey, sortDir])

  const weddingMilestones = useMemo(() => {
    const upcoming = collectUpcomingWeddingMilestones(livingWeddings, today, {
      limit: 50,
    })
    return sortWeddingMilestones(upcoming, weddingSortKey, weddingSortDir)
  }, [livingWeddings, today, weddingSortKey, weddingSortDir])

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
      setSortDir('asc')
    }
  }

  function toggleWeddingSort(key: WeddingMilestoneSortKey) {
    if (weddingSortKey === key) {
      setWeddingSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setWeddingSortKey(key)
      setWeddingSortDir('asc')
    }
  }

  return (
    <div
      className={cn(
        'absolute inset-0 overflow-auto bg-background p-4 md:p-6',
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
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
                const weddings = weddingsByDay.get(day) ?? []
                const hasEvents = birthdays.length > 0 || weddings.length > 0
                const isToday = isCurrentMonth && day === today.getDate()
                return (
                  <div
                    key={`${cursor.year}-${cursor.month}-${day}`}
                    className={cn(
                      'flex min-h-[4.5rem] flex-col gap-0.5 border-b border-r border-border/60 p-1.5',
                      hasEvents && 'bg-primary/5',
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
                          {personLabel(p.givenName, p.familyName)}
                        </button>
                      ))}
                      {weddings.map((w) => {
                        const label = `${w.wife.givenName} & ${w.husband.givenName}`
                        const title = `${w.wife.fullName} & ${w.husband.fullName}`
                        const selected =
                          selectedId === w.wife.id || selectedId === w.husband.id
                        return (
                          <button
                            key={w.id}
                            type="button"
                            title={title}
                            onClick={() => setSelectedId(w.wife.id)}
                            onDoubleClick={() => setProfilePersonId(w.wife.id)}
                            className={cn(
                              'truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight text-rose-700/90 hover:bg-rose-500/15 dark:text-rose-300/90',
                              selected &&
                                'bg-rose-500/20 font-medium ring-1 ring-rose-500/30',
                            )}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="min-w-0">
            <h2 className="mb-3 text-lg font-semibold tracking-tight">
              {t('calendar.milestonesTitle')}
            </h2>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_3rem] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                {(
                  [
                    ['name', 'calendar.colName'],
                    ['birth', 'calendar.colBirth'],
                    ['date', 'calendar.colBirthday'],
                    ['age', 'calendar.colAge'],
                  ] as const
                ).map(([key, labelKey]) => (
                  <button
                    key={key}
                    type="button"
                    className={cn(
                      'inline-flex items-center gap-1 hover:text-foreground',
                      key === 'age' ? 'justify-center' : 'text-left',
                    )}
                    onClick={() => toggleSort(key)}
                  >
                    {t(labelKey)}
                    <SortIcon active={sortKey === key} direction={sortDir} />
                  </button>
                ))}
              </div>
              <ScrollArea className="h-[min(28rem,calc(100vh-16rem))]">
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
                            'grid w-full grid-cols-[1.4fr_1fr_1fr_3rem] gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent/50',
                            selectedId === m.personId && 'bg-accent',
                          )}
                        >
                          <span className="truncate">{m.fullName}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {dateDisplayText(m.birthDate)}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatCzechDate(m.milestoneDate)}
                          </span>
                          <span className="text-center font-semibold tabular-nums text-primary">
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

          <section className="min-w-0">
            <h2 className="mb-3 text-lg font-semibold tracking-tight">
              {t('calendar.weddingMilestonesTitle')}
            </h2>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-[1.2fr_1.2fr_0.9fr_0.9fr_3rem] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                {(
                  [
                    ['wife', 'calendar.colWoman'],
                    ['husband', 'calendar.colMan'],
                    ['marriage', 'calendar.colWedding'],
                    ['date', 'calendar.colAnniversary'],
                    ['years', 'calendar.colWeddingYears'],
                  ] as const
                ).map(([key, labelKey]) => (
                  <button
                    key={key}
                    type="button"
                    className={cn(
                      'inline-flex items-center gap-1 hover:text-foreground',
                      key === 'years' ? 'justify-center' : 'text-left',
                    )}
                    onClick={() => toggleWeddingSort(key)}
                  >
                    {t(labelKey)}
                    <SortIcon
                      active={weddingSortKey === key}
                      direction={weddingSortDir}
                    />
                  </button>
                ))}
              </div>
              <ScrollArea className="h-[min(28rem,calc(100vh-16rem))]">
                {weddingMilestones.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {t('calendar.noWeddingMilestones')}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {weddingMilestones.map((m) => {
                      const selected =
                        selectedId === m.wife.id || selectedId === m.husband.id
                      return (
                        <li key={m.id}>
                          <div
                            className={cn(
                              'grid w-full grid-cols-[1.2fr_1.2fr_0.9fr_0.9fr_3rem] gap-2 px-3 py-2.5 text-sm',
                              selected && 'bg-accent',
                            )}
                          >
                            <button
                              type="button"
                              className="truncate text-left hover:underline"
                              onClick={() => setSelectedId(m.wife.id)}
                              onDoubleClick={() =>
                                setProfilePersonId(m.wife.id)
                              }
                            >
                              {m.wife.fullName}
                            </button>
                            <button
                              type="button"
                              className="truncate text-left hover:underline"
                              onClick={() => setSelectedId(m.husband.id)}
                              onDoubleClick={() =>
                                setProfilePersonId(m.husband.id)
                              }
                            >
                              {m.husband.fullName}
                            </button>
                            <span className="tabular-nums text-muted-foreground">
                              {m.displayMarriageDate}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              {formatCzechDate(m.milestoneDate)}
                            </span>
                            <span className="text-center font-semibold tabular-nums text-primary">
                              {m.years}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </ScrollArea>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
