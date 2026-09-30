import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const META_PATH_RE = /^\.family-tree\/(config\.yaml|layout\.json)$/
const TEXT_PATH_RE = /^texts\/.+\.md$/i
const MEDIA_EXT_RE = /\.(mp3|wav|ogg|m4a|aac|pdf|png|jpe?g|webp|gif)$/i

const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.md': 'text/markdown; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

function isAllowedVaultPath(relPath: string): boolean {
  return META_PATH_RE.test(relPath) || TEXT_PATH_RE.test(relPath)
}

function isAllowedVaultMediaPath(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/')
  if (!normalized || normalized.includes('..')) return false
  return MEDIA_EXT_RE.test(normalized)
}

function dataFilePath(root: string, relPath: string): string {
  return path.join(root, 'data', relPath)
}

function serveVaultFile(
  root: string,
  reqUrl: string | undefined,
  res: import('http').ServerResponse,
): void {
  try {
    const url = new URL(reqUrl ?? '/', 'http://localhost')
    const relPath = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
    if (!isAllowedVaultMediaPath(relPath)) {
      res.statusCode = 403
      res.end('forbidden path')
      return
    }
    const target = dataFilePath(root, relPath)
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      res.statusCode = 404
      res.end('not found')
      return
    }
    const ext = path.extname(target).toLowerCase()
    res.statusCode = 200
    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=60')
    fs.createReadStream(target).pipe(res)
  } catch {
    res.statusCode = 500
    res.end('error')
  }
}

function copyMediaToDist(root: string, outDir: string): void {
  const dataRoot = path.join(root, 'data')
  if (!fs.existsSync(dataRoot)) return

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      const rel = path.relative(dataRoot, full).replace(/\\/g, '/')
      if (!MEDIA_EXT_RE.test(rel)) continue
      const dest = path.join(outDir, 'vault', rel)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(full, dest)
    }
  }
  walk(dataRoot)
}

/** Dev-only: zapisuje vault soubory do data/ a servíruje média z /vault. */
export function vaultPersistPlugin(): Plugin {
  return {
    name: 'vault-persist',
    configureServer(server) {
      const root = server.config.root

      server.middlewares.use('/vault', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next()
          return
        }
        serveVaultFile(root, req.url, res)
      })

      server.middlewares.use('/__vault/persist', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body) as { path?: string; content?: string }
            const relPath = parsed.path ?? ''
            const content = parsed.content ?? ''
            if (!isAllowedVaultPath(relPath) || relPath.includes('..')) {
              res.statusCode = 403
              res.end('forbidden path')
              return
            }
            const target = dataFilePath(root, relPath)
            fs.mkdirSync(path.dirname(target), { recursive: true })
            fs.writeFileSync(target, content, 'utf8')
            res.statusCode = 200
            res.end('ok')
          } catch {
            res.statusCode = 500
            res.end('error')
          }
        })
      })

      server.middlewares.use('/__vault/read', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end()
          return
        }
        try {
          const url = new URL(req.url ?? '', 'http://localhost')
          const relPath = url.searchParams.get('path') ?? ''
          if (!isAllowedVaultPath(relPath) || relPath.includes('..')) {
            res.statusCode = 403
            res.end('forbidden path')
            return
          }
          const target = dataFilePath(root, relPath)
          if (!fs.existsSync(target)) {
            res.statusCode = 404
            res.end('not found')
            return
          }
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(fs.readFileSync(target, 'utf8'))
        } catch {
          res.statusCode = 500
          res.end('error')
        }
      })
    },
    configurePreviewServer(server) {
      const root = server.config.root
      server.middlewares.use('/vault', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next()
          return
        }
        serveVaultFile(root, req.url, res)
      })
    },
    writeBundle(options) {
      const outDir = options.dir
      if (!outDir) return
      copyMediaToDist(path.resolve(outDir, '..', '..'), outDir)
      // Vite outDir is typically <root>/dist — resolve project root from cwd.
      copyMediaToDist(process.cwd(), outDir)
    },
  }
}
