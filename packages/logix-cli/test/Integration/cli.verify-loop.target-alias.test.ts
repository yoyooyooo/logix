import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  resolveRuntimeGateCwd,
  resolveVerifyExecutionCwd,
  resolveVerifyTargetPath,
  runVerifyGateExecutor,
} from '../../src/internal/verify-loop/realGateExecutor.js'

describe('logix-cli integration (verify-loop target alias)', () => {
  it('resolves examples:real to examples/logix path', () => {
    const repoRoot = path.resolve(__dirname, '../../../..')
    const resolved = resolveVerifyTargetPath('examples:real', repoRoot)
    expect(resolved).toBe(path.resolve(repoRoot, 'examples/logix'))
  })

  it('uses target directory as real gate execution cwd', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-verify-target-cwd-'))
    const targetDir = path.join(tmp, 'pkg')
    await fs.mkdir(targetDir, { recursive: true })
    const nestedFile = path.join(targetDir, 'entry.ts')
    await fs.writeFile(nestedFile, 'export const ok = true\n', 'utf8')
    const repoRoot = path.resolve(__dirname, '../../../..')

    expect(resolveVerifyExecutionCwd(targetDir)).toBe(targetDir)
    expect(resolveVerifyExecutionCwd(nestedFile)).toBe(targetDir)
    expect(resolveRuntimeGateCwd({ targetPath: targetDir, repoRoot })).toBe(targetDir)
    expect(resolveRuntimeGateCwd({ targetPath: path.resolve(repoRoot, 'examples/logix'), repoRoot })).toBe(repoRoot)
  })

  it('maps transient real gate exit(75) to retryable status', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-verify-target-transient-'))
    await fs.writeFile(
      path.join(tmp, 'package.json'),
      JSON.stringify(
        {
          name: 'verify-target-transient',
          private: true,
          version: '0.0.0',
          scripts: {
            typecheck: 'node -e "process.exit(75)"',
          },
        },
        null,
        2,
      ),
      'utf8',
    )

    const results = runVerifyGateExecutor({
      scope: 'runtime',
      target: tmp,
    })

    expect(results[0]?.gate).toBe('gate:type')
    expect(results[0]?.status).toBe('retryable')
    expect(results[0]?.reasonCode).toBe('VERIFY_RETRYABLE')
    expect(results.slice(1).every((item) => item.status === 'skipped')).toBe(true)
  }, 20_000)
})
