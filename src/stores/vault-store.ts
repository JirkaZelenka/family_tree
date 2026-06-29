import { create } from 'zustand'
import type { VaultData } from '@/lib/storage/vault-loader'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface VaultState {
  vault: VaultData | null
  directoryHandle: FileSystemDirectoryHandle | null
  fileMap: Map<string, string>
  saveStatus: SaveStatus
  isDirty: boolean
  isBootstrapping: boolean
  setVault: (vault: VaultData, fileMap?: Map<string, string>) => void
  setDirectoryHandle: (handle: FileSystemDirectoryHandle | null) => void
  setSaveStatus: (status: SaveStatus) => void
  setDirty: (dirty: boolean) => void
  setBootstrapping: (bootstrapping: boolean) => void
  updatePersonFile: (path: string, content: string) => void
  updateLayout: (content: string) => void
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vault: null,
  directoryHandle: null,
  fileMap: new Map(),
  saveStatus: 'idle',
  isDirty: false,
  isBootstrapping: true,
  setVault: (vault, fileMap) =>
    set({
      vault,
      fileMap: fileMap ?? get().fileMap,
      isDirty: false,
    }),
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
}))
