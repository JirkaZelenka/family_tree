import { z } from 'zod'

const SuggestedPlaceSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
})

export const PlaceEntrySchema = z.object({
  name: z.string().min(1),
  lat: z.number().optional(),
  lon: z.number().optional(),
  aliases: z.array(z.string()).default([]),
  ambiguous: z.boolean().default(false),
  note: z.string().optional(),
  suggested: SuggestedPlaceSchema.optional(),
})

export const PlacesFileSchema = z.object({
  places: z.array(PlaceEntrySchema).default([]),
})

export type PlaceEntry = z.infer<typeof PlaceEntrySchema>
export type PlacesFile = z.infer<typeof PlacesFileSchema>

export interface ResolvedPlace {
  name: string
  lat: number
  lon: number
  ambiguous: boolean
}

/** Normalizace pro lookup (trim, vnitřní mezery, case). */
export function normalizePlaceKey(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFC')
    .toLocaleLowerCase('cs')
}

export function parsePlacesFile(raw: unknown): PlacesFile {
  const parsed = PlacesFileSchema.safeParse(raw)
  if (!parsed.success) return { places: [] }
  return parsed.data
}

/** Index názvů a aliasů → záznam. */
export function buildPlaceIndex(
  places: PlaceEntry[],
): Map<string, PlaceEntry> {
  const index = new Map<string, PlaceEntry>()
  for (const entry of places) {
    index.set(normalizePlaceKey(entry.name), entry)
    for (const alias of entry.aliases) {
      index.set(normalizePlaceKey(alias), entry)
    }
  }
  return index
}

function entryToResolved(entry: PlaceEntry, label?: string): ResolvedPlace | null {
  if (entry.lat == null || entry.lon == null) return null
  return {
    name: label ?? entry.name,
    lat: entry.lat,
    lon: entry.lon,
    ambiguous: entry.ambiguous,
  }
}

/**
 * Vrátí souřadnice jen když jsou vyplněné.
 * Ambiguous bez lat/lon se nepoužije (čeká na ruční doplnění).
 *
 * Podporuje části města: „Praha - Podolí“ → nejdřív přesná shoda,
 * jinak fallback na město („Praha“). Čtvrť lze mít vlastní záznam v places.yaml.
 */
export function resolvePlaceCoords(
  placeName: string | undefined | null,
  index: Map<string, PlaceEntry>,
): ResolvedPlace | null {
  const raw = placeName?.trim()
  if (!raw) return null

  const exact = index.get(normalizePlaceKey(raw))
  if (exact) return entryToResolved(exact)

  // „Praha - Podolí“, „Praha – Podolí“, „Praha, Podolí“
  const parts = raw.split(/\s*[-–—,]\s*/).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const city = parts[0]
    const district = parts.slice(1).join(' - ')
    const districtKey = normalizePlaceKey(`${city} - ${district}`)
    const districtEntry = index.get(districtKey)
    if (districtEntry) return entryToResolved(districtEntry)

    const cityEntry = index.get(normalizePlaceKey(city))
    if (cityEntry) return entryToResolved(cityEntry, raw)
  }

  return null
}

export function listUnresolvedPlaces(places: PlaceEntry[]): PlaceEntry[] {
  return places.filter(
    (p) => p.ambiguous || p.lat == null || p.lon == null,
  )
}
