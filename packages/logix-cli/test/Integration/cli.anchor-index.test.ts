import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const readJson = async (filePath: string): Promise<unknown> => JSON.parse(await fs.readFile(filePath, 'utf8'))

describe('logix-cli integration (US2 anchor index)', () => {
  it('should build AnchorIndex@v1 for a repo fixture', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-anchor-'))
    const root = path.resolve(__dirname, '..', '..', '..', '..')
    const repoRoot = path.join(root, 'packages/logix-anchor-engine/test/fixtures/repo-basic')

    const r = await Effect.runPromise(
      runCli(['anchor', 'index', '--runId', 'a1', '--repoRoot', repoRoot, '--out', tmp]),
    )
    expect(r.kind).toBe('result')
    if (r.kind !== 'result') throw new Error('expected result')
    expect(r.exitCode).toBe(0)
    expect(r.result.ok).toBe(true)

    const index = await readJson(path.join(tmp, 'anchor.index.json'))
    expect((index as any).kind).toBe('AnchorIndex')
    expect((index as any).schemaVersion).toBe(1)
    expect(((index as any).entries ?? []).length).toBeGreaterThan(0)
  })
})

