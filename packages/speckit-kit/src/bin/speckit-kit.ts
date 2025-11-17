import fs from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { HttpApiBuilder, HttpMiddleware, HttpServer, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { NodeFileSystem, NodeHttpServer, NodePath, NodeRuntime } from '@effect/platform-node'
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

function stripApiPrefix(req: HttpServerRequest.HttpServerRequest): HttpServerRequest.HttpServerRequest {
  let url: URL
  try {
    url = new URL(req.url, 'http://localhost')
  } catch {
    return req
  }

  if (!(url.pathname === '/api' || url.pathname.startsWith('/api/'))) {
    return req
  }

  url.pathname = url.pathname.replace(/^\/api/, '') || '/'
  const nextUrl = `${url.pathname}${url.search}`
  return req.modify({ url: nextUrl })
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

function runKanban(opts: CliOptions): void {
  if (opts.repoRoot) {
    process.env.SPECKIT_KIT_REPO_ROOT = path.resolve(opts.repoRoot)
  }

  assertUiDistExists()

  const ApiLive = HttpApiBuilder.api(EffectApi).pipe(
    Layer.provide(HealthLive),
    Layer.provide(SpecboardLive),
    Layer.provide(SpecboardServiceLive),
  )

  const NodeServerLive = NodeHttpServer.layer(createServer, {
    port: opts.port === null || Number.isNaN(opts.port) ? 0 : opts.port,
    host: opts.host,
  })

  const RuntimeLive = Layer.mergeAll(
    ApiLive,
    HttpApiBuilder.Router.Live,
    HttpApiBuilder.Middleware.layer,
    NodeFileSystem.layer,
    NodePath.layer,
    NodeServerLive,
  )

  const program = Effect.gen(function* () {
    const apiApp = yield* HttpApiBuilder.httpApp

    const httpApp = Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest
      let url: URL
      try {
        url = new URL(req.url, 'http://localhost')
      } catch {
        url = new URL('http://localhost/')
      }

      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        const rewritten = stripApiPrefix(req)
        return yield* apiApp.pipe(Effect.provideService(HttpServerRequest.HttpServerRequest, rewritten))
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return HttpServerResponse.text('Not Found', { status: 404 })
      }

      const filePath = resolveUiFilePath(url.pathname)
      if (!filePath) {
        return HttpServerResponse.text('Not Found', { status: 404 })
      }

      return yield* HttpServerResponse.file(filePath).pipe(
        Effect.catchAll(() => Effect.succeed(HttpServerResponse.text('Not Found', { status: 404 }))),
      )
    })

    yield* HttpServer.serveEffect(httpApp, HttpMiddleware.logger)

    const address = yield* HttpServer.addressWith(Effect.succeed)
    if (address._tag === 'TcpAddress') {
      const publicUrl = `http://localhost:${address.port}`
      yield* Effect.sync(() => {
        console.log(`Server running at ${publicUrl}`)
      })

      if (opts.open) {
        yield* Effect.tryPromise({
          try: () => open(publicUrl),
          catch: () => undefined,
        }).pipe(Effect.ignore)
      }
    } else {
      yield* Effect.sync(() => {
        console.log(`Server running at ${HttpServer.formatAddress(address)}`)
      })
    }

    return yield* Effect.never
  }).pipe(Effect.provide(RuntimeLive), Effect.scoped)

  NodeRuntime.runMain(program)
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2))
  if ('help' in parsed) {
    printHelp()
    return
  }

  if (parsed.command === 'kanban') {
    runKanban(parsed)
    return
  }
}

void main().catch((e) => {
  console.error(e)
  process.exit(1)
})
