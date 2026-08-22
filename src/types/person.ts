import { z } from 'zod'

export const ConfidenceLevel = z.enum(['high', 'medium', 'low'])
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>

export const Gender = z.enum(['male', 'female', 'other', 'unknown'])
export type Gender = z.infer<typeof Gender>

export const DateValueSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined) return undefined
    if (typeof val === 'number') return String(val)
    const trimmed = String(val).trim()
    return trimmed.length > 0 ? trimmed : undefined
  },
  z.string().optional(),
)

/** Datum/místo v YAML — prázdný řetězec se zachová. */
export const StoredDateSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined) return ''
    if (typeof val === 'number') return String(val)
    return String(val)
  },
  z.string(),
)

export const LifeEventSchema = z.object({
  date: StoredDateSchema.default(''),
  place: z.string().default(''),
  lat: z.number().optional(),
  lon: z.number().optional(),
})

/** ID v YAML může být integer (1) nebo řetězec ("1", UUID). V aplikaci vždy string. */
export const PersonIdSchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((s) => s.length > 0, { message: 'Required' })

const PersonIdListSchema = z
  .array(z.union([z.string(), z.number()]))
  .default([])
  .transform((items) =>
    items.map((v) => String(v)).filter((s) => s.length > 0),
  )

export const MarriageSchema = z.object({
  id: PersonIdSchema,
  marriageDate: StoredDateSchema.default(''),
  marriagePlace: z.string().optional(),
})

export type Marriage = z.infer<typeof MarriageSchema>

/** Explicitní stěhování: od data bydlí v `to` (volitelně odkud `from`). */
export const MovingSchema = z.object({
  date: StoredDateSchema.default(''),
  from: z.string().optional(),
  to: z.string().min(1),
})

export type Moving = z.infer<typeof MovingSchema>

const SpousesSchema = z.preprocess((val) => {
  if (!Array.isArray(val)) return []
  return val
    .map((item) => {
      if (item && typeof item === 'object' && 'id' in item) {
        const entry = item as {
          id: unknown
          marriageDate?: unknown
          marriagePlace?: unknown
          marriage?: { date?: unknown; place?: unknown }
        }
        const result: { id: string; marriageDate: string; marriagePlace?: string } = {
          id: String(entry.id),
          marriageDate: '',
        }
        if (entry.marriageDate !== undefined && entry.marriageDate !== null) {
          result.marriageDate = String(entry.marriageDate)
        }
        if (entry.marriagePlace) {
          result.marriagePlace = String(entry.marriagePlace)
        }
        if (entry.marriage && typeof entry.marriage === 'object') {
          if (entry.marriage.date !== undefined && entry.marriage.date !== null) {
            result.marriageDate = String(entry.marriage.date)
          }
          if (entry.marriage.place) {
            result.marriagePlace = String(entry.marriage.place)
          }
        }
        return result
      }
      return { id: String(item), marriageDate: '' }
    })
    .filter((entry) => entry.id.trim().length > 0)
}, z.array(MarriageSchema).default([]))

export const PersonLinkSchema = z.preprocess((val) => {
  if (!val || typeof val !== 'object') return val
  const entry = val as Record<string, unknown>
  if ('popisek' in entry || !('info' in entry)) return val
  return { ...entry, popisek: entry.info }
}, z.object({
  link: z.string().default(''),
  popisek: z.string().default(''),
}))

export type PersonLink = z.infer<typeof PersonLinkSchema>

const LinksSchema = z.preprocess((val) => {
  if (val == null) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'object') {
    return Object.entries(val as Record<string, unknown>).map(([key, item]) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const entry = item as Record<string, unknown>
        return {
          link: entry.link ?? '',
          popisek: entry.popisek ?? entry.info ?? key,
        }
      }
      return { link: item ?? '', popisek: key }
    })
  }
  return []
}, z.array(PersonLinkSchema).default([]))

const PersonFrontmatterFieldsSchema = z.object({
  id: PersonIdSchema,
  slug: z.string(),
  givenName: z.string(),
  familyName: z.string().optional(),
  maidenName: z.string().nullable().optional(),
  gender: Gender.default('unknown'),
  lineage: z.string().default('unknown'),
  birth: LifeEventSchema.default({ date: '', place: '' }),
  death: LifeEventSchema.default({ date: '', place: '' }),
  parents: PersonIdListSchema,
  spouses: SpousesSchema,
  moving: z.array(MovingSchema).default([]),
  links: LinksSchema,
  internal_note: z.string().default(''),
  note: z.string().default(''),
  confidence: z
    .object({
      birth: ConfidenceLevel.optional(),
      death: ConfidenceLevel.optional(),
    })
    .optional(),
})

export const PersonFrontmatterSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== 'object') return raw
  const data = { ...(raw as Record<string, unknown>) }
  if ('pozn' in data && !('internal_note' in data)) {
    data.internal_note = data.pozn
  }
  delete data.pozn
  delete data.tags
  delete data.media
  delete data.sources
  delete data.children
  return data
}, PersonFrontmatterFieldsSchema)

export type PersonFrontmatter = z.infer<typeof PersonFrontmatterSchema>

export interface PersonRecord {
  frontmatter: PersonFrontmatter
  body: string
  filePath: string
}

export interface PersonNode extends PersonFrontmatter {
  /** Odvozeno z parents u potomků — není v YAML. */
  children: string[]
  fullName: string
  birthYear: number | null
  deathYear: number | null
  body: string
  filePath: string
}

export type EdgeType = 'parent-child' | 'spouse' | 'sibling' | 'same-lineage'

export interface GraphEdgeAttributes {
  type: EdgeType
  startYear?: number | null
  endYear?: number | null
}
