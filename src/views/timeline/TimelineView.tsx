import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGraphStore } from '@/stores/graph-store'
import { useTimeStore } from '@/stores/time-store'
import { useVaultStore } from '@/stores/vault-store'
import { useViewStore } from '@/stores/view-store'
import { effectiveDeathYear } from '@/lib/time/dates'
import type { ViewProps } from '../types'

export function TimelineView({ className }: ViewProps) {
  const persons = useGraphStore((s) => s.persons)
  const selectedId = useGraphStore((s) => s.selectedId)
  const setSelectedId = useGraphStore((s) => s.setSelectedId)
  const setHoveredId = useGraphStore((s) => s.setHoveredId)
  const setProfilePersonId = useViewStore((s) => s.setProfilePersonId)
  const currentYear = useTimeStore((s) => s.currentYear)
  const minYear = useTimeStore((s) => s.minYear)
  const maxYear = useTimeStore((s) => s.maxYear)
  const colors = useVaultStore((s) => s.vault?.config.lineageColors ?? {})

  const span = maxYear - minYear || 1

  const bars = useMemo(
    () =>
      [...persons.values()]
        .filter((p) => p.birthYear !== null || p.deathYear !== null)
        .sort((a, b) => (a.birthYear ?? 0) - (b.birthYear ?? 0)),
    [persons],
  )

  return (
    <div className={`relative overflow-auto p-4 ${className ?? ''}`}>
      <div className="relative min-h-[400px]" style={{ minWidth: 800 }}>
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
          style={{ left: `${((currentYear - minYear) / span) * 100}%` }}
        />
        <AnimatePresence>
          {bars.map((p) => {
            const start = p.birthYear ?? minYear
            const end =
              effectiveDeathYear(p.birthYear, p.deathYear, p.death?.date) ?? maxYear
            const left = ((start - minYear) / span) * 100
            const width = Math.max(0.5, ((end - start) / span) * 100)
            const color = colors[p.lineage] ?? '#94a3b8'
            const alive = start <= currentYear && currentYear <= end
            return (
              <motion.button
                key={p.id}
                type="button"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: alive ? 1 : 0.25, x: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedId(p.id)}
                onDoubleClick={() => setProfilePersonId(p.id)}
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`absolute flex h-7 items-center rounded text-xs text-white px-2 ${
                  selectedId === p.id ? 'ring-2 ring-white' : ''
                }`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  top: `${(bars.indexOf(p) % 20) * 32 + 8}px`,
                  backgroundColor: color,
                }}
              >
                {p.fullName}
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
