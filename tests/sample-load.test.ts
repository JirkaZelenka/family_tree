import { describe, it, expect } from 'vitest'
import { loadSampleVaultFileMap, loadTemplateVaultFileMap } from '@/lib/data/sample-vault-files'
import { loadVaultFromFileMap } from '@/lib/storage/vault-loader'
import { buildGraphFromRecords } from '@/lib/graph/builder'
import { findPersonTexts } from '@/lib/texts'

describe('sample vault load', () => {
  it('loads user md files from data/people', async () => {
    const files = loadSampleVaultFileMap()
    const peopleMd = [...files.keys()].filter((k) => k.includes('people/') && k.endsWith('.md'))

    const vault = await loadVaultFromFileMap(files)

    console.log('md files:', peopleMd.length)
    console.log('parsed people:', vault.people.length)
    console.log('diagnostics:', vault.diagnostics)

    const { persons, diagnostics } = buildGraphFromRecords(vault.people)
    console.log('graph persons:', persons.size)
    console.log('graph diagnostics:', diagnostics)

    expect(vault.people.length).toBeGreaterThan(0)
    expect(vault.texts.length).toBeGreaterThan(0)
    expect(persons.size).toBeGreaterThan(0)
  })

  it('loads tagged sample texts from the template vault', async () => {
    const files = loadTemplateVaultFileMap()
    const vault = await loadVaultFromFileMap(files)
    expect(vault.texts.length).toBeGreaterThan(0)
    expect(findPersonTexts(vault.texts, '1').length).toBeGreaterThan(0)
    expect(vault.texts.some((doc) => !doc.displayBody.includes('{'))).toBe(true)
  })
})
