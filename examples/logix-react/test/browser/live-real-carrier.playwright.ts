import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'

import { chromium, type Browser } from 'playwright'
import { createServer, type ViteDevServer } from 'vite'

const root = new URL('../..', import.meta.url).pathname
const repoRoot = new URL('../../../..', import.meta.url).pathname
const route = '/playground/logix-react.live-bridge'
const viewport = { width: 1366, height: 768 }
const devServerHost = 'localhost'
const devServerPort = 5173
const demoBaseUrl = `http://${devServerHost}:${devServerPort}`

type LiveCommandResult = {
  readonly schemaVersion: 1
  readonly kind: 'LiveCommandResult'
  readonly ok: boolean
  readonly runId: string
  readonly command: string
  readonly inputCoordinate: LiveInputCoordinate
  readonly primaryLiveOutputKey: string
  readonly artifacts: ReadonlyArray<LiveArtifactOutput>
}

type LiveInputCoordinate = {
  readonly command: 'live'
  readonly task: string
  readonly runId: string
  readonly target?: string
  readonly attachmentId?: string
  readonly action?: string
  readonly cursor?: string
  readonly limit?: number
}

type LiveArtifactOutput<TInline = unknown> = {
  readonly outputKey: string
  readonly kind: string
  readonly ok: boolean
  readonly inline?: TInline
}

type LiveAttachmentView = {
  readonly attachmentId: string
  readonly state: string
}

type LiveStatusInline = {
  readonly state?: string
  readonly websocket?: {
    readonly port?: number
  }
  readonly attachments?: ReadonlyArray<LiveAttachmentView>
}

type LiveTargetView = {
  readonly attachmentId: string
  readonly runtimeId: string
  readonly moduleId: string
  readonly instanceId: string
}

type LiveTargetsInline = {
  readonly targets?: ReadonlyArray<LiveTargetView>
}

type LiveTimelineInline = {
  readonly section?: string
  readonly facet?: {
    readonly payload?: {
      readonly timeline?: {
        readonly cursor?: {
          readonly next?: string
        }
        readonly items?: ReadonlyArray<{
          readonly eventKind: string
        }>
        readonly gaps?: ReadonlyArray<{
          readonly code?: string
        }>
      }
    }
  }
}

type LiveOperationFacetInline = {
  readonly kind?: string
}

type LiveCaptureInline = {
  readonly artifactRef?: {
    readonly file?: string
  }
}

type CanonicalEvidencePackageInline = {
  readonly artifacts?: ReadonlyArray<{
    readonly outputKey?: string
  }>
}

