import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

describe('logix-cli integration (transform.module report)', () => {
  it('produces explainable and deterministic report for insert/remove/replace ops', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-transform-module-'))
    try {
      const opsFile = path.join(tmp, 'ops.json')
      await fs.writeFile(
        opsFile,
        JSON.stringify(
          {
            ops: [
              {
                type: 'insert',
                file: 'src/features/order.module.json',
                pointer: '/logic/0',
                value: { kind: 'logic', id: 'logic-1' },
              },
              { type: 'replace', file: 'src/features/order.module.json', pointer: '/logic/0/id', value: 'logic-2' },
              { type: 'remove', file: 'src/features/order.module.json', pointer: '/legacy/obsolete' },
            ],
          },
          null,
          2,
        ),
        'utf8',
      )

      const argv = [
        'transform',
        'module',
        '--runId',
        'transform-report-1',
        '--repoRoot',
        tmp,
        '--ops',
        opsFile,
      ] as const

      const first = await Effect.runPromise(runCli(argv))
      const second = await Effect.runPromise(runCli(argv))

      expect(first.kind).toBe('result')
      expect(second.kind).toBe('result')
      if (first.kind !== 'result' || second.kind !== 'result') throw new Error('expected result')
      expect(first.exitCode).toBe(0)
      expect(second.exitCode).toBe(0)
      expect(first.result).toEqual(second.result)

      const report = first.result.artifacts.find((artifact) => artifact.outputKey === 'transformReport')?.inline as any
      expect(report?.kind).toBe('TransformReport')
      expect(report?.status).toBe('pass')
      expect(report?.summary).toEqual({
        totalOps: 3,
        plannedOps: 3,
        invalidOps: 0,
        targetFiles: 1,
      })
      expect(report?.writeback?.mode).toBe('report')
      expect(report?.writeback?.willWrite).toBe(false)
      expect(report?.operations?.map((operation: any) => operation.op)).toEqual(['insert', 'replace', 'remove'])

      const patchPlan = first.result.artifacts.find((artifact) => artifact.outputKey === 'patchPlan')?.inline as any
      expect(patchPlan?.kind).toBe('PatchPlan')
      expect(patchPlan?.operations?.length).toBe(3)
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })
})
