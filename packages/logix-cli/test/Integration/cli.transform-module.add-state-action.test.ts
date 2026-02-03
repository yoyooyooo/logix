import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const readJson = async (filePath: string): Promise<unknown> => JSON.parse(await fs.readFile(filePath, 'utf8'))

describe('logix-cli integration (US5 transform module addState/addAction)', () => {
  it('should plan, write, and become idempotent', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-transform-state-action-'))
    const repoRoot = path.join(tmp, 'repo')
    await fs.mkdir(repoRoot)

    await fs.writeFile(
      path.join(repoRoot, 'module.ts'),
      [
        "import { Schema } from 'effect'",
        "import * as Logix from '@logixjs/core'",
        '',
        "export const CounterDef = Logix.Module.make('CliFixture.Counter', {",
        '  state: Schema.Struct({ count: Schema.Number }),',
        '  actions: { inc: Schema.Void },',
        '})',
        '',
        'export const Counter = CounterDef.implement({',
        '  initial: { count: 0 },',
        '  logics: [],',
        '})',
        '',
      ].join('\n'),
      'utf8',
    )

    const delta = {
      schemaVersion: 1,
      kind: 'ModuleTransformDelta',
      target: { moduleFile: 'module.ts', exportName: 'CounterDef' },
      ops: [
        { op: 'addState', key: 'isSaving', type: 'boolean', initialCode: 'false' },
        { op: 'addAction', actionTag: 'ui/save', payloadType: 'void' },
      ],
    }
    const deltaPath = path.join(tmp, 'delta.json')
    await fs.writeFile(deltaPath, JSON.stringify(delta), 'utf8')

    const out1 = path.join(tmp, 'out-report')
    await fs.mkdir(out1)
    const r1 = await Effect.runPromise(
      runCli(['transform', 'module', '--runId', 't1', '--repoRoot', repoRoot, '--mode', 'report', '--ops', deltaPath, '--out', out1]),
    )
    expect(r1.kind).toBe('result')
    if (r1.kind !== 'result') throw new Error('expected result')
    expect(r1.exitCode).toBe(0)
    expect(r1.result.ok).toBe(true)

    const plan1 = (await readJson(path.join(out1, 'patch.plan.json'))) as any
    expect(plan1.kind).toBe('PatchPlan')
    expect(plan1.schemaVersion).toBe(1)
    expect(plan1.summary.writableTotal).toBe(3)

    const out2 = path.join(tmp, 'out-write')
    await fs.mkdir(out2)
    const r2 = await Effect.runPromise(
      runCli(['transform', 'module', '--runId', 't2', '--repoRoot', repoRoot, '--mode', 'write', '--ops', deltaPath, '--out', out2]),
    )
    expect(r2.kind).toBe('result')
    if (r2.kind !== 'result') throw new Error('expected result')
    expect(r2.exitCode).toBe(0)
    expect(r2.result.ok).toBe(true)

    const updated = await fs.readFile(path.join(repoRoot, 'module.ts'), 'utf8')
    expect(updated).toContain('isSaving')
    expect(updated).toContain('Schema.Boolean')
    expect(updated).toContain('isSaving: false')
    expect(updated).toContain('"ui/save": Schema.Void')

    const out3 = path.join(tmp, 'out-idempotent')
    await fs.mkdir(out3)
    const r3 = await Effect.runPromise(
      runCli(['transform', 'module', '--runId', 't3', '--repoRoot', repoRoot, '--mode', 'report', '--ops', deltaPath, '--out', out3]),
    )
    expect(r3.kind).toBe('result')
    if (r3.kind !== 'result') throw new Error('expected result')
    expect(r3.exitCode).toBe(0)
    expect(r3.result.ok).toBe(true)

    const plan3 = (await readJson(path.join(out3, 'patch.plan.json'))) as any
    expect(plan3.summary.writableTotal).toBe(0)
  })
})

