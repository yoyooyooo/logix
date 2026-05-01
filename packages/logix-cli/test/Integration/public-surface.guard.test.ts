import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { printHelp } from '../../src/internal/entry.js'

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const readText = (relativePath: string): string => fs.readFileSync(path.join(packageRoot, relativePath), 'utf8')
const readPackageJson = (): any => JSON.parse(readText('package.json'))

describe('@logixjs/cli public surface', () => {
  it('keeps the package root closed and exposes only the logix binary', () => {
    const pkg = readPackageJson()

    expect(Object.keys(pkg.bin ?? {})).toEqual(['logix'])
    expect(pkg.bin.logix).toBe('dist/logix.js')
    expect(pkg.exports).toEqual({
      './package.json': './package.json',
      './schema/commands.v1.json': './dist/schema/commands.v1.json',
      './internal/*': null,
    })
    expect(pkg.publishConfig.exports).toEqual({
      './package.json': './package.json',
      './schema/commands.v1.json': './dist/schema/commands.v1.json',
      './internal/*': null,
    })
    expect(readText('src/index.ts').trim()).toBe('export {}')
  })

  it('prints only check, trial, and compare in public help', () => {
    const help = printHelp()

    expect(help).toContain('logix check')
    expect(help).toContain('logix trial')
    expect(help).toContain('logix compare')
    expect(help).not.toMatch(/describe|--describe-json|ir export|ir validate|ir diff|contract-suite|transform module|trialrun|devserver/)
    expect(help).not.toMatch(/--mode report|--mode write|--ops/)
  })
})
