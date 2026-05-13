import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/internal/entry.js'

describe('legacy CLI route rejection', () => {
  it('rejects removed command families through the same unknown-command contract', async () => {
    const cases: ReadonlyArray<ReadonlyArray<string>> = [
      ['describe', '--runId', 'removed', '--json'],
      ['ir', 'validate', '--runId', 'removed', '--in', '/tmp/removed-input'],
      ['ir', 'diff', '--runId', 'removed', '--before', '/tmp/removed-before', '--after', '/tmp/removed-after'],
    ]

    for (const argv of cases) {
      const out = await Effect.runPromise(runCli(argv))
      expect(out.kind).toBe('result')
      if (out.kind !== 'result') throw new Error('expected result')
      expect(out.exitCode).toBe(2)
      expect(out.result.ok).toBe(false)
      expect(out.result.error?.code).toBe('CLI_INVALID_COMMAND')
      expect(out.result.error?.message).toContain('未知命令')
      const reportArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryReportOutputKey)
      expect((reportArtifact?.inline as any)?.nextRecommendedStage).toBeNull()
    }
  })
})
