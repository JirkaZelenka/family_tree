import { describe, it, expect } from 'vitest'
import { loadVaultFromFileMap } from '@/lib/storage/vault-loader'
import { vaultRelativePath } from '@/lib/data/sample-vault-files'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

describe('vaultRelativePath', () => {
  it('extracts path after data segment', () => {
    expect(vaultRelativePath('../../data/people/jan-novak.md')).toBe(
      'people/jan-novak.md',
    )
    expect(vaultRelativePath('../../../data/people/jan-novak.md')).toBe(
      'people/jan-novak.md',
    )
    expect(
      vaultRelativePath('C:/proj/data/people/jan-novak.md'),
    ).toBe('people/jan-novak.md')
  })
})

describe('loadVaultFromFileMap', () => {
  it('loads people from people/ prefix paths', async () => {
    const peopleDir = join(process.cwd(), 'data', 'people')
    const files = new Map<string, string>()
    for (const name of readdirSync(peopleDir)) {
      if (!name.endsWith('.md')) continue
      files.set(
        `people/${name}`,
        readFileSync(join(peopleDir, name), 'utf-8'),
      )
    }
    const vault = await loadVaultFromFileMap(files)
    expect(vault.people.length).toBeGreaterThan(0)
  })
})
