import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { HttpRouter, HttpServer } from 'effect/unstable/http'
import { HttpApiBuilder } from 'effect/unstable/httpapi'
import { Effect, Layer } from 'effect'
import open from 'open'

import { EffectApi } from '../server/app/effect-api.js'
import { HealthLive } from '../server/health/health.http.live.js'
import { SpecboardLive } from '../server/specboard/specboard.http.live.js'
import { SpecboardServiceLive } from '../server/specboard/specboard.service.live.js'

type Command = 'kanban'

interface CliOptions {
  readonly command: Command
  readonly host: string
  readonly port: number | null
  readonly open: boolean
  readonly repoRoot: string | null
}

function printHelp(): void {
  console.log(`speckit-kit

用法:
  speckit-kit [kanban] [--repo-root <path>] [--host <host>] [--port <port>] [--no-open]

参数:
  --repo-root <path>   指定目标仓库根目录（需包含 specs/）
  --host <host>        监听地址（默认 127.0.0.1）
  --port <port>        监听端口（默认 0 随机端口）
  --no-open            不自动打开浏览器
  -h, --help           显示帮助
`)
}

function parseArgs(argv: ReadonlyArray<string>): CliOptions | { readonly help: true } {
  const args = [...argv]
  const first = args[0]

  let command: Command = 'kanban'
  if (first && !first.startsWith('-')) {
    if (first !== 'kanban') {
      throw new Error(`未知命令：${first}`)
    }
    command = 'kanban'
    args.shift()
  }

  let host = process.env.HOST ?? '127.0.0.1'
  let port: number | null = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : null
  let shouldOpen = !(process.env.NO_OPEN === '1' || process.env.NO_OPEN === 'true')
  let repoRoot: string | null = null

  const takeValue = (flag: string): string => {
    const value = args.shift()
    if (!value) throw new Error(`${flag} 缺少参数`)
    return value
  }

  while (args.length > 0) {
    const a = args.shift()!
    if (a === '-h' || a === '--help') return { help: true }

    if (a === '--host') {
      host = takeValue(a)
      continue
    }
    if (a === '--port') {
      const raw = takeValue(a)
      port = Number.parseInt(raw, 10)
      if (Number.isNaN(port) || port < 0) {
        throw new Error(`--port 非法：${raw}`)
      }
      continue
    }
    if (a === '--repo-root') {
      repoRoot = takeValue(a)
      continue
    }
    if (a === '--no-open') {
      shouldOpen = false
      continue
    }
    if (a === '--open') {
      shouldOpen = true
      continue
    }

    throw new Error(`未知参数：${a}`)
  }

  return { command, host, port, open: shouldOpen, repoRoot }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const UI_DIST = path.resolve(__dirname, '..', 'ui')
const UI_INDEX_HTML = path.join(UI_DIST, 'index.html')

function assertUiDistExists(): void {
  if (!fs.existsSync(UI_INDEX_HTML)) {
    console.error(`UI dist 不存在：${UI_DIST}`)
    console.error(`请先构建：pnpm -C packages/speckit-kit build`)
    process.exit(1)
  }
}

function stripApiPrefix(pathname: string): string {
  return pathname.replace(/^\/api/, '') || '/'
}

function toWebRequest(req: IncomingMessage, origin: string): Request {
  const url = new URL(req.url ?? '/', origin)
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : (req as any)
  return new Request(url, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body,
    duplex: body ? 'half' : undefined,
  } as RequestInit)
}

async function writeWebResponse(response: Response, res: ServerResponse): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  if (!response.body) {
    res.end()
    return
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  res.end(buffer)
}

function resolveUiFilePath(pathname: string): string | null {
  const decoded = (() => {
    try {
      return decodeURIComponent(pathname)
    } catch {
      return pathname
    }
  })()

  const withoutLeadingSlash = decoded.startsWith('/') ? decoded.slice(1) : decoded
  const relative = withoutLeadingSlash.length === 0 ? 'index.html' : withoutLeadingSlash
  const candidate = path.resolve(UI_DIST, relative)

  if (!candidate.startsWith(`${UI_DIST}${path.sep}`) && candidate !== UI_DIST) {
    return null
  }

  if (decoded.endsWith('/') || !path.extname(candidate)) {
    return UI_INDEX_HTML
  }

  return candidate
}

function contentTypeFor(filePath: string): string {
  switch (path.extname(filePath)) {
    case '.html':
      return 'text/html; charset=utf-8'
    case '.js':
      return 'text/javascript; charset=utf-8'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.json':
      return 'application/json; charset=utf-8'
    case '.svg':
      return 'image/svg+xml'
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    default:
      return 'application/octet-stream'
  }
}

async function runKanban(opts: CliOptions): Promise<void> {
  if (opts.repoRoot) {
    process.env.SPECKIT_KIT_REPO_ROOT = path.resolve(opts.repoRoot)
  }

  assertUiDistExists()

  const ApiLive = HttpApiBuilder.layer(EffectApi).pipe(
    Layer.provide(HealthLive),
    Layer.provide(SpecboardLive),
    Layer.provide(SpecboardServiceLive),
    Layer.provide(HttpServer.layerServices),
  )

  const { handler: apiHandler, dispose } = HttpRouter.toWebHandler(Layer.mergeAll(ApiLive), { disableLogger: true })

  const server = createServer(async (req, res) => {
    try {
      const origin = `http://${opts.host}`
      const url = new URL(req.url ?? '/', origin)

      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        url.pathname = stripApiPrefix(url.pathname)
        const apiRequest = new Request(url, toWebRequest(req, origin))
        const apiResponse = await apiHandler(apiRequest)
        await writeWebResponse(apiResponse, res)
        return
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 404
        res.end('Not Found')
        return
      }

      const filePath = resolveUiFilePath(url.pathname)
      if (!filePath) {
        res.statusCode = 404
        res.end('Not Found')
        return
      }

      const body = await fs.promises.readFile(filePath)
      res.statusCode = 200
      res.setHeader('content-type', contentTypeFor(filePath))
      res.end(body)
    } catch (error) {
      res.statusCode = 500
      res.end(error instanceof Error ? error.message : 'Internal Server Error')
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(opts.port === null || Number.isNaN(opts.port) ? 0 : opts.port, opts.host, () => resolve())
  })

  const address = server.address()
  if (address && typeof address === 'object') {
    const publicUrl = `http://localhost:${address.port}`
    console.log(`Server running at ${publicUrl}`)
    if (opts.open) {
      await open(publicUrl).catch(() => undefined)
    }
  }

  const shutdown = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await dispose()
  }

  process.once('SIGINT', () => {
    void shutdown().finally(() => process.exit(0))
  })
  process.once('SIGTERM', () => {
    void shutdown().finally(() => process.exit(0))
  })

  await new Promise<never>(() => {})
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2))
  if ('help' in parsed) {
    printHelp()
    return
  }

  if (parsed.command === 'kanban') {
    await runKanban(parsed)
    return
  }
}

void main().catch((e) => {
  console.error(e)
  process.exit(1)
})
