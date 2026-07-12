/**
 * Jednorázový skript — maidenName se v aplikaci neodvozuje automaticky.
 * Spuštění: npx tsx scripts/fill-maiden-names.ts
 */
import fs from 'fs'
import path from 'path'
import { parsePersonMarkdown, serializePersonMarkdown } from '../src/lib/parser/markdown'
import { lineageToMaidenName } from '../src/lib/vault/lineage-names'

const PEOPLE_DIR = path.join(process.cwd(), 'data/people')

const files = fs
  .readdirSync(PEOPLE_DIR)
  .filter((f) => f.endsWith('.md'))
  .sort()

for (const file of files) {
  const filePath = path.join(PEOPLE_DIR, file)
  const relPath = path.relative(path.join(process.cwd(), 'data'), filePath).replace(/\\/g, '/')
  const content = fs.readFileSync(filePath, 'utf8')
  const { record, errors } = parsePersonMarkdown(content, relPath)
  if (errors.length > 0 || !record) {
    throw new Error(`${relPath}: ${errors.join('; ')}`)
  }

  const maidenName = lineageToMaidenName(
    record.frontmatter.lineage,
    record.frontmatter.gender,
  )

  fs.writeFileSync(
    filePath,
    serializePersonMarkdown({
      ...record,
      frontmatter: { ...record.frontmatter, maidenName },
    }),
    'utf8',
  )
  console.log(`${file}: ${maidenName}`)
}

console.log(`Done: ${files.length} files`)
