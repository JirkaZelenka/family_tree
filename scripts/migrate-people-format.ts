/**
 * Normalizace souborů data/people/*.md — jednotný YAML (stringy, links jako mapa).
 * Spuštění: npm exec tsx -- scripts/migrate-people-format.ts
 */
import fs from 'fs'
import path from 'path'
import { parsePersonMarkdown, serializePersonMarkdown } from '../src/lib/parser/markdown'

const PEOPLE_DIR = path.join(process.cwd(), 'data/people')

function migrateFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf8')
  const relPath = path.relative(path.join(process.cwd(), 'data'), filePath).replace(/\\/g, '/')
  const { record, errors } = parsePersonMarkdown(content, relPath)
  if (errors.length > 0 || !record) {
    throw new Error(`${relPath}: ${errors.join('; ')}`)
  }

  const fm = record.frontmatter
  fs.writeFileSync(
    filePath,
    serializePersonMarkdown({
      frontmatter: {
        ...fm,
        links: fm.links ?? [],
        internal_note: fm.internal_note ?? '',
        note: fm.note ?? '',
      },
      body: '',
      filePath: relPath,
    }),
    'utf8',
  )
}

const files = fs
  .readdirSync(PEOPLE_DIR)
  .filter((f) => f.endsWith('.md'))
  .sort()

for (const file of files) {
  migrateFile(path.join(PEOPLE_DIR, file))
  console.log(`Migrated ${file}`)
}

console.log(`Done: ${files.length} files`)
