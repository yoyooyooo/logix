import * as Fs from 'node:fs'
import * as Http from 'node:http'
import * as Path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = Path.resolve(Path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = Path.join(appDir, 'dist')

const port = Number(process.env.PORT ?? '4173')
if (!Number.isFinite(port) || port <= 0) {
  process.stderr.write(`Invalid PORT: ${process.env.PORT}\n`)
  process.exit(1)
}

const contentTypeByExt: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

const normalizePath = (urlPath: string): string => {
  const raw = urlPath.split('?')[0] ?? '/'
  const decoded = decodeURIComponent(raw)
  const trimmed = decoded.startsWith('/') ? decoded.slice(1) : decoded
  return trimmed.length === 0 ? 'index.html' : trimmed
}

const resolveFile = (relativePath: string): string | null => {
  const candidate = Path.resolve(distDir, relativePath)
  if (!candidate.startsWith(distDir + Path.sep) && candidate !== distDir) return null
  if (Fs.existsSync(candidate) && Fs.statSync(candidate).isFile()) return candidate

  // Directory index fallback
  if (Fs.existsSync(candidate) && Fs.statSync(candidate).isDirectory()) {
    const index = Path.join(candidate, 'index.html')
    if (Fs.existsSync(index) && Fs.statSync(index).isFile()) return index
  }

  // HTML fallback for extension-less routes
  if (!Path.extname(candidate)) {
    const html = candidate + '.html'
    if (Fs.existsSync(html) && Fs.statSync(html).isFile()) return html
  }

  return null
}

if (!Fs.existsSync(distDir)) {
  process.stderr.write(`Missing dist directory: ${distDir}\n`)
  process.stderr.write(`Run: pnpm api-reference:build\n`)
  process.exit(1)
}

const server = Http.createServer((req, res) => {
  const filePath = resolveFile(normalizePath(req.url ?? '/'))
  if (!filePath) {
    res.statusCode = 404
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    res.end('Not Found')
    return
  }

  const ext = Path.extname(filePath)
  res.statusCode = 200
  res.setHeader('content-type', contentTypeByExt[ext] ?? 'application/octet-stream')
  Fs.createReadStream(filePath).pipe(res)
})

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Logix API Reference: http://127.0.0.1:${port}/\n`)
})

