import matter from 'gray-matter'
import { PersonFrontmatterSchema, type PersonRecord } from '@/types/person'
import { stringify as yamlStringify } from 'yaml'

export interface ParseResult {
  record: PersonRecord | null
  errors: string[]
}

export function parsePersonMarkdown(
  content: string,
  filePath: string,
): ParseResult {
  const errors: string[] = []
  try {
    const { data, content: body } = matter(content)
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
  const { frontmatter, body } = record
  const yaml = yamlStringify(frontmatter, { lineWidth: 0 })
  const title = `# ${frontmatter.givenName}${frontmatter.familyName ? ` ${frontmatter.familyName}` : ''}`
  const content = body || `${title}\n`
  return `---\n${yaml}---\n\n${content.startsWith('#') ? content : `${title}\n\n${content}`}`
}

export function buildFullName(fm: {
  givenName: string
  familyName?: string
  maidenName?: string | null
}): string {
  const parts = [fm.givenName]
  if (fm.familyName) parts.push(fm.familyName)
  if (fm.maidenName) parts.push(`(${fm.maidenName})`)
  return parts.join(' ')
}
