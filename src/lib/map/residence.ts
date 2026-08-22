import type { PersonNode } from '@/types/person'
import { parseYear } from '@/lib/time/dates'

export interface ResidenceSegment {
  place: string
  fromYear: number
  /** Exkluzivní konec; null = do konce života / neznámo. */
  toYear: number | null
}

type MoveSource = 'birth' | 'moving' | 'child'

interface MoveEvent {
  year: number
  to: string
  source: MoveSource
}

const SOURCE_ORDER: Record<MoveSource, number> = {
  birth: 0,
  child: 1,
  moving: 2,
}

/**
 * Odvození bydliště:
 * - od narození v místě narození
 * - při narození dítěte jinde → přesun tam
 * - explicitní `moving` (datum + to) má přednost ve stejném roce před dětmi
 */
export function buildResidenceSegments(
  person: PersonNode,
  persons: Map<string, PersonNode>,
): ResidenceSegment[] {
  const events: MoveEvent[] = []

  const birthPlace = person.birth?.place?.trim()
  if (birthPlace && person.birthYear != null) {
    events.push({ year: person.birthYear, to: birthPlace, source: 'birth' })
  }

  for (const move of person.moving ?? []) {
    const to = move.to?.trim()
    const year = parseYear(move.date)
    if (!to || year == null) continue
    events.push({ year, to, source: 'moving' })
  }

  for (const childId of person.children) {
    const child = persons.get(childId)
    if (!child || child.birthYear == null) continue
    const childPlace = child.birth?.place?.trim()
    if (!childPlace) continue
    events.push({ year: child.birthYear, to: childPlace, source: 'child' })
  }

  events.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source]
  })

  const segments: ResidenceSegment[] = []
  let currentPlace: string | null = null
  let currentFrom: number | null = null

  for (const event of events) {
    if (currentPlace == null) {
      currentPlace = event.to
      currentFrom = event.year
      continue
    }
    if (event.to === currentPlace) continue
    if (currentFrom != null) {
      segments.push({
        place: currentPlace,
        fromYear: currentFrom,
        toYear: event.year,
      })
    }
    currentPlace = event.to
    currentFrom = event.year
  }

  if (currentPlace != null && currentFrom != null) {
    segments.push({
      place: currentPlace,
      fromYear: currentFrom,
      toYear: null,
    })
  }

  return segments
}

/** Místo bydliště v daném roce, nebo null. */
export function residencePlaceAtYear(
  segments: ResidenceSegment[],
  year: number,
): string | null {
  for (const seg of segments) {
    if (year < seg.fromYear) continue
    if (seg.toYear != null && year >= seg.toYear) continue
    return seg.place
  }
  return null
}

/** Stabilní jitter, aby tečky na stejném místě nesplývaly. */
export function jitterOffset(
  personId: string,
  index: number,
  total: number,
): { dLat: number; dLon: number } {
  if (total <= 1) return { dLat: 0, dLon: 0 }

  let hash = 0
  for (let i = 0; i < personId.length; i++) {
    hash = (hash * 31 + personId.charCodeAt(i)) | 0
  }
  const baseAngle = ((hash % 360) / 360) * Math.PI * 2
  const angle = baseAngle + (2 * Math.PI * index) / total
  const ring = Math.floor(index / 8)
  const radius = 0.0045 * (1 + ring * 0.55)

  return {
    dLat: Math.cos(angle) * radius,
    dLon: Math.sin(angle) * radius,
  }
}
