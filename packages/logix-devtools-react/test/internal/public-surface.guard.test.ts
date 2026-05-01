import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const packageRoot = process.cwd()

const readText = (relativePath: string): string => fs.readFileSync(path.join(packageRoot, relativePath), 'utf8')

const readPackageJson = (): any => JSON.parse(readText('package.json'))

describe('@logixjs/devtools-react public surface', () => {
  it('keeps package root and internal subpaths closed', () => {
    const pkg = readPackageJson()

    expect(pkg.exports['.']).toBeNull()
    expect(pkg.exports['./internal/*']).toBeNull()
    expect(pkg.publishConfig.exports['.']).toBeNull()
    expect(pkg.publishConfig.exports['./internal/*']).toBeNull()
  })

  it('keeps root index empty', () => {
    expect(readText('src/index.tsx').trim()).toBe('export {}')
  })

  it('does not expose runtime devtools or inspect facades', () => {
    const srcFiles = [
      'src/index.tsx',
      'src/internal/ui/shell/LogixDevtools.tsx',
      'src/internal/ui/shell/LogixIsland.tsx',
    ]
      .map(readText)
      .join('\n')

    expect(srcFiles).not.toMatch(/\bRuntime\.devtools\b|\bruntime\.devtools\b/)
    expect(srcFiles).not.toMatch(/\bRuntime\.inspect\b|\bruntime\.inspect\b/)
  })
})
