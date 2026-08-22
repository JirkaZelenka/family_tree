/**
 * Extrakce osob z narativního MD (family_files).
 * Spuštění:
 *   npm exec tsx -- scripts/extract-source-people.ts data/family_files/pro_zelenkovy_14s/pro_zelenkovy_14s.md
 *
 * Vedle vstupu zapíše `.people.md` a `.people.csv`. Opakovaný běh na stejném
 * souboru dá stejný výstup.
 */
import fs from 'fs'
import path from 'path'
import {
  extractPeopleFromSourceMarkdown,
  extractedPeopleToCsv,
  extractedPeopleToMarkdownTable,
} from '../src/lib/extract/source-people'

const inputArg = process.argv[2]
if (!inputArg) {
  console.error('Použití: npm exec tsx -- scripts/extract-source-people.ts <soubor.md>')
  process.exit(1)
}

const inputPath = path.resolve(process.cwd(), inputArg)
const markdown = fs.readFileSync(inputPath, 'utf8')
const people = extractPeopleFromSourceMarkdown(markdown)
const table = extractedPeopleToMarkdownTable(people)
const csv = extractedPeopleToCsv(people)

const parsed = path.parse(inputPath)
const mdOut = path.join(parsed.dir, `${parsed.name}.people.md`)
const csvOut = path.join(parsed.dir, `${parsed.name}.people.csv`)
fs.writeFileSync(mdOut, table, 'utf8')
fs.writeFileSync(csvOut, csv, 'utf8')

process.stdout.write(table)
console.error(`Osob: ${people.length}`)
console.error(`Zapsáno: ${mdOut}`)
console.error(`Zapsáno: ${csvOut}`)
