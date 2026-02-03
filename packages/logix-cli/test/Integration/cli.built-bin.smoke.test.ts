import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

import { ensureCliBuilt } from '../helpers/ensureCliBuilt.js'

const execFileAsync = promisify(execFile)

const parseLastJsonLine = (stdout: string): unknown => {
  const lines = stdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const last = lines.at(-1)
  if (!last) throw new Error('expected JSON output on stdout')
  return JSON.parse(last)
}

describe('logix-cli (dist/bin) smoke', () => {
  it(
    'should run built logix bin for contract-suite + --includeAnchorAutofill',
    async () => {
      const cliRoot = path.resolve(__dirname, '..', '..')
      const workspaceRoot = path.resolve(cliRoot, '..', '..')
      const repoRoot = path.join(workspaceRoot, 'examples/logix-cli-playground')
      const entry = path.join(repoRoot, 'src/entry.basic.ts#AppRoot')

      await ensureCliBuilt(cliRoot)

      const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-built-smoke-'))

      const { stdout } = await execFileAsync(
        process.execPath,
        [
          path.join(cliRoot, 'dist/bin/logix.js'),
          'contract-suite',
          'run',
          '--runId',
          'built-smoke',
          '--entry',
          entry,
          '--out',
          outDir,
          '--includeAnchorAutofill',
          '--repoRoot',
          repoRoot,
          '--diagnosticsLevel',
          'off',
          '--timeout',
          '10000',
        ],
        { cwd: cliRoot, timeout: 120_000, maxBuffer: 10_000_000 },
      )

      const result = parseLastJsonLine(stdout)
      expect((result as any)?.kind).toBe('CommandResult')
      expect((result as any)?.command).toBe('contract-suite.run')
      expect((result as any)?.ok).toBe(true)

      await fs.stat(path.join(outDir, 'contract-suite.context-pack.json'))
      await fs.stat(path.join(outDir, 'patch.plan.json'))
      await fs.stat(path.join(outDir, 'autofill.report.json'))
    },
    120_000,
  )
})
