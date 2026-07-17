import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Pause } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { useTimeStore } from '@/stores/time-store'
import { cn } from '@/lib/utils'

export function TimeSliderBar() {
  const { t } = useTranslation()
  const currentYear = useTimeStore((s) => s.currentYear)
  const minYear = useTimeStore((s) => s.minYear)
  const maxYear = useTimeStore((s) => s.maxYear)
  const animatePlaying = useTimeStore((s) => s.animatePlaying)
  const showAllPeople = useTimeStore((s) => s.showAllPeople)
  const setCurrentYear = useTimeStore((s) => s.setCurrentYear)
  const setAnimatePlaying = useTimeStore((s) => s.setAnimatePlaying)
  const setShowAllPeople = useTimeStore((s) => s.setShowAllPeople)
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
      <span
        className={cn(
          'w-12 font-mono text-sm',
          showAllPeople && 'text-muted-foreground',
        )}
      >
        {showAllPeople ? t('time.all') : currentYear}
      </span>
      <Slider
        className="flex-1"
        min={minYear}
        max={maxYear}
        step={1}
        value={[currentYear]}
        onValueChange={([v]) => setCurrentYear(v, { fromSlider: true })}
        disabled={showAllPeople}
      />
      <Button
        variant={showAllPeople ? 'default' : 'outline'}
        size="sm"
        className="shrink-0 text-xs"
        onClick={() => setShowAllPeople(!showAllPeople)}
      >
        {t('time.showAll')}
      </Button>
    </div>
  )
}
