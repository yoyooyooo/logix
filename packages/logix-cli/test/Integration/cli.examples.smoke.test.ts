import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const readJson = async (filePath: string): Promise<unknown> => JSON.parse(await fs.readFile(filePath, 'utf8'))

const mkEntry = (workspaceRoot: string, filePath: string, exportName: string): string =>
  `${path.join(workspaceRoot, filePath)}#${exportName}`

describe('logix-cli examples smoke', () => {
  it(
    'should run contract-suite/trialrun against selected examples',
    async () => {
      const workspaceRoot = path.resolve(__dirname, '..', '..', '..', '..')

      // A) logix-react: exercise full gate (contract-suite) on a real example module.
      {
        const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-examples-'))
        const entry = mkEntry(workspaceRoot, 'examples/logix-react/src/modules/counter.ts', 'CounterModule')

        const res = await Effect.runPromise(
          runCli([
            'contract-suite',
            'run',
            '--runId',
            'examples-contract-suite-1',
            '--entry',
            entry,
            '--out',
            tmp,
            '--includeContextPack',
            '--diagnosticsLevel',
            'off',
            '--timeout',
            '10000',
          ]),
        )

        expect(res.kind).toBe('result')
        if (res.kind !== 'result') throw new Error('expected result')
        expect(res.exitCode).toBe(0)
        expect(res.result.ok).toBe(true)

        const verdict = await readJson(path.join(tmp, 'contract-suite.verdict.json'))
        expect((verdict as any)?.verdict).toBe('PASS')
        await fs.stat(path.join(tmp, 'trialrun.report.json'))
        await fs.stat(path.join(tmp, 'contract-suite.context-pack.json'))
      }

      // B) examples/logix: basic trialrun (no browser globals).
      {
        const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-examples-'))
        const entry = mkEntry(workspaceRoot, 'examples/logix/src/scenarios/fluent-intent-basic.ts', 'CounterFluentModule')

        const res = await Effect.runPromise(
          runCli([
            'trialrun',
            '--runId',
            'examples-trialrun-1',
            '--entry',
            entry,
            '--out',
            tmp,
            '--diagnosticsLevel',
            'off',
            '--timeout',
            '10000',
          ]),
        )

        expect(res.kind).toBe('result')
        if (res.kind !== 'result') throw new Error('expected result')
        expect(res.exitCode).toBe(0)
        expect(res.result.ok).toBe(true)

        const report = await readJson(path.join(tmp, 'trialrun.report.json'))
        expect(typeof (report as any)?.ok).toBe('boolean')
      }

      // C) examples/logix-sandbox-mvp: trialrun a form rules entry (no browser globals).
      {
        const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-examples-'))
        const entry = mkEntry(workspaceRoot, 'examples/logix-sandbox-mvp/src/cli-entry.form-rules.ts', 'AppRoot')

        const res = await Effect.runPromise(
          runCli([
            'trialrun',
            '--runId',
            'examples-trialrun-2',
            '--entry',
            entry,
            '--out',
            tmp,
            '--diagnosticsLevel',
            'off',
            '--timeout',
            '10000',
          ]),
        )

        expect(res.kind).toBe('result')
        if (res.kind !== 'result') throw new Error('expected result')
        expect(res.exitCode).toBe(0)
        expect(res.result.ok).toBe(true)

        const report = await readJson(path.join(tmp, 'trialrun.report.json'))
        expect(typeof (report as any)?.ok).toBe('boolean')
      }

      // D) examples/logix-cli-playground: browser global demo should work with --host browser-mock.
      {
        const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-examples-'))
        const entry = mkEntry(workspaceRoot, 'examples/logix-cli-playground/src/entry.browser-global.ts', 'AppRoot')

        const res = await Effect.runPromise(
          runCli([
            'trialrun',
            '--runId',
            'examples-host-1',
            '--host',
            'browser-mock',
            '--entry',
            entry,
            '--out',
            tmp,
            '--diagnosticsLevel',
            'off',
            '--timeout',
            '2000',
          ]),
        )

        expect(res.kind).toBe('result')
        if (res.kind !== 'result') throw new Error('expected result')
        expect(res.exitCode).toBe(0)
        expect(res.result.ok).toBe(true)

        const report = await readJson(path.join(tmp, 'trialrun.report.json'))
        expect(typeof (report as any)?.ok).toBe('boolean')
      }
    },
    120_000,
  )
})
