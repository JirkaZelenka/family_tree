import { describe, it, expect } from 'vitest'
import { parsePersonMarkdown } from '@/lib/parser/markdown'
import fs from 'fs'
import path from 'path'

describe('user markdown files', () => {
  it('parses integer id and marriage spouses', () => {
    const file = path.join(process.cwd(), 'data/people/1-jiri-zelenka.md')
    const content = fs.readFileSync(file, 'utf8')
    const { record, errors } = parsePersonMarkdown(content, 'people/1-jiri-zelenka.md')
    expect(errors).toEqual([])
    expect(record?.frontmatter.id).toBe('1')
    expect(record?.frontmatter.spouses).toEqual([
      { id: '13', marriage: { date: '21.9.2024' } },
    ])
    expect('children' in (record?.frontmatter ?? {})).toBe(false)
  })

  it('accepts legacy numeric spouse ids and ignores children in yaml', () => {
    const { record, errors } = parsePersonMarkdown(
      `---
id: 42
slug: test
givenName: Test
gender: male
lineage: test
spouses: [13]
children: [1, 2]
parents: []
tags: []
media: []
sources: []
---
`,
      'people/test.md',
    )
    expect(errors).toEqual([])
    expect(record?.frontmatter.id).toBe('42')
    expect(record?.frontmatter.spouses).toEqual([{ id: '13' }])
    expect('children' in (record?.frontmatter ?? {})).toBe(false)
  })

  it('parses structured marriage with date', () => {
    const { record, errors } = parsePersonMarkdown(
      `---
id: "1"
slug: test
givenName: Test
gender: male
lineage: test
spouses:
  - id: "2"
    marriage:
      date: "12.6.1990"
      place: Praha
parents: []
tags: []
media: []
sources: []
---
`,
      'people/test.md',
    )
    expect(errors).toEqual([])
    expect(record?.frontmatter.spouses).toEqual([
      { id: '2', marriage: { date: '12.6.1990', place: 'Praha' } },
    ])
  })

  it('ignores empty spouse placeholder entries', () => {
    const brazda = path.join(process.cwd(), 'data/people/14-ondrej-brazda.md')
    const zelenka = path.join(process.cwd(), 'data/people/19-ondrej-zelenka.md')
    for (const file of [brazda, zelenka]) {
      const content = fs.readFileSync(file, 'utf8')
      const { record, errors } = parsePersonMarkdown(content, file)
      expect(errors).toEqual([])
      expect(record?.frontmatter.spouses).toEqual([])
    }
  })

  it('still accepts UUID strings', () => {
    const { record, errors } = parsePersonMarkdown(
      `---
id: "a1000001-0001-4000-8000-000000000001"
slug: jan
givenName: Jan
gender: male
lineage: novak
parents: []
spouses: []
tags: []
media: []
sources: []
---
`,
      'people/jan.md',
    )
    expect(errors).toEqual([])
    expect(record?.frontmatter.id).toBe('a1000001-0001-4000-8000-000000000001')
  })
})
