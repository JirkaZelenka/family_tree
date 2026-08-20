import JSZip from 'jszip'
import { loadVaultFromFileMap, type VaultData } from './vault-loader'
import { serializePersonMarkdown } from '@/lib/parser/markdown'
import { serializeConfig, serializeLayout, serializeEvents } from './vault-loader'

const DB_NAME = 'family-tree-graph'
const DB_VERSION = 1
const STORE = 'vault-cache'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE)
    }
  })
}

export async function cacheVaultFiles(files: Map<string, string>): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE, 'readwrite')
  const serialized = JSON.stringify([...files.entries()])
  tx.objectStore(STORE).put(serialized, 'current')
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
  db.close()
}

export async function clearCachedVault(): Promise<void> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete('current')
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
    db.close()
  } catch {
    // ignore
  }
}

export async function loadCachedVaultFiles(): Promise<Map<string, string> | null> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get('current')
    const data = await new Promise<string | undefined>((res, rej) => {
      req.onsuccess = () => res(req.result as string | undefined)
      req.onerror = () => rej(req.error)
    })
    db.close()
    if (!data) return null
    return new Map(JSON.parse(data) as [string, string][])
  } catch {
    return null
  }
}

export async function importZipVault(
  file: File,
): Promise<{ vault: VaultData; files: Map<string, string> }> {
  const zip = await JSZip.loadAsync(file)
  const files = new Map<string, string>()
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    const content = await entry.async('string')
    files.set(path, content)
  }
  await cacheVaultFiles(files)
  const vault = await loadVaultFromFileMap(files)
  return { vault, files }
}

export async function exportZipVault(
  vault: VaultData,
  extraFiles?: Map<string, Blob>,
): Promise<Blob> {
  const zip = new JSZip()
  for (const person of vault.people) {
    const rel = person.filePath.replace(/^.*[/\\]people[/\\]/, 'people/')
    zip.file(rel, serializePersonMarkdown(person))
  }
  for (const text of vault.texts) {
    const rel = text.filePath.replace(/^.*[/\\]texts[/\\]/, 'texts/')
    zip.file(rel, text.rawContent)
  }
  zip.file('.family-tree/config.yaml', serializeConfig(vault.config))
  zip.file('.family-tree/layout.json', serializeLayout(vault.layout))
  zip.file('events/world-events.yaml', serializeEvents(vault.events))
  extraFiles?.forEach((blob, path) => zip.file(path, blob))
  return zip.generateAsync({ type: 'blob' })
}

export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window
}

export async function pickVaultDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' })
  } catch {
    return null
  }
}

async function readDir(
  handle: FileSystemDirectoryHandle,
  prefix = '',
): Promise<Map<string, string>> {
  const files = new Map<string, string>()
  for await (const [name, entry] of handle.entries()) {
    const path = prefix ? `${prefix}/${name}` : name
    if (entry.kind === 'directory') {
      const sub = await readDir(entry as FileSystemDirectoryHandle, path)
      sub.forEach((v, k) => files.set(k, v))
    } else {
      const file = await (entry as FileSystemFileHandle).getFile()
      if (
        file.name.endsWith('.md') ||
        file.name.endsWith('.yaml') ||
        file.name.endsWith('.json')
      ) {
        files.set(path, await file.text())
      }
    }
  }
  return files
}

export async function loadVaultFromDirectory(
  handle: FileSystemDirectoryHandle,
): Promise<{ vault: VaultData; files: Map<string, string> }> {
  const files = await readDir(handle)
  await cacheVaultFiles(files)
  const vault = await loadVaultFromFileMap(files)
  return { vault, files }
}

export async function writeTextFile(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  content: string,
): Promise<void> {
  const parts = relativePath.split('/')
  let dir = root
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i], { create: true })
  }
  const fileHandle = await dir.getFileHandle(parts[parts.length - 1], {
    create: true,
  })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}
