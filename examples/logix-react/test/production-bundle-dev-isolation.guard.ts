import { strict as assert } from 'node:assert'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { build } from 'vite'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')

const forbiddenProductionCarrierMarkers = [
  '@logixjs/react/dev/live',
  '@logixjs/react/dev/lifecycle',
  '@logixjs/react/dev/vite',
  '@logixjs/react/dev/vitest',
  '@logixjs/react/dev-lifecycle-carrier',
  '@logixjs/react/dev-live-browser-adapter',
  '@logixjs/react/dev-live-browser-adapter-options',
  '@logixjs/react:dev-lifecycle',
  '@logixjs/react:vite-dev-lifecycle',
  '@logixjs/react:vitest-dev-lifecycle',
  'LogixDevLifecycle',
  'LogixDevLifecycleCarrier',
  'createLogixDevLifecycleCarrier',
  'getInstalledLogixDevLifecycleCarrier',
  'installLogixDevLifecycleCarrier',
  'clearInstalledLogixDevLifecycleCarrier',
  'installLogixDevLifecycleForVitest',
  'resetLogixDevLifecycleForVitest',
  'logixDevLifecycleVitePlugin',
  'logixReactDevLifecycle',
  'LogixLiveBrowserAdapter',
  'installLogixLiveBrowserAdapter',
  'clearInstalledLogixLiveBrowserAdapter',
  'configureLogixLiveBrowserAdapter',
  'logix:dev-lifecycle-bindings-changed',
  'browser:dev-live',
  'debug:dispatch',
] as const

const forbiddenInitialAssetMarkers = [
  'data-logix-playground-page',
  'data-playground-region',
  'playground-visual-shell',
  'monaco-source-editor',
  'monaco-editor',
  '@logixjs/playground/Playground',
  '@monaco-editor/loader',
  'MonacoEnvironment',
] as const

const forbiddenProductionAssetNames = [
  /^css\.worker-.*\.js$/,
  /^html\.worker-.*\.js$/,
  /^json\.worker-.*\.js$/,
] as const

async function collectProductionTextAssets(dir: string): Promise<ReadonlyArray<string>> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectProductionTextAssets(fullPath)))
      continue
    }

    if (/\.(?:html|js|mjs|cjs|css)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

function parseInitialAssetRefs(indexHtml: string): ReadonlyArray<string> {
  const refs = [
    ...Array.from(indexHtml.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g), (match) => match[1]),
    ...Array.from(indexHtml.matchAll(/<link\b[^>]*\bhref="([^"]+)"[^>]*>/g), (match) => match[1]),
  ]

  return refs
    .filter((ref): ref is string => typeof ref === 'string' && ref.length > 0)
    .filter((ref) => /\.(?:js|mjs|css)$/.test(ref))
    .map((ref) => ref.replace(/^\//, ''))
}

function resolveBuiltAsset(relativeRef: string): string {
  const resolved = path.resolve(dist, relativeRef)
  const relative = path.relative(dist, resolved)
  assert(
    relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative),
    `production entry asset must stay inside dist: ${relativeRef}`,
  )
  return resolved
}

async function main() {
  await build({
    root,
    configFile: path.join(root, 'vite.config.ts'),
    logLevel: 'warn',
  })

  const files = await collectProductionTextAssets(dist)
  const hits: string[] = []

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    for (const marker of forbiddenProductionCarrierMarkers) {
      if (source.includes(marker)) {
        hits.push(`${path.relative(root, file)} :: ${marker}`)
      }
    }
  }

  assert.equal(
    hits.length,
    0,
    `production bundle must not contain React dev/live/debug carrier markers:\n${hits.join('\n')}`,
  )

  const indexHtml = await readFile(path.join(dist, 'index.html'), 'utf8')
  const initialAssetRefs = parseInitialAssetRefs(indexHtml)
  const entryHits: string[] = []

  for (const assetRef of initialAssetRefs) {
    const source = await readFile(resolveBuiltAsset(assetRef), 'utf8')
    for (const marker of forbiddenInitialAssetMarkers) {
      if (source.includes(marker)) {
        entryHits.push(`${assetRef} :: ${marker}`)
      }
    }
  }

  assert.equal(
    entryHits.length,
    0,
    `production initial assets must not eagerly include Playground or Monaco markers:\n${entryHits.join('\n')}`,
  )

  const assetNames = await readdir(path.join(dist, 'assets'))
  const forbiddenAssets = assetNames.filter((name) =>
    forbiddenProductionAssetNames.some((pattern) => pattern.test(name)),
  )

  assert.equal(
    forbiddenAssets.length,
    0,
    `production bundle must not include non-core Monaco language workers:\n${forbiddenAssets.join('\n')}`,
  )

  console.log('production bundle dev isolation guard passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
