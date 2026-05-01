import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/internal/entry.js'

const entryPath = path.resolve(__dirname, '../fixtures/BasicProgram.ts')
const entry = `${entryPath}#BasicProgram`

describe('CLI stdout budget and file fallback', () => {
  it('keeps truncated metadata and file fallback when primary report exceeds budget', async () => {
    const tmp = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'logix-cli-budget-cwd-'))
    const previous = process.cwd()
    try {
      process.chdir(tmp)
      const out = await Effect.runPromise(runCli(['check', '--runId', 'budget-implicit', '--entry', entry, '--budgetBytes', '16']))

      expect(out.kind).toBe('result')
      if (out.kind !== 'result') throw new Error('expected result')

      const artifact = out.result.artifacts.find((item) => item.outputKey === out.result.primaryReportOutputKey)
      expect(artifact?.kind).toBe('VerificationControlPlaneReport')
      expect(artifact?.file).toContain(path.join('.logix', 'out', 'check', 'budget-implicit'))
      expect(fs.existsSync(artifact?.file ?? '')).toBe(true)
      expect(artifact?.truncated).toBe(true)
      expect(artifact?.budgetBytes).toBe(16)
      expect(typeof artifact?.actualBytes).toBe('number')
      expect(artifact?.digest).toMatch(/^sha256:/)
      expect(artifact?.inline).toMatchObject({ _tag: 'oversized' })
    } finally {
      process.chdir(previous)
    }
  })
})
