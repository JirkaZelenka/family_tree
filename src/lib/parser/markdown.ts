import { parse as parseYaml, stringify as yamlStringify } from 'yaml'
import {
  PersonFrontmatterSchema,
  type PersonFrontmatter,
  type PersonLink,
  type PersonRecord,
} from '@/types/person'
import type { Gender } from '@/types/person'
import { normalizeRodName } from '@/lib/vault/lineage-colors'

export interface ParseResult {
  record: PersonRecord | null
  errors: string[]
}

function linkMapKey(item: PersonLink, index: number, used: Set<string>): string {
  const raw =
    item.popisek?.trim() ||
    item.link?.trim() ||
    `odkaz_${index + 1}`
  let key = raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  if (!key) key = `odkaz_${index + 1}`
  let unique = key
  let n = 2
  while (used.has(unique)) {
    unique = `${key}_${n++}`
  }
  used.add(unique)
  return unique
}

function linksToYamlMap(
  links: PersonLink[],
): Record<string, { link: string; popisek: string }> {
  const used = new Set<string>()
  const out: Record<string, { link: string; popisek: string }> = {}
  links.forEach((item, index) => {
    const key = linkMapKey(item, index, used)
    out[key] = {
      link: item.link,
      popisek: item.popisek ?? '',
    }
  })
  return out
}

function normalizeFrontmatterForYaml(fm: PersonFrontmatter): Record<string, unknown> {
  const { moving, ...rest } = fm
  return {
    ...rest,
    birth: {
      date: fm.birth?.date ?? '',
      place: fm.birth?.place ?? '',
      ...(fm.birth?.lat !== undefined ? { lat: fm.birth.lat } : {}),
      ...(fm.birth?.lon !== undefined ? { lon: fm.birth.lon } : {}),
    },
    death: {
      date: fm.death?.date ?? '',
      place: fm.death?.place ?? '',
      ...(fm.death?.lat !== undefined ? { lat: fm.death.lat } : {}),
      ...(fm.death?.lon !== undefined ? { lon: fm.death.lon } : {}),
    },
    spouses: fm.spouses.map((spouse) => ({
      id: spouse.id,
      marriageDate: spouse.marriageDate ?? '',
      ...(spouse.marriagePlace ? { marriagePlace: spouse.marriagePlace } : {}),
    })),
    ...(moving?.length
      ? {
          moving: moving.map((m) => ({
            date: m.date ?? '',
            ...(m.from ? { from: m.from } : {}),
            to: m.to,
          })),
        }
      : {}),
    links: linksToYamlMap(fm.links),
  }
}

/** Bez gray-matter — ten v prohlížeči vyžaduje Node.js Buffer. */
export function parseFrontmatter(content: string): { data: unknown; body: string } {
  const text = String(content).replace(/^\uFEFF/, '')
  if (!text.startsWith('---')) {
    return { data: {}, body: text.trim() }
  }

  const lines = text.split(/\r?\n/)
  if (lines[0].trim() !== '---') {
    return { data: {}, body: text.trim() }
  }

  let endLine = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endLine = i
      break
    }
  }

  if (endLine === -1) {
    const yamlBlock = lines.slice(1).join('\n')
    const data = yamlBlock.trim() ? parseYaml(yamlBlock) : {}
    return { data: data ?? {}, body: '' }
  }

  const yamlBlock = lines.slice(1, endLine).join('\n')
  const body = lines.slice(endLine + 1).join('\n').trim()
  const data = yamlBlock.trim() ? parseYaml(yamlBlock) : {}
  return { data: data ?? {}, body }
}

export function parsePersonMarkdown(
  content: string,
  filePath: string,
): ParseResult {
  const errors: string[] = []
  try {
    const { data, body } = parseFrontmatter(content)
    const parsed = PersonFrontmatterSchema.safeParse(data)
    if (!parsed.success) {
      errors.push(
        ...parsed.error.issues.map(
          (i) => `${filePath}: ${i.path.join('.')}: ${i.message}`,
        ),
      )
      return { record: null, errors }
    }
    return {
      record: {
        frontmatter: parsed.data,
        body: body.trim(),
        filePath,
      },
      errors,
    }
  } catch (e) {
    errors.push(`${filePath}: ${e instanceof Error ? e.message : String(e)}`)
    return { record: null, errors }
  }
}

export function serializePersonMarkdown(record: PersonRecord): string {
  const yaml = yamlStringify(normalizeFrontmatterForYaml(record.frontmatter), {
    lineWidth: 0,
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN',
  }).trimEnd()
  return `---\n${yaml}\n`
}

function maidenNameDiffersFromFamilyName(
  maidenName: string,
  familyName?: string,
): boolean {
  if (!familyName) return true
  if (maidenName === familyName) return false
  return normalizeRodName(maidenName) !== normalizeRodName(familyName)
}

/** Rodné příjmení v závorce u žen, pokud se liší od aktuálního. */
export function formatFamilyNameWithMaiden(fm: {
  gender?: Gender
  familyName?: string
  maidenName?: string | null
}): string {
  const base = fm.familyName ?? ''
  if (
    fm.gender === 'female' &&
    fm.maidenName &&
    maidenNameDiffersFromFamilyName(fm.maidenName, base)
  ) {
    return `${base} (${fm.maidenName})`
  }
  return base
}

export function buildFullName(fm: {
  givenName: string
  familyName?: string
  maidenName?: string | null
  gender?: Gender
}): string {
  const parts = [fm.givenName]
  const familyLabel = formatFamilyNameWithMaiden(fm)
  if (familyLabel) parts.push(familyLabel)
  return parts.join(' ')
}
