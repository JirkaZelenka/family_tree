import { z } from 'zod'

export const ConfidenceLevel = z.enum(['high', 'medium', 'low'])
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>

export const Gender = z.enum(['male', 'female', 'other', 'unknown'])
export type Gender = z.infer<typeof Gender>

export const LifeEventSchema = z.object({
  date: z.string().optional(),
  place: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
})

export const MediaItemSchema = z.object({
  type: z.enum(['photo', 'document', 'map']),
  path: z.string(),
  caption: z.string().optional(),
})

export const PersonFrontmatterSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  givenName: z.string(),
  familyName: z.string().optional(),
  maidenName: z.string().nullable().optional(),
  gender: Gender.default('unknown'),
  lineage: z.string().default('unknown'),
  birth: LifeEventSchema.optional(),
  death: LifeEventSchema.optional(),
  parents: z.array(z.string()).default([]),
  spouses: z.array(z.string()).default([]),
  children: z.array(z.string()).default([]),
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
