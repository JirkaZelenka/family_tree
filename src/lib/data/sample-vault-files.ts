import templateConfigYaml from '../../../templates/data/.family-tree/config.yaml?raw'
import templateLayoutJson from '../../../templates/data/.family-tree/layout.json?raw'
import eventsYaml from '../../../data/events/world-events.yaml?raw'

/** Cesty relativní ke kořeni vaultu (např. `people/jan-novak.md`). */
export function vaultRelativePath(importPath: string): string {
  const normalized = importPath.replace(/\\/g, '/')
  const match = normalized.match(/(?:^|\/)data\/(.+)$/)
  if (match) return match[1]
  const templateMatch = normalized.match(/(?:^|\/)templates\/data\/(.+)$/)
  if (templateMatch) return templateMatch[1]
  if (normalized.startsWith('people/')) return normalized
  if (normalized.startsWith('texts/')) return normalized
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

function pickRawModule(
  modules: Record<string, unknown>,
  fallback: string,
): string {
  const values = Object.values(modules).filter((v) => typeof v === 'string') as string[]
  return values[0] ?? fallback
}

const templatePeopleGlobs = [
  import.meta.glob('../../../templates/data/people/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  import.meta.glob('/templates/data/people/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
] as Record<string, string>[]

const userPeopleGlobs = [
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

const templateTextsGlobs = [
  import.meta.glob('../../../templates/data/texts/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  import.meta.glob('/templates/data/texts/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
] as Record<string, string>[]

const userTextsGlobs = [
  import.meta.glob('../../../data/texts/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  import.meta.glob('/data/texts/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
] as Record<string, string>[]

const userConfigGlobs = import.meta.glob('../../../data/.family-tree/config.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const userLayoutGlobs = import.meta.glob('../../../data/.family-tree/layout.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/**
 * Načte pouze šablonový vault (pro testy a čistý clone bez lokálních dat).
 */
export function loadTemplateVaultFileMap(): Map<string, string> {
  const files = new Map<string, string>()

  for (const glob of templatePeopleGlobs) {
    mergeGlobRaw(files, glob)
  }
  for (const glob of templateTextsGlobs) {
    mergeGlobRaw(files, glob)
  }

  files.set('.family-tree/config.yaml', templateConfigYaml)
  files.set('.family-tree/layout.json', templateLayoutJson)
  files.set('events/world-events.yaml', eventsYaml)

  return files
}

/**
 * Načte ukázkový vault — lokální data/ má přednost, jinak šablony z templates/data/.
 */
export function loadSampleVaultFileMap(): Map<string, string> {
  const files = new Map<string, string>()

  for (const glob of userPeopleGlobs) {
    mergeGlobRaw(files, glob)
  }
  if ([...files.keys()].filter((k) => k.startsWith('people/')).length === 0) {
    for (const glob of templatePeopleGlobs) {
      mergeGlobRaw(files, glob)
    }
    for (const glob of templateTextsGlobs) {
      mergeGlobRaw(files, glob)
    }
  } else {
    for (const glob of userTextsGlobs) {
      mergeGlobRaw(files, glob)
    }
  }

  const configYaml = pickRawModule(userConfigGlobs, templateConfigYaml)
  const layoutJson = pickRawModule(userLayoutGlobs, templateLayoutJson)

  files.set('.family-tree/config.yaml', configYaml)
  files.set('.family-tree/layout.json', layoutJson)
  files.set('events/world-events.yaml', eventsYaml)

  return files
}
