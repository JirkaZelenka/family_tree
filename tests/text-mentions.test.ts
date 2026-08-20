import { describe, expect, it } from 'vitest'
import {
  extractMentions,
  isTextMarkdownPath,
  parseTextMarkdown,
  resolveTextRef,
} from '@/lib/parser/text-markdown'
import { excerptAround, findLineageTexts, findPersonTexts } from '@/lib/texts'
import { loadVaultFromFileMap } from '@/lib/storage/vault-loader'

describe('isTextMarkdownPath', () => {
  it('accepts texts folder and rejects people files', () => {
    expect(isTextMarkdownPath('texts/svatba.md')).toBe(true)
    expect(isTextMarkdownPath('data/texts/rod/koreny.md')).toBe(true)
    expect(isTextMarkdownPath('people/1-jan-novak.md')).toBe(false)
    expect(isTextMarkdownPath('data/people/1-jan-novak.md')).toBe(false)
    expect(isTextMarkdownPath('notes/foo.md')).toBe(false)
  })
})

describe('extractMentions', () => {
  it('strips {id} and keeps the labeled name', () => {
    const { displayBody, mentions } = extractMentions(
      '[Jan Novák]{1} potkal Marii{13} z rodu Novákovi{novakovi}.',
    )
    expect(displayBody).toBe('Jan Novák potkal Marii z rodu Novákovi.')
    expect(mentions.map((m) => m.rawRef)).toEqual(['1', '13', 'novakovi'])
    expect(mentions.map((m) => displayBody.slice(m.start, m.end))).toEqual([
      'Jan Novák',
      'Marii',
      'Novákovi',
    ])
  })

  it('does not leave braces in the visible text', () => {
    const { displayBody } = extractMentions('Ahoj Jane{1}, jak se máš?')
    expect(displayBody).toBe('Ahoj Jane, jak se máš?')
    expect(displayBody).not.toContain('{')
    expect(displayBody).not.toContain('}')
  })
})

describe('resolveTextRef', () => {
  const people = ['1', '13']
  const lineages = ['novakovi', 'dvorakovi']

  it('resolves person ids and lineage keys', () => {
    expect(resolveTextRef('1', people, lineages)).toEqual({ kind: 'person', ref: '1' })
    expect(resolveTextRef('novakovi', people, lineages)).toEqual({
      kind: 'lineage',
      ref: 'novakovi',
    })
    expect(resolveTextRef('rod:dvorakovi', people, lineages)).toEqual({
      kind: 'lineage',
      ref: 'dvorakovi',
    })
    expect(resolveTextRef('Novákovi', people, lineages)).toEqual({
      kind: 'lineage',
      ref: 'novakovi',
    })
  })

  it('prefers person id over lineage when both could match', () => {
    expect(resolveTextRef('1', ['1'], ['1'])).toEqual({ kind: 'person', ref: '1' })
  })
})

describe('parseTextMarkdown', () => {
  it('reads title from frontmatter and resolves mentions', () => {
    const doc = parseTextMarkdown(
      `---
title: Svatba
date: "11.9.2022"
---

[Jan Novák]{1} a Marie{13} z rodu Dvořákovi{rod:dvorakovi}.
`,
      'texts/svatba.md',
      ['1', '13'],
      ['novakovi', 'dvorakovi'],
    )
    expect(doc.title).toBe('Svatba')
    expect(doc.date).toBe('11.9.2022')
    expect(doc.displayBody).toBe('Jan Novák a Marie z rodu Dvořákovi.')
    expect(doc.mentions.map((m) => `${m.kind}:${m.ref}`)).toEqual([
      'person:1',
      'person:13',
      'lineage:dvorakovi',
    ])
  })
})

describe('text lookup', () => {
  it('returns excerpts with the name highlighted and grouped by document', () => {
    const doc = parseTextMarkdown(
      'Dlouhý úvod před jménem [Jan Novák]{1} a ještě dlouhý text za ním, aby vznikl náhled.',
      'texts/a.md',
      ['1'],
      [],
    )
    const hits = findPersonTexts([doc], '1')
    expect(hits).toHaveLength(1)
    expect(hits[0].excerpt.hit).toBe('Jan Novák')
    expect(hits[0].excerpt.before.length).toBeGreaterThan(0)
    expect(hits[0].mentions).toHaveLength(1)
  })

  it('finds lineage mentions across documents', () => {
    const a = parseTextMarkdown('Rod Novákovi{novakovi} v Praze.', 'texts/a.md', [], ['novakovi'])
    const b = parseTextMarkdown('Jiný text bez rodu.', 'texts/b.md', [], ['novakovi'])
    const hits = findLineageTexts([a, b], 'novakovi')
    expect(hits.map((h) => h.document.id)).toEqual(['a'])
  })
})

describe('excerptAround', () => {
  it('adds ellipsis when truncated', () => {
    const body = `${'x'.repeat(200)}NAME${'y'.repeat(200)}`
    const start = 200
    const excerpt = excerptAround(body, start, start + 4, 20)
    expect(excerpt.hit).toBe('NAME')
    expect(excerpt.before.startsWith('…')).toBe(true)
    expect(excerpt.after.endsWith('…')).toBe(true)
  })
})

describe('loadVaultFromFileMap texts', () => {
  it('parses texts/ markdown with person and lineage mentions', async () => {
    const files = new Map<string, string>([
      [
        'people/1-jan.md',
        `---
id: "1"
slug: jan
givenName: Jan
gender: male
lineage: novakovi
---
`,
      ],
      [
        'texts/pribeh.md',
        `---
title: Příběh
---

[Jan]{1} z rodu Novákovi{novakovi}.
`,
      ],
    ])
    const vault = await loadVaultFromFileMap(files)
    expect(vault.texts).toHaveLength(1)
    expect(vault.texts[0].title).toBe('Příběh')
    expect(vault.texts[0].displayBody).toBe('Jan z rodu Novákovi.')
    expect(findPersonTexts(vault.texts, '1')).toHaveLength(1)
    expect(findLineageTexts(vault.texts, 'novakovi')).toHaveLength(1)
  })
})
