import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const sourceFiles = [
  'src/Playground.tsx',
  'src/Project.ts',
  'src/index.ts',
  'src/internal/action/actionManifest.ts',
  'src/internal/components/ActionManifestPanel.tsx',
  'src/internal/components/DriverPanel.tsx',
  'src/internal/components/PlaygroundShell.tsx',
  'src/internal/components/RawDispatchPanel.tsx',
  'src/internal/components/RuntimeInspector.tsx',
  'src/internal/components/WorkbenchBottomPanel.tsx',
  'src/internal/summary/workbenchProjection.ts',
]

const forbiddenProductAuthorityTokens = [
  'deriveActionManifestFromSnapshot',
  'deriveFallbackActionManifestFromSnapshot',
  'fallback-source-regex',
  'actionsBlockPattern',
  'actionEntryPattern',
]

describe('source regex action authority sweep', () => {
  it('keeps source-regex discovery out of playground product source paths', () => {
    const hits = sourceFiles.flatMap((relativePath) => {
      const text = readFileSync(path.join(packageRoot, relativePath), 'utf8')
      return forbiddenProductAuthorityTokens.flatMap((token) =>
        text.includes(token) ? [`${relativePath}: ${token}`] : [],
      )
    })

    expect(hits).toEqual([])
  })
})
