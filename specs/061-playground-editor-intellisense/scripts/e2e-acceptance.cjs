const { spawn } = require('node:child_process')
const { setTimeout: delay } = require('node:timers/promises')

const HOST = 'localhost'
const DEFAULT_PORT = 4173
const DEFAULT_TIMEOUT_MS = 120_000

const parseArgs = (argv) => {
  const args = { noBuild: false, port: DEFAULT_PORT, timeoutMs: DEFAULT_TIMEOUT_MS }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--no-build') {
      args.noBuild = true
      continue
    }
    if (token === '--port' && argv[i + 1]) {
      args.port = Number(argv[i + 1])
      i += 1
      continue
    }
    if (token.startsWith('--port=')) {
      args.port = Number(token.slice('--port='.length))
      continue
    }
    if (token === '--timeout' && argv[i + 1]) {
      args.timeoutMs = Number(argv[i + 1])
      i += 1
      continue
    }
    if (token.startsWith('--timeout=')) {
      args.timeoutMs = Number(token.slice('--timeout='.length))
      continue
    }
    throw new Error(`未知参数：${token}`)
  }
  if (!Number.isFinite(args.port) || args.port <= 0) throw new Error(`非法端口：${String(args.port)}`)
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) throw new Error(`非法超时：${String(args.timeoutMs)}`)
  return args
}

const toErrorString = (error) => {
  if (error instanceof Error) return error.stack || error.message || String(error)
  return String(error)
}

const runCommand = async (cmd, args, options = {}) => {
  const child = spawn(cmd, args, {
    ...options,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let output = ''
  const onData = (buf) => {
    output += buf.toString('utf-8')
    if (output.length > 20000) output = output.slice(-20000)
  }
  child.stdout.on('data', onData)
  child.stderr.on('data', onData)

  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code) => resolve(code ?? 0))
  })

  if (exitCode !== 0) {
    const err = new Error(`命令失败：${cmd} ${args.join(' ')}\n${output}`)
    err.exitCode = exitCode
    throw err
  }

  return output
}

const spawnServer = (cmd, args, options = {}) => {
  const child = spawn(cmd, args, {
    ...options,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let output = ''
  const onData = (buf) => {
    output += buf.toString('utf-8')
    if (output.length > 20000) output = output.slice(-20000)
  }
  child.stdout.on('data', onData)
  child.stderr.on('data', onData)

  const exited = { value: false }
  child.once('exit', () => {
    exited.value = true
  })

  return {
    child,
    exited,
    getOutput: () => output,
  }
}

const terminateProcess = async (child, exited, { graceMs = 2000 } = {}) => {
  if (exited.value) return

  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    return
  }

  const exitedWithinGrace = await Promise.race([
    new Promise((resolve) => child.once('exit', () => resolve(true))),
    delay(graceMs).then(() => false),
  ])

  if (exitedWithinGrace) return

  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch {
    return
  }

  await Promise.race([
    new Promise((resolve) => child.once('exit', () => resolve(true))),
    delay(2000).then(() => false),
  ])
}

const waitForServer = async (baseUrl, timeoutMs) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(baseUrl, { redirect: 'manual' })
      if (res.ok || (res.status >= 300 && res.status < 400)) return
    } catch {
      // ignore
    }
    await delay(100)
  }
  throw new Error(`preview 服务未就绪：${baseUrl}`)
}

const parseMsFromText = (text, label) => {
  if (!text) throw new Error(`缺少 ${label} 文本`)
  const m = text.match(/(\d+)/)
  if (!m) throw new Error(`无法解析 ${label}：${text}`)
  return Number(m[1])
}

const readBudgetMetrics = async (page) => {
  const inputText = (await page.locator('text=/^inputReadyMs:/' ).first().textContent())?.trim()
  const typeText = (await page.locator('text=/^typeSense: ready/' ).first().textContent())?.trim()
  return {
    inputReadyMs: parseMsFromText(inputText, 'inputReadyMs'),
    typeSenseReadyMs: parseMsFromText(typeText, 'typeSenseReadyMs'),
  }
}

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

