import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const META_PATH_RE = /^\.family-tree\/(config\.yaml|layout\.json)$/

function dataFilePath(root: string, relPath: string): string {
  return path.join(root, 'data', relPath)
}

/** Dev-only: zapisuje config.yaml a layout.json do data/.family-tree/ na disku. */
export function vaultPersistPlugin(): Plugin {
  return {
    name: 'vault-persist',
    configureServer(server) {
      const root = server.config.root

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
            if (!META_PATH_RE.test(relPath)) {
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
          if (!META_PATH_RE.test(relPath)) {
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
  }
}
