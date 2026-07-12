import { z } from 'zod'

export const TimeLayerSchema = z.object({
  id: z.string(),
  label: z.string(),
  minYear: z.number(),
  maxYear: z.number(),
})

export const VaultConfigSchema = z.object({
  timeLayers: z.array(TimeLayerSchema).default([]),
  lineageColors: z.record(z.string(), z.string()).default({}),
})

export type TimeLayer = z.infer<typeof TimeLayerSchema>
export type VaultConfig = z.infer<typeof VaultConfigSchema>

export const NodeLayoutSchema = z.object({
  theta: z.number(),
  phi: z.number(),
  radius: z.number(),
  pinned: z.boolean().optional(),
})

export const ForceNodeLayoutSchema = z.object({
  x: z.number(),
  pinned: z.boolean().optional(),
})

export const LineageOffsetSchema = z.object({
  theta: z.number(),
  phi: z.number(),
})

export const ForceSavedViewsSchema = z
  .record(z.string(), z.record(z.string(), ForceNodeLayoutSchema))
  .default({})

export const ViewLayoutSchema = z.object({
  nodes: z.record(z.string(), NodeLayoutSchema).default({}),
  lineageOffsets: z.record(z.string(), LineageOffsetSchema).default({}),
  forceNodes: z.record(z.string(), ForceNodeLayoutSchema).default({}),
  /** @deprecated Použijte forceSavedViews — zachováno kvůli starším exportům. */
  forceSavedView: z.record(z.string(), ForceNodeLayoutSchema).default({}),
  forceSavedViews: ForceSavedViewsSchema,
  /** Název aktivního uloženého pohledu; null = výchozí automatické rozložení. */
  activeForceViewName: z.string().nullable().optional(),
})

export const LayoutFileSchema = z.object({
  version: z.literal(1),
  views: z.record(z.string(), ViewLayoutSchema).default({}),
})

export type NodeLayout = z.infer<typeof NodeLayoutSchema>
export type ForceNodeLayout = z.infer<typeof ForceNodeLayoutSchema>
export type ForceSavedViews = z.infer<typeof ForceSavedViewsSchema>
export type ViewLayout = z.infer<typeof ViewLayoutSchema>
export type LayoutFile = z.infer<typeof LayoutFileSchema>

export const HistoricalEventSchema = z.object({
  year: z.number(),
  endYear: z.number().optional(),
  label: z.string(),
  type: z.enum(['world', 'local', 'family']).default('world'),
})

export const EventsFileSchema = z.object({
  events: z.array(HistoricalEventSchema).default([]),
})

export type HistoricalEvent = z.infer<typeof HistoricalEventSchema>

export const DEFAULT_TIME_LAYERS: TimeLayer[] = [
  { id: 'ancient', label: 'Do 1500', minYear: -Infinity, maxYear: 1500 },
  { id: 'early', label: '1500–1800', minYear: 1500, maxYear: 1800 },
  { id: 'modern', label: '1800–1900', minYear: 1800, maxYear: 1900 },
  { id: 'recent', label: '1900+', minYear: 1900, maxYear: Infinity },
]

/** Výchozí barvy rodů — upravte podle svého stromu (soubor je v .gitignore). */
export const DEFAULT_LINEAGE_COLORS: Record<string, string> = {
  novak: '#60a5fa',
  novakovi: '#60a5fa',
  dvorak: '#34d399',
  dvorakovi: '#34d399',
  unknown: '#94a3b8',
}
