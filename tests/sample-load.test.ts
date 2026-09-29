import { describe, it, expect } from 'vitest'
import { loadSampleVaultFileMap, loadTemplateVaultFileMap } from '@/lib/data/sample-vault-files'
import { loadVaultFromFileMap } from '@/lib/storage/vault-loader'
import { findPersonTexts } from '@/lib/texts'

describe('sample vault load', () => {
  it('loads sample vault only from data/, never template people', async () => {
    const sample = loadSampleVaultFileMap()
    const template = loadTemplateVaultFileMap()
    const samplePeople = [...sample.keys()].filter((k) => k.startsWith('people/') && k.endsWith('.md'))
    const templatePeople = [...template.keys()].filter((k) => k.startsWith('people/') && k.endsWith('.md'))

    expect(samplePeople.length).toBeGreaterThan(0)
    expect(templatePeople.some((k) => /novak|dvorak/i.test(k))).toBe(true)
    for (const path of samplePeople) {
      expect(path).not.toMatch(/novak|dvorak/i)
    }

    const vault = await loadVaultFromFileMap(sample)
    const lineages = new Set(vault.people.map((p) => p.frontmatter.lineage.toLowerCase()))
    expect(lineages.has('dvorakovi')).toBe(false)
    expect(lineages.has('novakovi')).toBe(false)
    expect(vault.people.length).toBeGreaterThan(0)
  })

  it('loads tagged sample texts from the template vault', async () => {
    const files = loadTemplateVaultFileMap()
    const vault = await loadVaultFromFileMap(files)
    expect(vault.texts.length).toBeGreaterThan(0)
    expect(findPersonTexts(vault.texts, '1').length).toBeGreaterThan(0)
    expect(vault.texts.some((doc) => !doc.displayBody.includes('{'))).toBe(true)
  })
})
