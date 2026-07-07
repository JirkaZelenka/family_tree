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

export const LifeEventSchema = z.object({
  date: DateValueSchema,
  place: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
})

export const MarriageEventSchema = z.object({
  date: DateValueSchema,
  place: z.string().optional(),
})

export const MediaItemSchema = z.object({
  type: z.enum(['photo', 'document', 'map']),
  path: z.string(),
  caption: z.string().optional(),
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
  marriage: MarriageEventSchema.optional(),
})

export type Marriage = z.infer<typeof MarriageSchema>

const SpousesSchema = z.preprocess((val) => {
  if (!Array.isArray(val)) return []
  return val
    .map((item) => {
      if (item && typeof item === 'object' && 'id' in item) {
        const entry = item as { id: unknown; marriage?: { date?: unknown; place?: unknown } }
        const marriage: { date?: string; place?: string } = {}
        if (entry.marriage && typeof entry.marriage === 'object') {
          const date = entry.marriage.date
          if (date !== undefined && date !== null && String(date).trim() !== '') {
            marriage.date = String(date)
          }
          if (entry.marriage.place) {
            marriage.place = String(entry.marriage.place)
          }
        }
        if (Object.keys(marriage).length > 0) {
          return { id: String(entry.id), marriage }
        }
        return { id: String(entry.id) }
      }
      return { id: String(item) }
    })
    .filter((entry) => entry.id.trim().length > 0)
}, z.array(MarriageSchema).default([]))

export const PersonFrontmatterSchema = z.object({
  id: PersonIdSchema,
  slug: z.string(),
  givenName: z.string(),
  familyName: z.string().optional(),
  maidenName: z.string().nullable().optional(),
  gender: Gender.default('unknown'),
  lineage: z.string().default('unknown'),
  birth: LifeEventSchema.optional(),
  death: LifeEventSchema.optional(),
  parents: PersonIdListSchema,
  spouses: SpousesSchema,
  tags: z.array(z.string()).default([]),
  confidence: z
    .object({
      birth: ConfidenceLevel.optional(),
      death: ConfidenceLevel.optional(),
    })
    .optional(),
  media: z.array(MediaItemSchema).default([]),
  sources: z.array(z.string()).default([]),
})

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
