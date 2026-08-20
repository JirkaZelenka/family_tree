import { describe, it, expect } from 'vitest'
import { parsePersonMarkdown } from '@/lib/parser/markdown'
import fs from 'fs'
import path from 'path'
import { templateDataPath } from './template-paths'

describe('user markdown files', () => {
  it('parses integer id and marriage spouses', () => {
    const file = path.join(process.cwd(), templateDataPath('people/1-jan-novak.md'))
    const content = fs.readFileSync(file, 'utf8')
    const { record, errors } = parsePersonMarkdown(content, 'people/1-jan-novak.md')
    expect(errors).toEqual([])
    expect(record?.frontmatter.id).toBe('1')
    expect(record?.frontmatter.spouses).toEqual([
      { id: '13', marriageDate: '11.9.2022' },
    ])
    expect(record?.frontmatter.links).toEqual([
      {
        link: 'https://matrika.example/svatba',
        popisek: 'Matrika svatby',
      },
    ])
    expect('children' in (record?.frontmatter ?? {})).toBe(false)
    expect(record?.body).toBe('')
  })

  it('parses links as yaml map', () => {
    const { record, errors } = parsePersonMarkdown(
      `---
id: "1"
slug: test
givenName: Test
gender: male
lineage: test
parents: []
spouses: []
links:
  matrika:
    link: "https://example.com/a"
    popisek: "Matrika A"
  rodny_list:
    link: "https://example.com/b"
    popisek: "Rodný list"
internal_note: ""
note: ""
`,
      'people/test.md',
    )
    expect(errors).toEqual([])
    expect(record?.frontmatter.links).toEqual([
      { link: 'https://example.com/a', popisek: 'Matrika A' },
      { link: 'https://example.com/b', popisek: 'Rodný list' },
    ])
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
links: []
internal_note: ""
note: ""
`,
      'people/test.md',
    )
    expect(errors).toEqual([])
    expect(record?.frontmatter.id).toBe('42')
    expect(record?.frontmatter.spouses).toEqual([{ id: '13', marriageDate: '' }])
    expect('children' in (record?.frontmatter ?? {})).toBe(false)
  })

  it('parses structured marriage with marriageDate', () => {
    const { record, errors } = parsePersonMarkdown(
      `---
id: "1"
slug: test
givenName: Test
gender: male
lineage: test
spouses:
  - id: "2"
    marriageDate: "12.6.1990"
    marriagePlace: Praha
parents: []
links: []
internal_note: ""
note: ""
`,
      'people/test.md',
    )
    expect(errors).toEqual([])
    expect(record?.frontmatter.spouses).toEqual([
      { id: '2', marriageDate: '12.6.1990', marriagePlace: 'Praha' },
    ])
  })

  it('still accepts legacy nested marriage format', () => {
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
links: []
internal_note: ""
note: ""
`,
      'people/test.md',
    )
    expect(errors).toEqual([])
    expect(record?.frontmatter.spouses).toEqual([
      { id: '2', marriageDate: '12.6.1990', marriagePlace: 'Praha' },
    ])
  })

  it('migrates pozn to internal_note', () => {
    const { record, errors } = parsePersonMarkdown(
      `---
id: "1"
slug: test
givenName: Test
gender: male
lineage: test
parents: []
spouses: []
pozn: "interní poznámka"
links: []
note: ""
`,
      'people/test.md',
    )
    expect(errors).toEqual([])
    expect(record?.frontmatter.internal_note).toBe('interní poznámka')
    expect('pozn' in (record?.frontmatter ?? {})).toBe(false)
  })

  it('ignores empty spouse placeholder entries', () => {
    const dvorak = path.join(process.cwd(), templateDataPath('people/14-frantisek-dvorak.md'))
    const novak = path.join(process.cwd(), templateDataPath('people/19-karel-novak.md'))
    for (const file of [dvorak, novak]) {
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
links: []
internal_note: ""
note: ""
`,
      'people/jan.md',
    )
    expect(errors).toEqual([])
    expect(record?.frontmatter.id).toBe('a1000001-0001-4000-8000-000000000001')
  })
})
