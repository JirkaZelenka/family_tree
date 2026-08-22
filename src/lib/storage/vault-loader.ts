import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import {
  VaultConfigSchema,
  LayoutFileSchema,
  EventsFileSchema,
  DEFAULT_TIME_LAYERS,
  DEFAULT_LINEAGE_COLORS,
  type VaultConfig,
  type LayoutFile,
  type HistoricalEvent,
} from '@/types/vault'
import type { PersonRecord } from '@/types/person'
import type { TextDocument } from '@/types/text'
import { parsePersonMarkdown } from '@/lib/parser/markdown'
import { isTextMarkdownPath, parseTextMarkdown } from '@/lib/parser/text-markdown'
import { enrichLineageColors, countLineageMembers } from '@/lib/vault/lineage-colors'
import { parsePlacesFile, type PlaceEntry } from '@/lib/map/places'

export interface VaultData {
  people: PersonRecord[]
  texts: TextDocument[]
  config: VaultConfig
  layout: LayoutFile
  events: HistoricalEvent[]
  places: PlaceEntry[]
  diagnostics: string[]
}

export async function loadVaultFromFileMap(
  files: Map<string, string>,
): Promise<VaultData> {
  const diagnostics: string[] = []
  const people: PersonRecord[] = []
  const textFiles: Array<{ path: string; content: string }> = []

  let config: VaultConfig = {
    timeLayers: DEFAULT_TIME_LAYERS,
    lineageColors: DEFAULT_LINEAGE_COLORS,
  }
  let layout: LayoutFile = { version: 1, views: {} }
  let events: HistoricalEvent[] = []
  let places: PlaceEntry[] = []

  for (const [path, content] of files) {
    const normalized = path.replace(/\\/g, '/')
    if (
      (normalized.includes('/people/') ||
        normalized.startsWith('people/') ||
        normalized.startsWith('data/people/')) &&
      normalized.endsWith('.md')
    ) {
      const result = parsePersonMarkdown(content, path)
      diagnostics.push(...result.errors)
      if (result.record) people.push(result.record)
    } else if (isTextMarkdownPath(normalized)) {
      textFiles.push({ path, content })
    } else if (normalized.endsWith('.family-tree/config.yaml')) {
      try {
        const parsed = VaultConfigSchema.safeParse(parseYaml(content))
        if (parsed.success) config = parsed.data
        else diagnostics.push('Neplatný config.yaml')
      } catch {
        diagnostics.push('Chyba parsování config.yaml')
      }
    } else if (normalized.endsWith('.family-tree/layout.json')) {
      try {
        const parsed = LayoutFileSchema.safeParse(JSON.parse(content))
        if (parsed.success) layout = parsed.data
        else diagnostics.push('Neplatný layout.json')
      } catch {
        diagnostics.push('Chyba parsování layout.json')
      }
    } else if (normalized.endsWith('.family-tree/places.yaml')) {
      try {
        places = parsePlacesFile(parseYaml(content)).places
      } catch {
        diagnostics.push('Chyba parsování places.yaml')
      }
    } else if (
      (normalized.includes('/events/') ||
        normalized.startsWith('events/') ||
        normalized.startsWith('data/events/')) &&
      normalized.endsWith('.yaml')
    ) {
      try {
        const parsed = EventsFileSchema.safeParse(parseYaml(content))
        if (parsed.success) events = [...events, ...parsed.data.events]
      } catch {
        diagnostics.push(`Chyba parsování ${path}`)
      }
    }
  }

  const lineages = people.map((p) => p.frontmatter.lineage)
  const personIds = people.map((p) => p.frontmatter.id)
  const texts = textFiles.map(({ path, content }) =>
    parseTextMarkdown(content, path, personIds, lineages),
  )
  config = {
    ...config,
    lineageColors: enrichLineageColors(
      lineages,
      config.lineageColors,
      countLineageMembers(lineages),
    ),
  }

  return { people, texts, config, layout, events, places, diagnostics }
}

export function serializeConfig(config: VaultConfig): string {
  return stringifyYaml(config)
}

export function serializeLayout(layout: LayoutFile): string {
  return JSON.stringify(layout, null, 2)
}

export function serializeEvents(events: HistoricalEvent[]): string {
  return stringifyYaml({ events })
}
