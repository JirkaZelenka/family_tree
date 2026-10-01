import { useTranslation } from 'react-i18next'
import { Type } from 'lucide-react'
import { FONT_PRESETS, type FontPresetId } from '@/lib/font'
import { useFontStore } from '@/stores/font-store'
import { useAuthStore } from '@/stores/auth-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function FontPicker() {
  const { t } = useTranslation()
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false)
  const fontPreset = useFontStore((s) => s.fontPreset)
  const setFontPreset = useFontStore((s) => s.setFontPreset)

  if (!isAdmin) return null

  return (
    <div className="flex items-center gap-1">
      <Type className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" aria-hidden />
      <Select
        value={fontPreset}
        onValueChange={(value) => setFontPreset(value as FontPresetId)}
      >
        <SelectTrigger
          className="h-8 w-[9.5rem] border-transparent bg-transparent px-2 text-xs shadow-none hover:bg-accent"
          title={t('toolbar.font.label')}
          aria-label={t('toolbar.font.label')}
        >
          <SelectValue placeholder={t('toolbar.font.label')} />
        </SelectTrigger>
        <SelectContent align="end">
          {FONT_PRESETS.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              {t(preset.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
