import { describe, it, expect } from 'vitest'
import { buildGraphFromRecords } from '@/lib/graph/builder'
import { parsePersonMarkdown } from '@/lib/parser/markdown'

const JAN = `---
id: "a1000001-0001-4000-8000-000000000001"
slug: jan
givenName: Jan
familyName: Novák
gender: male
lineage: novak
birth:
  date: "1820"
parents: []
spouses:
  - "a1000001-0001-4000-8000-000000000002"
children:
  - "a1000001-0001-4000-8000-000000000003"
tags: []
media: []
sources: []
---
`

const MARIE = `---
id: "a1000001-0001-4000-8000-000000000002"
slug: marie
givenName: Marie
familyName: Nováková
gender: female
lineage: svobodova
birth:
  date: "1825"
parents: []
spouses:
  - "a1000001-0001-4000-8000-000000000001"
children:
  - "a1000001-0001-4000-8000-000000000003"
tags: []
media: []
sources: []
---
`

const CHILD = `---
id: "a1000001-0001-4000-8000-000000000003"
slug: child
givenName: František
familyName: Novák
gender: male
lineage: novak
birth:
  date: "1850"
parents:
  - "a1000001-0001-4000-8000-000000000001"
  - "a1000001-0001-4000-8000-000000000002"
spouses: []
children: []
tags: []
media: []
sources: []
---
`

describe('buildGraphFromRecords', () => {
  it('builds nodes and parent-child edges', () => {
    const records = [JAN, MARIE, CHILD].map((c, i) =>
      parsePersonMarkdown(c, `people/${i}.md`).record!,
    )
    const { graph, persons } = buildGraphFromRecords(records)
    expect(persons.size).toBe(3)
    expect(graph.order).toBe(3)
    expect(graph.hasEdge(
      'a1000001-0001-4000-8000-000000000001',
      'a1000001-0001-4000-8000-000000000003',
    )).toBe(true)
  })

  it('extracts birth year from DD.MM.YYYY', () => {
    const { record } = parsePersonMarkdown(
      `---
id: "1"
slug: jiri-zelenka
givenName: Jiří
familyName: Zelenka
gender: male
lineage: zelenkovi
birth:
  date: "4.6.1993"
parents: []
spouses: []
children: []
tags: []
media: []
sources: []
---
`,
      'people/1-jiri-zelenka.md',
    )
    const { persons } = buildGraphFromRecords([record!])
    expect(persons.get('1')?.birthYear).toBe(1993)
  })

  it('odvozí children z parents', () => {
    const { record: parent } = parsePersonMarkdown(
      `---
id: "p"
slug: parent
givenName: Parent
gender: male
lineage: test
parents: []
spouses: []
tags: []
media: []
sources: []
---
`,
      'people/p.md',
    )
    const { record: child } = parsePersonMarkdown(
      `---
id: "c"
slug: child
givenName: Child
gender: male
lineage: test
parents: ["p"]
spouses: []
tags: []
media: []
sources: []
---
`,
      'people/c.md',
    )
    const { persons } = buildGraphFromRecords([parent!, child!])
    expect(persons.get('p')?.children).toEqual(['c'])
  })
})
