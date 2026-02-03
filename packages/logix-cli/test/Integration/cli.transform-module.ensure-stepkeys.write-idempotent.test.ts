import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const readJson = async (filePath: string): Promise<unknown> => JSON.parse(await fs.readFile(filePath, 'utf8'))

describe('logix-cli integration (US5 transform module ensureWorkflowStepKeys write idempotent)', () => {
  it('should write stepKey and become idempotent', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-transform-stepkey-'))
    const repoRoot = path.join(tmp, 'repo')
    await fs.mkdir(repoRoot)

    const root = path.resolve(__dirname, '..', '..', '..', '..')
    const fixture = path.join(root, 'packages/logix-anchor-engine/test/fixtures/repo-autofill-workflow-stepkey/workflow.ts')
    await fs.copyFile(fixture, path.join(repoRoot, 'workflow.ts'))

    const delta = {
      schemaVersion: 1,
      kind: 'ModuleTransformDelta',
      target: { moduleFile: 'workflow.ts', exportName: 'WStepKey' },
      ops: [{ op: 'ensureWorkflowStepKeys', workflowLocalId: 'WStepKey', strategy: 'prefix+index' }],
    }
    const deltaPath = path.join(tmp, 'delta.json')
    await fs.writeFile(deltaPath, JSON.stringify(delta), 'utf8')

    const outWrite = path.join(tmp, 'out-write')
    await fs.mkdir(outWrite)

    const r1 = await Effect.runPromise(
      runCli(['transform', 'module', '--runId', 't1', '--repoRoot', repoRoot, '--mode', 'write', '--ops', deltaPath, '--out', outWrite]),
    )
    expect(r1.kind).toBe('result')
    if (r1.kind !== 'result') throw new Error('expected result')
    expect(r1.exitCode).toBe(0)
    expect(r1.result.ok).toBe(true)

    const updated = await fs.readFile(path.join(repoRoot, 'workflow.ts'), 'utf8')
    expect(updated).toContain('key: "dispatch.a"')
    expect(updated).toContain('key: "dispatch.a.2"')
    expect(updated).toContain('key: "call.svc/one"')
    expect(updated).toContain('key: "delay.10ms"')

    const outReport2 = path.join(tmp, 'out-report-2')
    await fs.mkdir(outReport2)
    const r2 = await Effect.runPromise(
      runCli(['transform', 'module', '--runId', 't2', '--repoRoot', repoRoot, '--mode', 'report', '--ops', deltaPath, '--out', outReport2]),
    )
    expect(r2.kind).toBe('result')
    if (r2.kind !== 'result') throw new Error('expected result')
    expect(r2.exitCode).toBe(0)
    expect(r2.result.ok).toBe(true)

    const plan2 = (await readJson(path.join(outReport2, 'patch.plan.json'))) as any
    expect(plan2.kind).toBe('PatchPlan')
    expect(plan2.schemaVersion).toBe(1)
    expect(plan2.summary.writableTotal).toBe(0)
  })
})
