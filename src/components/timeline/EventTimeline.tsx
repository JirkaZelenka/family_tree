import { useTranslation } from 'react-i18next'
import { useVaultStore } from '@/stores/vault-store'
import { useTimeStore } from '@/stores/time-store'
import { ScrollArea } from '@/components/ui/scroll-area'

export function EventTimeline() {
  const { t } = useTranslation()
  const events = useVaultStore((s) => s.vault?.events ?? [])
  const currentYear = useTimeStore((s) => s.currentYear)

  return (
    <div className="flex h-full flex-col border-r border-border">
      <div className="border-b border-border p-3 text-sm font-medium">
        {t('time.events')}
      </div>
      <ScrollArea className="flex-1">
        <ul className="space-y-1 p-2">
          {events
            .sort((a, b) => a.year - b.year)
            .map((ev, i) => (
              <li
                key={i}
                className={`rounded px-2 py-1.5 text-xs ${
                  Math.abs(ev.year - currentYear) < 5
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <span className="font-mono">{ev.year}</span> — {ev.label}
              </li>
            ))}
        </ul>
      </ScrollArea>
    </div>
  )
}
