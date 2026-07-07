import { describe, it, expect } from 'vitest'
import { parsePersonMarkdown, buildFullName } from '@/lib/parser/markdown'

const SAMPLE = `---
id: "a1000001-0001-4000-8000-000000000001"
slug: jan-novak
givenName: Jan
familyName: Novák
gender: male
lineage: novak
birth:
  date: "1820-03-15"
  place: Praha
parents: []
spouses: []
children: []
tags: []
media: []
sources: []
---

# Jan Novák

Test bio.
`

describe('parsePersonMarkdown', () => {
  it('parses valid frontmatter', () => {
    const { record, errors } = parsePersonMarkdown(SAMPLE, 'people/jan.md')
    expect(errors).toHaveLength(0)
    expect(record?.frontmatter.givenName).toBe('Jan')
    expect(record?.body).toContain('Test bio')
  })

  it('parses real sample file shape', () => {
    const { record, errors } = parsePersonMarkdown(
      `---
id: "a1000001-0001-4000-8000-000000000040"
slug: adam-novak
givenName: Adam
familyName: Novák
gender: male
lineage: novak
birth:
  date: "2001-03-08"
parents: []
spouses: []
children: []
tags: []
media: []
sources: []
---

# Adam Novák
`,
      'people/adam-novak.md',
    )
    expect(errors).toHaveLength(0)
    expect(record?.frontmatter.slug).toBe('adam-novak')
  })

  it('builds full name', () => {
    expect(
      buildFullName({ givenName: 'Marie', familyName: 'Nováková', maidenName: 'Svobodová' }),
    ).toBe('Marie Nováková (Svobodová)')
  })

  it('accepts birth date as year only (quoted or YAML number)', () => {
    const quoted = parsePersonMarkdown(
      `---
id: "5"
slug: deda
givenName: Deda
gender: male
lineage: zelenkovi
birth:
  date: "1933"
parents: []
spouses: []
children: []
tags: []
media: []
sources: []
---
`,
      'people/deda.md',
    )
    expect(quoted.errors).toEqual([])
    expect(quoted.record?.frontmatter.birth?.date).toBe('1933')

    const numeric = parsePersonMarkdown(
      `---
id: "6"
slug: babi
givenName: Babi
gender: female
lineage: zelenkovi
birth:
  date: 1940
parents: []
spouses: []
children: []
tags: []
media: []
sources: []
---
`,
      'people/babi.md',
    )
    expect(numeric.errors).toEqual([])
    expect(numeric.record?.frontmatter.birth?.date).toBe('1940')
  })
})
