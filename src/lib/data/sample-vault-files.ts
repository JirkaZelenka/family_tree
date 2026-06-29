import configYaml from '../../../data/.family-tree/config.yaml?raw'
import layoutJson from '../../../data/.family-tree/layout.json?raw'
import eventsYaml from '../../../data/events/world-events.yaml?raw'

/** Cesty relativní ke kořeni vaultu (např. `people/jan-novak.md`). */
export function vaultRelativePath(importPath: string): string {
  const normalized = importPath.replace(/\\/g, '/')
  const match = normalized.match(/(?:^|\/)data\/(.+)$/)
  if (match) return match[1]
  if (normalized.startsWith('people/')) return normalized
  return normalized.replace(/^(\.\.\/)+/, '')
}

function mergeGlobRaw(
  target: Map<string, string>,
  modules: Record<string, unknown>,
): void {
  for (const [path, content] of Object.entries(modules)) {
    if (typeof content !== 'string') continue
    target.set(vaultRelativePath(path), content)
  }
}

const peopleGlobs = [
  import.meta.glob('../../../data/people/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  import.meta.glob('/data/people/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
] as Record<string, string>[]

/**
 * Načte ukázkový vault z `data/` — statické importy + Vite glob (dvě varianty cest).
 */
export function loadSampleVaultFileMap(): Map<string, string> {
  const files = new Map<string, string>()

  for (const glob of peopleGlobs) {
    mergeGlobRaw(files, glob)
  }

  files.set('.family-tree/config.yaml', configYaml)
  files.set('.family-tree/layout.json', layoutJson)
  files.set('events/world-events.yaml', eventsYaml)

  return files
}
