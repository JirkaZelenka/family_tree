import { create } from 'zustand'
import type { VaultData } from '@/lib/storage/vault-loader'
import { serializeConfig } from '@/lib/storage/vault-loader'
import { persistVaultMetaPaths } from '@/lib/storage/vault-persist'
import { parseColorInput } from '@/lib/vault/color-input'
import { useAuthStore } from '@/stores/auth-store'
import { lineageAccessFromUser, redactTextDocuments } from '@/auth/lineage-visibility'
import type { TextDocument } from '@/types/text'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

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
  updateLayout: (content: string) => void
  setLineageColor: (lineage: string, colorInput: string) => boolean
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