async function waitFor<T>(
  read: () => Promise<T | undefined>,
  predicate: (value: T | undefined) => boolean,
  timeoutMs = 8000,
  describeLast?: (value: T | undefined) => string,
): Promise<T> {
  const startedAt = Date.now()
  let lastValue: T | undefined
  for (;;) {
    const value = await read()
    lastValue = value
    if (predicate(value)) return value as T
    if (Date.now() - startedAt > timeoutMs) {
      const detail = describeLast ? ` last=${describeLast(lastValue)}` : ''
      throw new Error(`waitFor timed out after ${timeoutMs}ms${detail}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

async function main() {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-real-carrier-'))
  const previousLiveHost = process.env.LOGIX_LIVE_HOST
  const previousLivePort = process.env.LOGIX_LIVE_PORT
  const previousLiveProjectId = process.env.LOGIX_LIVE_PROJECT_ID
  const existingBaseUrl = await probeExistingDemoServer()
  const ownsDaemon = !existingBaseUrl
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    LOGIX_LIVE_PROJECT_ID: 'examples/logix-react',
    VITE_LOGIX_LIVE_PROJECT_ID: 'examples/logix-react',
    ...(ownsDaemon
      ? {
          LOGIX_LIVE_STATE_DIR: stateDir,
          LOGIX_LIVE_HOST: '127.0.0.1',
          LOGIX_LIVE_PORT: '0',
        }
      : null),
  }
  if (ownsDaemon) {
    const start = runCli(['live', 'start', '--runId', 'live-real-carrier-start'], env)
    const startStatus = primaryArtifact<LiveStatusInline>(start)
    const daemonPort = startStatus.inline?.websocket?.port
    assert.equal(startStatus.kind, 'LiveStatus', `expected live start status: ${JSON.stringify(start)}`)
    assert.equal(startStatus.inline?.state, 'ready', `expected daemon ready: ${JSON.stringify(start)}`)
    assert.equal(typeof daemonPort, 'number', `expected daemon websocket port: ${JSON.stringify(start)}`)
    env.LOGIX_LIVE_PORT = String(daemonPort)
    env.VITE_LOGIX_LIVE_HOST = '127.0.0.1'
    env.VITE_LOGIX_LIVE_PORT = String(daemonPort)
    process.env.LOGIX_LIVE_HOST = '127.0.0.1'
    process.env.LOGIX_LIVE_PORT = String(daemonPort)
    process.env.LOGIX_LIVE_PROJECT_ID = 'examples/logix-react'
  }

  let server: ViteDevServer | undefined
  if (!existingBaseUrl) {
    server = await createServer({
      root,
      server: { host: devServerHost, port: devServerPort, strictPort: true },
      configFile: new URL('../../vite.config.ts', import.meta.url).pathname,
    })
  }
  let browser: Browser | undefined

  try {
    await server?.listen()
    browser = await chromium.launch({ headless: true })
    const pageA = await browser.newPage({ viewport })
    const pageB = await browser.newPage({ viewport })
    const browserEvents: string[] = []
    for (const [label, page] of [
      ['pageA', pageA],
      ['pageB', pageB],
    ] as const) {
      page.on('console', (message) => {
        browserEvents.push(`${label}:console:${message.type()}:${message.text()}`)
      })
      page.on('pageerror', (error) => {
        browserEvents.push(`${label}:pageerror:${error.message}`)
      })
      page.on('requestfailed', (request) => {
        browserEvents.push(`${label}:requestfailed:${request.url()}:${request.failure()?.errorText ?? 'unknown'}`)
      })
    }
    const baseUrl = existingBaseUrl ?? getServerUrl(server)
    await Promise.all([
      pageA.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' }),
      pageB.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' }),
    ])
    await pageA.getByText('Logix Playground').waitFor({ state: 'visible' })
    await pageB.getByText('Logix Playground').waitFor({ state: 'visible' })
    await pageA.waitForTimeout(500)

    const statusBeforeClose = await waitFor(
      async () => runCli(['live', 'status', '--runId', `live-real-carrier-status-${Date.now()}`], env),
      (response) => {
        if (!response) return false
        const status = primaryArtifact<LiveStatusInline>(response).inline
        return (
          Boolean(
            status?.attachments?.filter(
              (attachment) => attachment.attachmentId.startsWith('browser:') && attachment.state === 'attached',
            ).length === 2,
          )
        )
      },
      20000,
      (response) => `${JSON.stringify(response)} browserEvents=${JSON.stringify(browserEvents.slice(-12))}`,
    )
    assert(statusBeforeClose.ok, 'CLI live status should be ok')
    const statusInline = primaryArtifact<LiveStatusInline>(statusBeforeClose).inline
    assert(statusInline, `expected live status inline payload: ${JSON.stringify(statusBeforeClose)}`)
    assert.equal(
      statusInline.attachments?.filter(
        (attachment) => attachment.attachmentId.startsWith('browser:') && attachment.state === 'attached',
      ).length,
      2,
      `expected two browser attachments: ${JSON.stringify(statusBeforeClose)}`,
    )

    const targets = await waitFor(
      async () => runCli(['live', 'targets', '--runId', `live-real-carrier-targets-${Date.now()}`, '--tree'], env),
      (response) => Boolean(response?.ok && (primaryArtifact<LiveTargetsInline>(response).inline?.targets?.length ?? 0) > 0),
      8000,
      (response) => `${JSON.stringify(response)} browserEvents=${JSON.stringify(browserEvents.slice(-12))}`,
    )
    assert(targets.ok, 'CLI live targets should be ok')
    const selectedTarget = primaryArtifact<LiveTargetsInline>(targets).inline?.targets?.find((target) => typeof target.runtimeId === 'string' && target.runtimeId.length > 0)
    assert(selectedTarget, `expected a runtime-semantic target row: ${JSON.stringify(targets)}`)
    const targetRef = `runtime:${selectedTarget.runtimeId}/module:${selectedTarget.moduleId}/instance:${selectedTarget.instanceId}`

    const emptyTimeline = runCli([
      'live',
      'timeline',
      '--runId',
      'live-real-carrier-timeline-empty',
      '--target',
      targetRef,
      '--attachment',
      selectedTarget.attachmentId,
      '--limit',
      '1',
    ], env)
    const emptyTimelineArtifact = primaryArtifact<LiveTimelineInline>(emptyTimeline)
    assert.equal(emptyTimelineArtifact.kind, 'LiveInspectArtifact', `expected timeline inspect artifact: ${JSON.stringify(emptyTimeline)}`)
    assert.equal(emptyTimelineArtifact.inline?.section, 'timeline', `expected timeline section: ${JSON.stringify(emptyTimeline)}`)
    assert.equal(
      emptyTimelineArtifact.inline?.facet?.payload?.timeline?.gaps?.[0]?.code,
      'missing-operation-window',
      `empty runtime timeline should be a machine-readable gap: ${JSON.stringify(emptyTimeline)}`,
    )

    const dispatch = runCli([
      'live',
      'dispatch',
      '--runId',
      'live-real-carrier-dispatch',
      '--target',
      targetRef,
      '--attachment',
      selectedTarget.attachmentId,
      '--action',
      'missing-action',
    ], env)
    const dispatchArtifact = primaryArtifact<LiveOperationFacetInline>(dispatch)
    assert.equal(dispatchArtifact.kind, 'LiveOperationFacet', `expected dispatch operation facet: ${JSON.stringify(dispatch)}`)
    assert.equal(dispatchArtifact.inline?.kind, 'operation.denied', `expected denied dispatch facet: ${JSON.stringify(dispatch)}`)

    const firstTimeline = runCli([
      'live',
      'timeline',
      '--runId',
      'live-real-carrier-timeline-first',
      '--target',
      targetRef,
      '--attachment',
      selectedTarget.attachmentId,
      '--limit',
      '1',
    ], env)
    const firstTimelineInline = primaryArtifact<LiveTimelineInline>(firstTimeline).inline
    const firstTimelineValue = firstTimelineInline?.facet?.payload?.timeline
    const firstCursor = firstTimelineValue?.cursor?.next
    assert.equal(firstTimelineInline?.section, 'timeline', `expected timeline section: ${JSON.stringify(firstTimeline)}`)
    assert(typeof firstTimelineValue === 'object' && firstTimelineValue !== null, `expected timeline payload: ${JSON.stringify(firstTimeline)}`)
    assert(typeof firstCursor === 'string', `expected cursor.next from first timeline: ${JSON.stringify(firstTimeline)}`)
    assert.deepEqual(
      firstTimelineValue.items?.map((item) => item.eventKind),
      ['operation.denied'],
      `expected first timeline to expose denied operation event: ${JSON.stringify(firstTimeline)}`,
    )

    const secondDispatch = runCli([
      'live',
      'dispatch',
      '--runId',
      'live-real-carrier-dispatch-second',
      '--target',
      targetRef,
      '--attachment',
      selectedTarget.attachmentId,
      '--action',
      'missing-action',
    ], env)
    assert.equal(primaryArtifact<LiveOperationFacetInline>(secondDispatch).inline?.kind, 'operation.denied', `expected second denied dispatch facet: ${JSON.stringify(secondDispatch)}`)

    const continuedTimeline = runCli([
      'live',
      'timeline',
      '--runId',
      'live-real-carrier-timeline-continued',
      '--target',
      targetRef,
      '--attachment',
      selectedTarget.attachmentId,
      '--limit',
      '2',
      '--cursor',
      firstCursor,
    ], env)
    const continuedTimelineArtifact = primaryArtifact<LiveTimelineInline>(continuedTimeline)
    const continuedTimelineValue = continuedTimelineArtifact.inline?.facet?.payload?.timeline
    assert.equal(continuedTimelineArtifact.kind, 'LiveInspectArtifact', `expected continued timeline artifact: ${JSON.stringify(continuedTimeline)}`)
    assert.equal(continuedTimeline.inputCoordinate.cursor, firstCursor, `CLI coordinate should retain opaque cursor: ${JSON.stringify(continuedTimeline)}`)
    assert.deepEqual(
      continuedTimelineValue?.items?.map((item) => item.eventKind),
      ['operation.denied'],
      `cursor continuation should only return events after the cursor: ${JSON.stringify(continuedTimeline)}`,
    )

    const capture = runCli([
      'live',
      'capture',
      '--runId',
      'live-real-carrier-capture',
      '--target',
      targetRef,
      '--attachment',
      selectedTarget.attachmentId,
      '--window',
      '500ms',
    ], env)
    const captureArtifact = primaryArtifact<LiveCaptureInline>(capture)
    assert.equal(captureArtifact.outputKey, 'live-capture:event-window', `expected event-window capture: ${JSON.stringify(capture)}`)
    const captureRef = captureArtifact.inline?.artifactRef?.file
    assert(typeof captureRef === 'string', `expected daemon lineage ref from capture: ${JSON.stringify(capture)}`)

    const exported = runCli(['live', 'export', 'evidence', '--runId', 'live-real-carrier-export', '--from', captureRef], env)
    const exportedArtifact = primaryArtifact<CanonicalEvidencePackageInline>(exported)
    assert.equal(exportedArtifact.kind, 'CanonicalEvidencePackage', `expected canonical evidence package: ${JSON.stringify(exported)}`)
    assert.equal(
      exportedArtifact.inline?.artifacts?.[0]?.outputKey,
      'live-capture:event-window',
      `expected exported package to reuse real capture artifact: ${JSON.stringify(exported)}`,
    )

    await pageB.close()
    await pageA.waitForTimeout(500)
    const status = runCli(['live', 'status', '--runId', 'live-real-carrier-status-after-close'], env)
    assert(status.ok, 'daemon status response should be ok')
    assert(
      primaryArtifact<LiveStatusInline>(status).inline?.attachments?.some((attachment) => attachment.state === 'disconnected'),
      `expected a disconnected attachment after tab close: ${JSON.stringify(status)}`,
    )

    console.log('live real carrier Playwright contract passed')
  } finally {
    await browser?.close()
    await server?.close()
    try {
      if (ownsDaemon) runCli(['live', 'stop', '--runId', 'live-real-carrier-stop'], env)
    } catch {
      // best-effort local daemon cleanup; the test assertion path already captured CLI gaps.
    }
    await rm(stateDir, { recursive: true, force: true })
    restoreEnv('LOGIX_LIVE_HOST', previousLiveHost)
    restoreEnv('LOGIX_LIVE_PORT', previousLivePort)
    restoreEnv('LOGIX_LIVE_PROJECT_ID', previousLiveProjectId)
  }
}

function getServerUrl(server: ViteDevServer | undefined): string {
  assert(server, 'Vite dev server should be owned when no external 5173 server exists')
  const address = server.httpServer?.address()
  assert(address && typeof address !== 'string', 'Vite dev server did not expose a TCP address')
  return `http://${devServerHost}:${(address as AddressInfo).port}`
}

function primaryArtifact<TInline = unknown>(result: LiveCommandResult): LiveArtifactOutput<TInline> {
  const artifact = result.artifacts.find((item) => item.outputKey === result.primaryLiveOutputKey)
  assert(artifact, `missing primary live artifact: ${JSON.stringify(result)}`)
  return artifact as LiveArtifactOutput<TInline>
}

function runCli(args: ReadonlyArray<string>, env: NodeJS.ProcessEnv): LiveCommandResult {
  const child = spawnSync('pnpm', ['--silent', 'cli', ...args], {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  assert.equal(child.status, 0, `pnpm cli failed: ${JSON.stringify({ args, stdout: child.stdout, stderr: child.stderr })}`)
  assert.equal(child.stderr.trim(), '', `pnpm cli should not write stderr: ${child.stderr}`)
  const parsed = JSON.parse(child.stdout) as LiveCommandResult
  assert.equal(parsed.kind, 'LiveCommandResult', `expected LiveCommandResult: ${child.stdout}`)
  return parsed
}

async function probeExistingDemoServer(): Promise<string | undefined> {
  const baseUrl = demoBaseUrl
  try {
    const response = await fetch(`${baseUrl}${route}`, { signal: AbortSignal.timeout(2000) })
    if (!response.ok) return undefined
    const html = await response.text()
    return html.includes('</html>') || html.includes('id="root"') ? baseUrl : undefined
  } catch {
    return undefined
  }
}

function restoreEnv(key: string, previous: string | undefined): void {
  if (previous === undefined) delete process.env[key]
  else process.env[key] = previous
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
