import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli, runInternalCli } from '../../src/internal/entry.js'

describe('unknown CLI command transport', () => {
  it('returns a deterministic CommandResult for unsupported multi-token commands', async () => {
    const cases: ReadonlyArray<ReadonlyArray<string>> = [
      ['anchor', 'autofill', '--runId', 'u1', '--mode', 'report'],
      ['anchor', 'index', '--runId', 'u2'],
    ]

    for (const argv of cases) {
      const publicOut = await Effect.runPromise(runCli(argv))
      const internalOut = await Effect.runPromise(runInternalCli(argv))

      for (const out of [publicOut, internalOut]) {
        expect(out.kind).toBe('result')
        if (out.kind !== 'result') throw new Error('expected result')
        expect(out.exitCode).toBe(2)
        expect(out.result.ok).toBe(false)
        expect(out.result.error?.code).toBe('CLI_INVALID_COMMAND')
        expect(out.result.error?.message).toContain('未知命令')
        expect(out.result.command).toBe('unknown')
        expect(out.result.primaryReportOutputKey).toBe('errorReport')
        const reportArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryReportOutputKey)
        expect((reportArtifact?.inline as any)?.nextRecommendedStage).toBeNull()
      }
    }
  })
})
