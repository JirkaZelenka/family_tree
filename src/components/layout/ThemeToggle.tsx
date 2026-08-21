import type { ReactNode } from 'react'
import { AppWindow, Moon, ScrollText, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/theme-store'
import type { Appearance, Theme } from '@/lib/theme'

function SegmentedPair<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: Array<{ value: T; label: string; icon: ReactNode }>
  onChange: (value: T) => void
  ariaLabel: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex h-8 items-center rounded-md border border-border p-0.5"
    >
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            title={opt.label}
            aria-label={opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-sm px-2 text-xs font-medium transition-colors',
              selected
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            {opt.icon}
            <span className="hidden lg:inline">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ThemeToggle() {
  const { t } = useTranslation()
  const theme = useThemeStore((s) => s.theme)
  const appearance = useThemeStore((s) => s.appearance)
  const setTheme = useThemeStore((s) => s.setTheme)
  const setAppearance = useThemeStore((s) => s.setAppearance)

  return (
    <div className="flex items-center gap-1.5">
      <SegmentedPair<Appearance>
        ariaLabel={t('toolbar.appearance')}
        value={appearance}
        onChange={setAppearance}
        options={[
          {
            value: 'heritage',
            label: t('toolbar.appearanceOld'),
            icon: <ScrollText className="h-3.5 w-3.5" aria-hidden />,
          },
          {
            value: 'modern',
            label: t('toolbar.appearanceModern'),
            icon: <AppWindow className="h-3.5 w-3.5" aria-hidden />,
          },
        ]}
      />
      <SegmentedPair<Theme>
        ariaLabel={t('toolbar.colorScheme')}
        value={theme}
        onChange={setTheme}
        options={[
          {
            value: 'light',
            label: t('toolbar.lightMode'),
            icon: <Sun className="h-3.5 w-3.5" aria-hidden />,
          },
          {
            value: 'dark',
            label: t('toolbar.darkMode'),
            icon: <Moon className="h-3.5 w-3.5" aria-hidden />,
          },
        ]}
      />
    </div>
  )
}
