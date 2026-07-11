import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LINEAGE_COLOR_PALETTE } from '@/lib/vault/lineage-colors'
import { colorInputToDisplay, parseColorInput } from '@/lib/vault/color-input'
import { useVaultStore } from '@/stores/vault-store'
import { cn } from '@/lib/utils'

interface LineageColorPickerProps {
  lineage: string
  color: string
  muted?: boolean
}

export function LineageColorPicker({ lineage, color, muted = false }: LineageColorPickerProps) {
  const { t } = useTranslation()
  const setLineageColor = useVaultStore((s) => s.setLineageColor)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(color)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDraft(colorInputToDisplay(color))
      setError(null)
    }
  }, [open, color])

  const applyColor = useCallback(
    (value: string) => {
      const parsed = parseColorInput(value)
      if (!parsed) {
        setError(t('lineage.colorInvalid'))
        return false
      }
      if (!setLineageColor(lineage, parsed)) {
        setError(t('lineage.colorInvalid'))
        return false
      }
      setError(null)
      setOpen(false)
      return true
    },
    [lineage, setLineageColor, t],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={t('lineage.changeColor')}
          aria-label={t('lineage.changeColorFor', { name: lineage })}
          className={cn(
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            'ring-offset-background transition hover:ring-2 hover:ring-ring hover:ring-offset-1',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className="inline-block h-3 w-3 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: color, opacity: muted ? 0.75 : 1 }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <p className="text-sm font-medium">{lineage}</p>

          <div className="grid grid-cols-8 gap-1.5">
            {LINEAGE_COLOR_PALETTE.map((swatch) => (
              <button
                key={swatch}
                type="button"
                title={swatch}
                className={cn(
                  'h-6 w-6 rounded-md ring-1 ring-black/10 transition hover:scale-110',
                  color.toLowerCase() === swatch.toLowerCase() && 'ring-2 ring-primary',
                )}
                style={{ backgroundColor: swatch }}
                onClick={() => applyColor(swatch)}
              />
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">{t('lineage.colorInput')}</label>
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  setError(null)
                }}
                placeholder={t('lineage.colorPlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyColor(draft)
                }}
              />
              <Button type="button" size="sm" onClick={() => applyColor(draft)}>
                {t('lineage.colorApply')}
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