const assertBudget = (metrics, label) => {
  const violations = []
  if (metrics.inputReadyMs > 500) violations.push(`${label} inputReadyMs ${metrics.inputReadyMs}ms > 500ms`)
  if (metrics.typeSenseReadyMs > 3000) violations.push(`${label} typeSenseReadyMs ${metrics.typeSenseReadyMs}ms > 3000ms`)
  if (violations.length) {
    const err = new Error(`NFR-001 预算超标：\n${violations.join('\n')}`)
    err.metrics = metrics
    throw err
  }
}

const measureMarkerLatency = async (page, { uri, code, matcher, maxWaitMs = 2000 }) => {
  return await page.evaluate(
    async ({ uri, code, matcher, maxWaitMs }) => {
      const monaco = globalThis.__LOGIX_MONACO__
      if (!monaco) throw new Error('缺少 globalThis.__LOGIX_MONACO__（无法进行 e2e marker 探测）')

      const resource = monaco.Uri.parse(uri)
      const model = monaco.editor.getModel(resource)
      if (!model) throw new Error(`找不到 model：${uri}`)

      const original = model.getValue()
      model.setValue(code)

      const startedAt = performance.now()

      const matches = (marker) => {
        if (matcher && typeof matcher.code === 'number') {
          const v = marker?.code
          return Number(v) === matcher.code
        }
        if (matcher && typeof matcher.messageIncludes === 'string') {
          return String(marker?.message ?? '').includes(matcher.messageIncludes)
        }
        return true
      }

      try {
        while (performance.now() - startedAt < maxWaitMs) {
          const markers = monaco.editor.getModelMarkers({ resource })
          const hit = markers.find(matches)
          if (hit) {
            return {
              firstMarkerMs: Math.max(0, Math.round(performance.now() - startedAt)),
              marker: {
                message: hit.message,
                code: hit.code,
                startLineNumber: hit.startLineNumber,
                startColumn: hit.startColumn,
                endLineNumber: hit.endLineNumber,
                endColumn: hit.endColumn,
              },
            }
          }
          await new Promise((r) => setTimeout(r, 25))
        }
        throw new Error(`未在 ${maxWaitMs}ms 内等到匹配的诊断 marker`)
      } finally {
        model.setValue(original)
      }
    },
    { uri, code, matcher, maxWaitMs },
  )
}

const runGcIfAvailable = async (page) => {
  await page.evaluate(() => {
    try {
      if (typeof globalThis.gc === 'function') globalThis.gc()
    } catch {
      // ignore
    }
  })
}

const runCdpGcIfAvailable = async (cdp) => {
  try {
    await cdp.send('HeapProfiler.collectGarbage')
  } catch {
    // ignore
  }
}

const getHeapUsedBytes = async (cdp) => {
  const result = await cdp.send('Performance.getMetrics')
  const entry = Array.isArray(result?.metrics) ? result.metrics.find((m) => m?.name === 'JSHeapUsedSize') : undefined
  return typeof entry?.value === 'number' ? entry.value : 0
}

