/**
 * Zkopíruje šablony z templates/ do gitignorovaných cest.
 * Výchozí chování: jen chybějící soubory. S --force přepíše vše.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const templateRoot = path.join(root, 'templates')
const force = process.argv.includes('--force')

const FILE_COPIES = [
  ['data/.family-tree/config.yaml', 'data/.family-tree/config.yaml'],
  ['data/.family-tree/layout.json', 'data/.family-tree/layout.json'],
  ['src/types/vault.ts', 'src/types/vault.ts'],
  ['tests/lineage-names.test.ts', 'tests/lineage-names.test.ts'],
]

function copyFile(relFrom, relTo) {
  const src = path.join(templateRoot, relFrom)
  const dest = path.join(root, relTo)
  if (!fs.existsSync(src)) {
    console.warn(`Šablona chybí: ${relFrom}`)
    return 0
  }
  if (fs.existsSync(dest) && !force) return 0
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  console.log(`${force && fs.existsSync(dest) ? 'Přepsáno' : 'Vytvořeno'}: ${relTo}`)
  return 1
}

function copyPeopleDir() {
  const srcDir = path.join(templateRoot, 'data/people')
  const destDir = path.join(root, 'data/people')
  if (!fs.existsSync(srcDir)) return 0
  fs.mkdirSync(destDir, { recursive: true })
  let n = 0
  for (const name of fs.readdirSync(srcDir)) {
    if (!name.endsWith('.md')) continue
    const dest = path.join(destDir, name)
    if (fs.existsSync(dest) && !force) continue
    fs.copyFileSync(path.join(srcDir, name), dest)
    console.log(`${force && fs.existsSync(dest) ? 'Přepsáno' : 'Vytvořeno'}: data/people/${name}`)
    n++
  }
  return n
}

function copyTextsDir() {
  const srcDir = path.join(templateRoot, 'data/texts')
  const destDir = path.join(root, 'data/texts')
  if (!fs.existsSync(srcDir)) return 0
  fs.mkdirSync(destDir, { recursive: true })
  let n = 0
  for (const name of fs.readdirSync(srcDir)) {
    if (!name.endsWith('.md')) continue
    const dest = path.join(destDir, name)
    if (fs.existsSync(dest) && !force) continue
    fs.copyFileSync(path.join(srcDir, name), dest)
    console.log(`${force && fs.existsSync(dest) ? 'Přepsáno' : 'Vytvořeno'}: data/texts/${name}`)
    n++
  }
  return n
}

let copied = 0
for (const [from, to] of FILE_COPIES) {
  copied += copyFile(from, to)
}
copied += copyPeopleDir()
copied += copyTextsDir()

if (copied === 0) {
  console.log('Všechny lokální soubory už existují (použij --force pro přepsání).')
} else {
  console.log(`Hotovo — ${copied} soubor(ů).`)
}
