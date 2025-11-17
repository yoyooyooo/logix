import { describe, expect, it } from '@effect/vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('../../../../../', import.meta.url)))

const isCodeFile = (filePath: string): boolean =>
  /\.(?:ts|tsx|js|jsx|mts|cts)$/.test(filePath) && !filePath.endsWith('.d.ts')

const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  '.vite',
  '.source',
  '.agent',
  'public',
])

const walkFiles = (dirPath: string, out: Array<string>): void => {
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const full = resolve(dirPath, entry.name)
    if (entry.isDirectory()) {
      if (IGNORED_DIR_NAMES.has(entry.name)) continue
      walkFiles(full, out)
      continue
    }
    if (!entry.isFile()) continue
    if (isCodeFile(full)) out.push(full)
  }
}

const hasCoreNgImport = (source: string): boolean => {
  if (!source.includes('@logix/core-ng')) return false
  const patterns: ReadonlyArray<RegExp> = [
    /\bimport\s+[^;]*?\sfrom\s+['"]@logix\/core-ng['"]/,
    /\bimport\s+['"]@logix\/core-ng['"]/,
    /\bimport\(\s*['"]@logix\/core-ng['"]\s*\)/,
    /\brequire\(\s*['"]@logix\/core-ng['"]\s*\)/,
  ]
  return patterns.some((re) => re.test(source))
}

const isAllowed = (repoRelativePath: string): boolean =>
  repoRelativePath.startsWith('packages/logix-core-ng/') ||
  repoRelativePath === 'packages/logix-react/test/browser/perf-boundaries/harness.ts'

describe('contracts (048): forbid importing @logix/core-ng in consumers', () => {
  it('should not import @logix/core-ng outside allowlist', () => {
    const roots = ['packages', 'apps', 'examples', 'scripts'].map((p) => resolve(repoRoot, p))
    const files: Array<string> = []
    for (const root of roots) {
      try {
        if (statSync(root).isDirectory()) walkFiles(root, files)
      } catch {
        // ignore missing roots (repo may not have all of them)
      }
    }

    const offenders: Array<string> = []
    for (const filePath of files) {
      const rel = filePath
        .slice(repoRoot.length + 1)
        .split('\\')
        .join('/')
      if (isAllowed(rel)) continue
      const source = readFileSync(filePath, 'utf8')
      if (hasCoreNgImport(source)) offenders.push(rel)
    }

    expect(offenders).toEqual([])
  })
})