const main = async (args) => {
  const baseUrl = `http://${HOST}:${args.port}`

  if (!args.noBuild) {
    await runCommand('pnpm', ['-C', 'examples/logix-sandbox-mvp', 'build'])
  }

  const server = spawnServer(
    'pnpm',
    ['-C', 'examples/logix-sandbox-mvp', 'preview', '--', '--host', HOST, '--port', String(args.port), '--strictPort'],
    { env: { ...process.env, BROWSER: 'none' } },
  )

  const report = {
    ok: false,
    baseUrl,
    budgets: {},
    diagnostics: {},
    memory: {},
  }

  try {
    await waitForServer(baseUrl + '/', 15_000)

    const { chromium } = require('playwright')
    const browser = await chromium.launch({
      headless: true,
      args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
    })

    try {
      const page = await browser.newPage()
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Performance.enable')

      await page.goto(baseUrl + '/playground', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('text=typeSense: ready', { timeout: 20_000 })
      const playgroundBudget = await readBudgetMetrics(page)
      assertBudget(playgroundBudget, '/playground(cold)')
      report.budgets.playground = playgroundBudget

      const playgroundUri = 'file:///playground.tsx'

      const typeError = await measureMarkerLatency(page, {
        uri: playgroundUri,
        code: `const a: number = 'oops'\n`,
        matcher: { code: 2322 },
        maxWaitMs: 2000,
      })
      report.diagnostics.typeError = typeError
      if (typeError.firstMarkerMs > 1000) {
        throw new Error(`SC-003 超标：type error 诊断 ${typeError.firstMarkerMs}ms > 1000ms`)
      }

      const noDom = await measureMarkerLatency(page, {
        uri: playgroundUri,
        code: `document.body\n`,
        matcher: { messageIncludes: 'document' },
        maxWaitMs: 2000,
      })
      report.diagnostics.noDom = noDom

      await page.getByTestId('nav-ir').click()
      await page.waitForURL('**/ir')
      await page.waitForSelector('text=typeSense: ready', { timeout: 20_000 })
      const irBudget = await readBudgetMetrics(page)
      assertBudget(irBudget, '/ir(warm)')
      report.budgets.ir = irBudget

      // SC-004：在同一 session 内 20 次切换，heap 不持续单调增长
      const navSessionId = String(Math.random())
      await page.evaluate((id) => {
        globalThis.__LOGIX_NAV_SESSION__ = id
      }, navSessionId)

      const ensureSameSession = async () => {
        const ok = await page.evaluate((id) => globalThis.__LOGIX_NAV_SESSION__ === id, navSessionId)
        if (!ok) throw new Error('检测到页面 reload（SC-004 需要 SPA 路由切换而非整页刷新）')
      }

      await page.getByTestId('nav-playground').click()
      await page.waitForURL('**/playground')
      await page.waitForSelector('text=typeSense: ready', { timeout: 20_000 })
      await ensureSameSession()

      await runCdpGcIfAvailable(cdp)
      await runGcIfAvailable(page)
      await delay(50)
      const baselineHeap = await getHeapUsedBytes(cdp)
      const heaps = []

      let onPlayground = true
      for (let i = 0; i < 20; i += 1) {
        if (onPlayground) {
          await page.getByTestId('nav-ir').click()
          await page.waitForURL('**/ir')
          onPlayground = false
        } else {
          await page.getByTestId('nav-playground').click()
          await page.waitForURL('**/playground')
          onPlayground = true
        }

        await page.waitForSelector('text=typeSense: ready', { timeout: 20_000 })
        await ensureSameSession()

        await runCdpGcIfAvailable(cdp)
        await runGcIfAvailable(page)
        await delay(50)
        heaps.push(await getHeapUsedBytes(cdp))
      }

      const toleranceBytes = 256 * 1024
      const monotonicIncreasing = heaps.every((v, i) => i === 0 || v > heaps[i - 1] + toleranceBytes)
      const maxHeap = Math.max(...heaps)
      const maxIncrease = maxHeap - baselineHeap

      report.memory = {
        baselineHeapBytes: baselineHeap,
        baselineHeap: formatBytes(baselineHeap),
        heapsBytes: heaps,
        maxHeapBytes: maxHeap,
        maxHeap: formatBytes(maxHeap),
        maxIncreaseBytes: maxIncrease,
        maxIncrease: formatBytes(maxIncrease),
        monotonicIncreasing,
      }

      if (monotonicIncreasing && maxIncrease > 5 * 1024 * 1024) {
        throw new Error(`SC-004 失败：heap 在 20 次切换中呈持续单调增长（maxIncrease=${formatBytes(maxIncrease)}）`)
      }

      if (maxIncrease > 30 * 1024 * 1024 && maxHeap > baselineHeap * 1.5) {
        throw new Error(`SC-004 失败：heap 增长过大（maxIncrease=${formatBytes(maxIncrease)}）`)
      }

      report.ok = true
      console.log(JSON.stringify(report, null, 2))
    } finally {
      await browser.close()
    }
  } catch (e) {
    const err = new Error(toErrorString(e) + '\n\npreview-tail:\n' + server.getOutput())
    err.report = report
    console.error(err.message)
    if (report && typeof report === 'object') {
      try {
        console.error('partial-report=' + JSON.stringify(report, null, 2))
      } catch {
        // ignore
      }
    }
    process.exitCode = 1
  } finally {
    await terminateProcess(server.child, server.exited)
  }
}

const timeoutPromise = (timeoutMs) =>
  new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error(`超时：${timeoutMs}ms`)), timeoutMs)
    if (typeof timer.unref === 'function') timer.unref()
  })

const args = parseArgs(process.argv.slice(2))
Promise.race([main(args), timeoutPromise(args.timeoutMs)]).catch((e) => {
  console.error(toErrorString(e))
  process.exitCode = 1
})
