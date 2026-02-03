import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { resolveCliConfigArgvPrefix } from '../../src/internal/cliConfig.js'

describe('args: logix.cli.json error paths', () => {
  it('should fail when --profile is set but no config file is found', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-config-missing-'))
    const cwd = process.cwd()
    process.chdir(tmp)
    try {
      await expect(
        Effect.runPromise(resolveCliConfigArgvPrefix(['trialrun', '--runId', 'r1', '--profile', 'ci'])),
      ).rejects.toThrow(/未找到配置文件|profile/i)
    } finally {
      process.chdir(cwd)
    }
  })

  it('should fail when --cliConfig points to a missing file', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-config-missing-file-'))
    const cwd = process.cwd()
    process.chdir(tmp)
    try {
      await expect(
        Effect.runPromise(resolveCliConfigArgvPrefix(['trialrun', '--runId', 'r1', '--cliConfig', './missing.json'])),
      ).rejects.toThrow(/不存在|missing/i)
    } finally {
      process.chdir(cwd)
    }
  })

  it('should find logix.cli.json from parent directories', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-config-findup-'))
    const parent = path.join(tmp, 'repo')
    const child = path.join(parent, 'a', 'b')
    await fs.mkdir(child, { recursive: true })

    const configFile = path.join(parent, 'logix.cli.json')
    await fs.writeFile(
      configFile,
      JSON.stringify({ schemaVersion: 1, defaults: { timeout: 1234 } }, null, 2),
      'utf8',
    )

    const cwd = process.cwd()
    process.chdir(child)
    try {
      const prefix = await Effect.runPromise(resolveCliConfigArgvPrefix(['trialrun', '--runId', 'r1']))
      expect(prefix).toContain('--timeout')
      expect(prefix).toContain('1234')
    } finally {
      process.chdir(cwd)
    }
  })
})

