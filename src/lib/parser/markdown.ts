import { parse as parseYaml, stringify as yamlStringify } from 'yaml'
import { PersonFrontmatterSchema, type PersonRecord } from '@/types/person'

export interface ParseResult {
  record: PersonRecord | null
  errors: string[]
}

/** Bez gray-matter — ten v prohlížeči vyžaduje Node.js Buffer. */
function parseFrontmatter(content: string): { data: unknown; body: string } {
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
    return { data: {}, body: text.trim() }
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
