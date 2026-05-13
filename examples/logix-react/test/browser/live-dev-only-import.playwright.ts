import { strict as assert } from 'node:assert'
import { mkdtemp, rm } from 'node:fs/promises'
import { AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'

import { chromium, type Browser } from 'playwright'
import { createServer, type ViteDevServer } from 'vite'
import { requestLiveDaemon } from '../../../../packages/logix-cli/src/internal/liveDaemonClient'
import { createLiveDaemonServer } from '../../../../packages/logix-cli/src/internal/liveDaemonServer'

const root = new URL('../fixtures/live-dev-only-import', import.meta.url).pathname
const viewport = { width: 800, height: 480 }

async function main() {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-import-carrier-'))
  const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
  process.env.VITE_LOGIX_LIVE_PORT = String(daemon.port)
  process.env.VITE_LOGIX_LIVE_PROJECT_ID = 'examples/logix-react:dev-only-import'

  const server = await createServer({
    root,
    server: { host: '127.0.0.1', port: 0, strictPort: false },
    define: {
      'import.meta.env.VITE_LOGIX_LIVE_PORT': JSON.stringify(String(daemon.port)),
      'import.meta.env.VITE_LOGIX_LIVE_HOST': JSON.stringify('127.0.0.1'),
      'import.meta.env.VITE_LOGIX_LIVE_PROJECT_ID': JSON.stringify('examples/logix-react:dev-only-import'),
    },
    resolve: {
      alias: [
        { find: /^@logixjs\/react\/dev\/live$/, replacement: new URL('../../../../packages/logix-react/src/dev/live.ts', import.meta.url).pathname },
        { find: /^@logixjs\/react\/dev\/lifecycle$/, replacement: new URL('../../../../packages/logix-react/src/dev/lifecycle.ts', import.meta.url).pathname },
        { find: /^@logixjs\/react$/, replacement: new URL('../../../../packages/logix-react/src/index.ts', import.meta.url).pathname },
      ],
    },
    optimizeDeps: { exclude: ['@logixjs/react'] },
  })
  let browser: Browser | undefined

  try {
    await server.listen()
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport })
    const browserEvents: string[] = []
    page.on('console', (message) => {
      browserEvents.push(`console:${message.type()}:${message.text()}`)
    })
    page.on('pageerror', (error) => {
      browserEvents.push(`pageerror:${error.message}`)
    })
    await page.goto(getServerUrl(server), { waitUntil: 'networkidle' })
    await page.getByText('live dev-only import').waitFor({ state: 'visible' })
    await page.waitForTimeout(500)

    const status = await requestLiveDaemon(daemon.paths, { type: 'status' })
    assert(status.ok, 'daemon status response should be ok')
    assert.equal(
      status.data.attachments?.filter((attachment) => attachment.attachmentId.startsWith('browser:')).length,
      1,
      `expected one browser attachment: ${JSON.stringify(status)} browserEvents=${JSON.stringify(browserEvents)}`,
    )

    console.log('live dev-only import carrier Playwright contract passed')
  } finally {
    await browser?.close()
    await server.close()
    await daemon.stop()
    await rm(stateDir, { recursive: true, force: true })
  }
}

function getServerUrl(server: ViteDevServer): string {
  const address = server.httpServer?.address()
  assert(address && typeof address !== 'string', 'Vite dev server did not expose a TCP address')
  return `http://127.0.0.1:${(address as AddressInfo).port}`
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
