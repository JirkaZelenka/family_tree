import { create } from 'zustand'
import type { VaultData } from '@/lib/storage/vault-loader'
import { serializeConfig } from '@/lib/storage/vault-loader'
import { persistVaultMetaPaths, persistVaultTextPath } from '@/lib/storage/vault-persist'
import { parseColorInput } from '@/lib/vault/color-input'
import { useAuthStore } from '@/stores/auth-store'
import { lineageAccessFromUser, redactTextDocuments } from '@/auth/lineage-visibility'
import { parseTextMarkdown } from '@/lib/parser/text-markdown'
import {
  buildTextMarkdown,
  patchTextFrontmatter,
  slugifyTextId,
  uniqueTextId,
} from '@/lib/texts/frontmatter'
import type { TextDocument } from '@/types/text'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export type SaveTextInput = {
  /** Existující id — při vytvoření vynechat. */
  id?: string
  title: string
  date?: string | null
  family?: string | null
  /** Markdown tělo včetně značek `{id}` / `{rod}`. */
  body: string
}

interface VaultState {
  vault: VaultData | null
  directoryHandle: FileSystemDirectoryHandle | null
  fileMap: Map<string, string>
  saveStatus: SaveStatus
  isDirty: boolean
  isBootstrapping: boolean
  displayTexts: TextDocument[]
  setVault: (vault: VaultData, fileMap?: Map<string, string>) => void
  setDirectoryHandle: (handle: FileSystemDirectoryHandle | null) => void
  setSaveStatus: (status: SaveStatus) => void
  setDirty: (dirty: boolean) => void
  setBootstrapping: (bootstrapping: boolean) => void
  updatePersonFile: (path: string, content: string) => void
  updateTextMeta: (
    textId: string,
    meta: { date?: string | null; family?: string | null; title?: string },
  ) => boolean
  saveTextDocument: (
    input: SaveTextInput,
  ) => { ok: true; id: string } | { ok: false; error: string }
  updateLayout: (content: string) => void
  setLineageColor: (lineage: string, colorInput: string) => boolean
}

function applyTextRaw(
  get: () => VaultState,
  set: (partial: Partial<VaultState>) => void,
  filePath: string,
  nextRaw: string,
  replaceId?: string,
): TextDocument | null {
  const vault = get().vault
  if (!vault) return null
  const personIds = vault.people.map((p) => p.frontmatter.id)
  const lineages = vault.people.map((p) => p.frontmatter.lineage)
  const updated = parseTextMarkdown(nextRaw, filePath, personIds, lineages)
  const texts = replaceId
    ? vault.texts.map((doc) => (doc.id === replaceId ? updated : doc))
    : [...vault.texts.filter((doc) => doc.id !== updated.id), updated]
  const nextVault = { ...vault, texts }
  const fileMap = new Map(get().fileMap)
  fileMap.set(filePath, nextRaw)
  const access = lineageAccessFromUser(useAuthStore.getState().user)
  set({
    vault: nextVault,
    fileMap,
    isDirty: true,
    displayTexts: redactTextDocuments(texts, access, vault.people),
  })
  void persistVaultTextPath(filePath, nextRaw)
  return updated
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vault: null,
  directoryHandle: null,
  fileMap: new Map(),
  saveStatus: 'idle',
  isDirty: false,
  isBootstrapping: true,
  displayTexts: [],
  setVault: (vault, fileMap) => {
    const access = lineageAccessFromUser(useAuthStore.getState().user)
    set({
      vault,
      fileMap: fileMap ?? get().fileMap,
      isDirty: false,
      displayTexts: redactTextDocuments(vault.texts, access, vault.people),
    })
  },
  setDirectoryHandle: (handle) => set({ directoryHandle: handle }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
  updatePersonFile: (path, content) => {
    const fileMap = new Map(get().fileMap)
    fileMap.set(path, content)
    set({ fileMap, isDirty: true })
  },
  updateTextMeta: (textId, meta) => {
    const vault = get().vault
    if (!vault) return false
    const existing = vault.texts.find((doc) => doc.id === textId)
    if (!existing) return false

    const nextRaw = patchTextFrontmatter(existing.rawContent, {
      title: meta.title !== undefined ? meta.title : existing.title,
      date: meta.date !== undefined ? meta.date : existing.date ?? null,
      family: meta.family !== undefined ? meta.family : existing.family ?? null,
    })
    return applyTextRaw(get, set, existing.filePath, nextRaw, textId) != null
  },
  saveTextDocument: (input) => {
    const vault = get().vault
    if (!vault) return { ok: false, error: 'Vault není načten.' }
    const title = input.title.trim()
    if (!title) return { ok: false, error: 'Zadejte nadpis.' }

    if (input.id) {
      const existing = vault.texts.find((doc) => doc.id === input.id)
      if (!existing) return { ok: false, error: 'Text neexistuje.' }
      const nextRaw = buildTextMarkdown({
        title,
        date: input.date ?? null,
        family: input.family ?? null,
        body: input.body,
      })
      const saved = applyTextRaw(get, set, existing.filePath, nextRaw, existing.id)
      if (!saved) return { ok: false, error: 'Uložení selhalo.' }
      return { ok: true, id: saved.id }
    }

    const id = uniqueTextId(
      slugifyTextId(title),
      vault.texts.map((doc) => doc.id),
    )
    const filePath = `texts/${id}.md`
    const nextRaw = buildTextMarkdown({
      title,
      date: input.date ?? null,
      family: input.family ?? null,
      body: input.body,
    })
    const saved = applyTextRaw(get, set, filePath, nextRaw)
    if (!saved) return { ok: false, error: 'Vytvoření selhalo.' }
    return { ok: true, id: saved.id }
  },
  updateLayout: (content) => {
    const fileMap = new Map(get().fileMap)
    fileMap.set('.family-tree/layout.json', content)
    set({ fileMap, isDirty: true })
  },
  setLineageColor: (lineage, colorInput) => {
    const color = parseColorInput(colorInput)
    if (!color) return false
    const vault = get().vault
    if (!vault) return false

    const lineageColors = { ...vault.config.lineageColors, [lineage]: color }
    const config = { ...vault.config, lineageColors }
    const content = serializeConfig(config)
    const fileMap = new Map(get().fileMap)
    fileMap.set('.family-tree/config.yaml', content)
    set({
      vault: { ...vault, config },
      fileMap,
      isDirty: true,
    })
    void persistVaultMetaPaths(fileMap, ['.family-tree/config.yaml'])
    return true
  },
}))
