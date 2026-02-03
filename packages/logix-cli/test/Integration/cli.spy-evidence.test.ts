import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const readJson = async (filePath: string): Promise<unknown> => JSON.parse(await fs.readFile(filePath, 'utf8'))

describe('logix-cli integration (spy evidence)', () => {
  it('should output a SpyEvidenceReport and surface used-but-not-declared gaps', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-'))
    const entry = path.resolve(__dirname, '../fixtures/SpyMissingService.ts#Root')

    const out = await Effect.runPromise(
      runCli(['spy', 'evidence', '--runId', 'r1', '--entry', entry, '--out', tmp, '--timeout', '2000']),
    )
    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(0)
    expect(out.result.ok).toBe(true)

    const report = await readJson(path.join(tmp, 'spy.evidence.report.json'))
    expect((report as any)?.schemaVersion).toBe(1)
    expect((report as any)?.kind).toBe('SpyEvidenceReport')
    expect((report as any)?.runId).toBe('r1')
    expect((report as any)?.diff?.usedButNotDeclared).toContain('@logixjs/test/SpyMissingService')
  })
})

