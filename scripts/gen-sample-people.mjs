import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../data/people')

const id = (n) => `a2000001-0001-4000-8000-${String(n).padStart(12, '0')}`

/** @type {Array<Record<string, unknown>>} */
const people = [
  { n: 1, slug: 'vaclav-novak', given: 'Václav', family: 'Novák', gender: 'male', lineage: 'novak', birth: '1865', death: '1938', parents: [], spouses: [2], children: [3, 4] },
  { n: 2, slug: 'alena-novakova', given: 'Alena', family: 'Nováková', gender: 'female', lineage: 'novak', birth: '1868', death: '1942', parents: [], spouses: [1], children: [3, 4] },
  { n: 3, slug: 'karel-novak', given: 'Karel', family: 'Novák', gender: 'male', lineage: 'novak', birth: '1892', death: '1968', parents: [1, 2], spouses: [], children: [] },
  { n: 4, slug: 'antonin-novak', given: 'Antonín', family: 'Novák', gender: 'male', lineage: 'novak', birth: '1895', death: '1970', parents: [1, 2], spouses: [5], children: [6, 7] },
  { n: 5, slug: 'bozena-novakova', given: 'Božena', family: 'Nováková', gender: 'female', lineage: 'novak', birth: '1898', death: '1975', parents: [], spouses: [4], children: [6, 7] },
  { n: 6, slug: 'emil-novak', given: 'Emil', family: 'Novák', gender: 'male', lineage: 'novak', birth: '1925', death: '2001', parents: [4, 5], spouses: [], children: [] },
  { n: 7, slug: 'josef-novak', given: 'Josef', family: 'Novák', gender: 'male', lineage: 'novak', birth: '1928', death: '2010', parents: [4, 5], spouses: [8], children: [9] },
  { n: 8, slug: 'marie-novakova', given: 'Marie', family: 'Nováková', gender: 'female', lineage: 'novak', birth: '1930', death: '2015', parents: [], spouses: [7], children: [9] },
  { n: 9, slug: 'tomas-novak', given: 'Tomáš', family: 'Novák', gender: 'male', lineage: 'novak', birth: '1958', death: null, parents: [7, 8], spouses: [10], children: [11, 12] },
  { n: 10, slug: 'hana-novakova', given: 'Hana', family: 'Nováková', gender: 'female', lineage: 'novak', birth: '1960', death: null, parents: [], spouses: [9], children: [11, 12] },
  { n: 11, slug: 'petra-novakova', given: 'Petra', family: 'Nováková', gender: 'female', lineage: 'novak', birth: '1992', death: null, parents: [9, 10], spouses: [], children: [] },
  { n: 12, slug: 'martin-novak', given: 'Martin', family: 'Novák', gender: 'male', lineage: 'novak', birth: '1988', death: null, parents: [9, 10], spouses: [24], children: [13, 14] },
  { n: 13, slug: 'adam-novak', given: 'Adam', family: 'Novák', gender: 'male', lineage: 'novak', birth: '2018', death: null, parents: [12, 24], spouses: [], children: [] },
  { n: 14, slug: 'barbora-novakova', given: 'Barbora', family: 'Nováková', gender: 'female', lineage: 'novak', birth: '2022', death: null, parents: [12, 24], spouses: [], children: [] },
  { n: 15, slug: 'frantisek-dvorak', given: 'František', family: 'Dvořák', gender: 'male', lineage: 'dvořák', birth: '1860', death: '1930', parents: [], spouses: [16], children: [17] },
  { n: 16, slug: 'eva-dvorakova', given: 'Eva', family: 'Dvořáková', gender: 'female', lineage: 'dvořák', birth: '1863', death: '1935', parents: [], spouses: [15], children: [17] },
  { n: 17, slug: 'oldrich-dvorak', given: 'Oldřich', family: 'Dvořák', gender: 'male', lineage: 'dvořák', birth: '1893', death: '1965', parents: [15, 16], spouses: [18], children: [19, 21] },
  { n: 18, slug: 'jana-dvorakova', given: 'Jana', family: 'Dvořáková', gender: 'female', lineage: 'dvořák', birth: '1895', death: '1970', parents: [], spouses: [17], children: [19, 21] },
  { n: 19, slug: 'jiri-dvorak', given: 'Jiří', family: 'Dvořák', gender: 'male', lineage: 'dvořák', birth: '1923', death: '1998', parents: [17, 18], spouses: [20], children: [22] },
  { n: 20, slug: 'milada-dvorakova', given: 'Milada', family: 'Dvořáková', gender: 'female', lineage: 'dvořák', birth: '1925', death: '2005', parents: [], spouses: [19], children: [22] },
  { n: 21, slug: 'ludmila-dvorakova', given: 'Ludmila', family: 'Dvořáková', gender: 'female', lineage: 'dvořák', birth: '1926', death: null, parents: [17, 18], spouses: [], children: [] },
  { n: 22, slug: 'petr-dvorak', given: 'Petr', family: 'Dvořák', gender: 'male', lineage: 'dvořák', birth: '1955', death: null, parents: [19, 20], spouses: [23], children: [24] },
  { n: 23, slug: 'lenka-dvorakova', given: 'Lenka', family: 'Dvořáková', gender: 'female', lineage: 'dvořák', birth: '1958', death: null, parents: [], spouses: [22], children: [24] },
  { n: 24, slug: 'klara-dvorakova', given: 'Klára', family: 'Dvořáková', gender: 'female', lineage: 'dvořák', birth: '1990', death: null, parents: [22, 23], spouses: [12], children: [13, 14] },
]

function ref(nums) {
  return nums.map((n) => `"${id(n)}"`)
}

for (const p of people) {
  const lines = [
    '---',
    `id: "${id(p.n)}"`,
    `slug: ${p.slug}`,
    `givenName: ${p.given}`,
    `familyName: ${p.family}`,
    `gender: ${p.gender}`,
    `lineage: ${p.lineage}`,
    'birth:',
    `  date: "${p.birth}"`,
    '  place: "Praha"',
  ]
  if (p.death) {
    lines.push('death:', `  date: "${p.death}"`, '  place: "Praha"')
  }
  lines.push(`parents:${p.parents.length ? '\n  - ' + ref(p.parents).join('\n  - ') : ' []'}`)
  lines.push(`spouses:${p.spouses.length ? '\n  - ' + ref(p.spouses).join('\n  - ') : ' []'}`)
  lines.push(`children:${p.children.length ? '\n  - ' + ref(p.children).join('\n  - ') : ' []'}`)
  lines.push('tags: []', 'media: []', 'sources: []', '---', '', `# ${p.given} ${p.family}`, '')
  fs.writeFileSync(path.join(outDir, `${p.slug}.md`), lines.join('\n'))
}

console.log(`Wrote ${people.length} person files`)
