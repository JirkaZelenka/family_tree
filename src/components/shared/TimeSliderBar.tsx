import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Pause } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useTimeStore } from '@/stores/time-store'

export function TimeSliderBar() {
  const { t } = useTranslation()
  const currentYear = useTimeStore((s) => s.currentYear)
  const minYear = useTimeStore((s) => s.minYear)
  const maxYear = useTimeStore((s) => s.maxYear)
  const animatePlaying = useTimeStore((s) => s.animatePlaying)
  const showContemporariesOnly = useTimeStore((s) => s.showContemporariesOnly)
  const setCurrentYear = useTimeStore((s) => s.setCurrentYear)
  const setAnimatePlaying = useTimeStore((s) => s.setAnimatePlaying)
  const setShowContemporariesOnly = useTimeStore((s) => s.setShowContemporariesOnly)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!animatePlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = window.setInterval(() => {
      const { currentYear: y, maxYear: max, minYear: min } = useTimeStore.getState()
      if (y >= max) setCurrentYear(min)
      else setCurrentYear(y + 1)
    }, 200)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [animatePlaying, setCurrentYear])

  return (
    <div className="flex items-center gap-4 border-t border-border px-4 py-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setAnimatePlaying(!animatePlaying)}
        aria-label={animatePlaying ? t('time.pause') : t('time.play')}
      >
        {animatePlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <span className="w-12 font-mono text-sm">{currentYear}</span>
      <Slider
        className="flex-1"
        min={minYear}
        max={maxYear}
        step={1}
        value={[currentYear]}
        onValueChange={([v]) => setCurrentYear(v)}
      />
      <div className="flex items-center gap-2">
        <Switch
          id="contemporaries"
          checked={showContemporariesOnly}
          onCheckedChange={setShowContemporariesOnly}
        />
        <Label htmlFor="contemporaries" className="text-xs whitespace-nowrap">
          {t('time.contemporariesOnly')}
        </Label>
      </div>
    </div>
  )
}
