import { parse as parseYaml, stringify as yamlStringify } from 'yaml'

export function extractTextBody(rawContent: string): string {
  const text = String(rawContent).replace(/^\uFEFF/, '')
  if (!text.startsWith('---')) return text
  const lines = text.split(/\r?\n/)
  let endLine = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endLine = i
      break
    }
  }
  if (endLine === -1) return ''
  return lines.slice(endLine + 1).join('\n').replace(/^\r?\n/, '')
}

export function slugifyTextId(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'text'
}

export function uniqueTextId(base: string, existingIds: Iterable<string>): string {
  const taken = new Set(existingIds)
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

export function buildTextMarkdown(meta: {
  title: string
  date?: string | null
  family?: string | null
  body: string
}): string {
  const data: Record<string, unknown> = {}
  const title = meta.title.trim()
  if (title) data.title = title
  const date = meta.date?.trim() ?? ''
  if (date) data.date = date
  const family = meta.family?.trim() ?? ''
  if (family) data.family = family

  const yaml = yamlStringify(data, {
    lineWidth: 0,
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN',
  }).trimEnd()

  const bodyOut = meta.body.replace(/^\n+/, '').replace(/\n+$/, '')
  return bodyOut ? `---\n${yaml}\n---\n\n${bodyOut}\n` : `---\n${yaml}\n---\n`
}

export function patchTextFrontmatter(
  rawContent: string,
  patch: {
    title?: string
    date?: string | null
    family?: string | null
  },
): string {
  const text = String(rawContent).replace(/^\uFEFF/, '')
  let data: Record<string, unknown> = {}
  let body = text

  if (text.startsWith('---')) {
    const lines = text.split(/\r?\n/)
    let endLine = -1
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        endLine = i
        break
      }
    }
    if (endLine !== -1) {
      const yamlBlock = lines.slice(1, endLine).join('\n')
      const parsed = yamlBlock.trim() ? parseYaml(yamlBlock) : {}
      data =
        parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? { ...(parsed as Record<string, unknown>) }
          : {}
      body = lines.slice(endLine + 1).join('\n').replace(/^\r?\n/, '')
    }
  }

  if (patch.title !== undefined) {
    const title = patch.title.trim()
    if (title) data.title = title
  }
  if (patch.date !== undefined) {
    const date = patch.date?.trim() ?? ''
    if (date) data.date = date
    else delete data.date
  }
  if (patch.family !== undefined) {
    delete data.lineage
    const family = patch.family?.trim() ?? ''
    if (family) data.family = family
    else delete data.family
  }

  const yaml = yamlStringify(data, {
    lineWidth: 0,
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN',
  }).trimEnd()

  const bodyOut = body.replace(/^\n+/, '')
  return bodyOut ? `---\n${yaml}\n---\n\n${bodyOut}` : `---\n${yaml}\n---\n`
}
