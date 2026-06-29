import { describe, it, expect } from 'vitest'
import { parsePersonMarkdown } from '@/lib/parser/markdown'
import fs from 'fs'
import path from 'path'

describe('user markdown files', () => {
  it('parses integer id and numeric relation refs', () => {
    const file = path.join(process.cwd(), 'data/people/1-jirka-zelenka.md')
    const content = fs.readFileSync(file, 'utf8')
    const { record, errors } = parsePersonMarkdown(content, 'people/1-jirka-zelenka.md')
    expect(errors).toEqual([])
    expect(record?.frontmatter.id).toBe('1')
    expect(record?.frontmatter.spouses).toEqual(['13'])
  })

  it('accepts inline numeric spouse/child arrays', () => {
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
    expect(record?.frontmatter.spouses).toEqual(['13'])
    expect(record?.frontmatter.children).toEqual(['1', '2'])
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
children: []
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
