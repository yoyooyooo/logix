import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const readJson = async (filePath: string): Promise<unknown> => JSON.parse(await fs.readFile(filePath, 'utf8'))

describe('logix-cli integration (US5 transform module report-only)', () => {
  it('should produce PatchPlan + TransformReport for ensureWorkflowStepKeys', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-transform-'))
    const root = path.resolve(__dirname, '..', '..', '..', '..')
    const repoRoot = path.join(root, 'packages/logix-anchor-engine/test/fixtures/repo-autofill-workflow-stepkey')

    const delta = {
      schemaVersion: 1,
      kind: 'ModuleTransformDelta',
      target: { moduleFile: 'workflow.ts', exportName: 'WStepKey' },
      ops: [{ op: 'ensureWorkflowStepKeys', workflowLocalId: 'WStepKey', strategy: 'prefix+index' }],
    }
    const deltaPath = path.join(tmp, 'delta.json')
    await fs.writeFile(deltaPath, JSON.stringify(delta), 'utf8')

    const r = await Effect.runPromise(
      runCli(['transform', 'module', '--runId', 't1', '--repoRoot', repoRoot, '--mode', 'report', '--ops', deltaPath, '--out', tmp]),
    )
    expect(r.kind).toBe('result')
    if (r.kind !== 'result') throw new Error('expected result')
    expect(r.exitCode).toBe(0)
    expect(r.result.ok).toBe(true)

    const plan = await readJson(path.join(tmp, 'patch.plan.json'))
    expect((plan as any).kind).toBe('PatchPlan')
    expect((plan as any).schemaVersion).toBe(1)

    const report = await readJson(path.join(tmp, 'transform.report.json'))
    expect((report as any).kind).toBe('TransformReport')
    expect((report as any).schemaVersion).toBe(1)
    expect((report as any).mode).toBe('report')
  })
})

