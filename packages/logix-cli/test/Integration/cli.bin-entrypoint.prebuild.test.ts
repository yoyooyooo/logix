import { constants as fsConstants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

type CliPackageJson = {
  readonly bin?: Record<string, string>
}

const packageDir = path.resolve(__dirname, '../..')
const packageJsonPath = path.join(packageDir, 'package.json')

describe('logix-cli integration (bin entrypoint prebuild)', () => {
  it('keeps bin targets resolvable before dist build', async () => {
    const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as CliPackageJson

    const expectedBinTargets = ['bin/logix.mjs', 'bin/logix-devserver.mjs']
    expect(pkg.bin?.logix).toBe(expectedBinTargets[0])
    expect(pkg.bin?.['logix-devserver']).toBe(expectedBinTargets[1])

    for (const relativePath of expectedBinTargets) {
      const absolutePath = path.resolve(packageDir, relativePath)
      await fs.access(absolutePath, fsConstants.R_OK)
      const source = await fs.readFile(absolutePath, 'utf8')
      expect(source.startsWith('#!/usr/bin/env node')).toBe(true)
    }
  })
})
