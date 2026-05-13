import { strict as assert } from 'node:assert'
import { AddressInfo } from 'node:net'
import { chromium, type Browser, type Page } from 'playwright'
import { createServer } from 'vite'
import { waitForFileTreePath } from './playground-proof-context'

const root = new URL('../..', import.meta.url).pathname
const route = '/playground/logix-react.live-bridge'
const viewport = { width: 1366, height: 768 }

async function main() {
  const server = await createServer({
    root,
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
    },
    configFile: new URL('../../vite.config.ts', import.meta.url).pathname,
  })
  let browser: Browser | undefined

  try {
    await server.listen()
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport })
    await assertLiveBridgeDogfood(page, getServerUrl(server))
    console.log('live bridge dogfood Playwright contract passed')
  } finally {
    await browser?.close()
    await server.close()
  }
}

function getServerUrl(server: Awaited<ReturnType<typeof createServer>>): string {
  const address = server.httpServer?.address()
  assert(address && typeof address !== 'string', 'Vite dev server did not expose a TCP address')
  return `http://127.0.0.1:${(address as AddressInfo).port}`
}

async function assertLiveBridgeDogfood(page: Page, baseUrl: string): Promise<void> {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
  await page.getByText('Logix Playground').waitFor({ state: 'visible' })
  await page.getByLabel('Playground project').getByText('live-bridge').waitFor({ state: 'visible' })
  await waitForFileTreePath(page, '/src/main.program.ts', 'live bridge program entry')

  await page.locator('[data-playground-region="top-command-bar"]').getByRole('button', { name: 'Run', exact: true }).click()
  const result = page.getByRole('region', { name: 'Program result' }).getByLabel('Run result')
  await result.waitFor({ state: 'visible' })
  await result.getByText('runtime:example-runtime/module:LiveBridgeFixture/instance:default').waitFor({ state: 'visible' })
  await result.getByText('live-evidence:example-runtime').waitFor({ state: 'visible' })
  await result.getByText('operation.denied').waitFor({ state: 'visible' })

  const text = await result.textContent()
  assert(text?.includes('CanonicalEvidencePackage'), 'live bridge route should export canonical evidence package shape')
  assert(!text?.includes('repairHints'), 'Live dogfood output must not contain repair hints')
  assert(!text?.includes('nextRecommendedStage'), 'Live dogfood output must not contain verification scheduling')
  assert(!text?.includes('"verdict"'), 'Live dogfood output must not contain verification verdict')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
