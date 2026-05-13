import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/internal/entry.js'

const entryPath = path.resolve(__dirname, '../fixtures/BasicProgram.ts')
const entry = `${entryPath}#BasicProgram`

describe('CLI source artifact boundary', () => {
  it('emits source provenance without owning declaration truth for check', async () => {
    const out = await Effect.runPromise(runCli(['check', '--runId', 'source-boundary-check', '--entry', entry]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    const sourceArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === 'sourceArtifact')
    expect(sourceArtifact?.kind).toBe('CliSourceArtifact')
    expect(sourceArtifact?.digest).toMatch(/^sha256:/)
    expect(sourceArtifact?.inline).toMatchObject({
      schemaVersion: 1,
      kind: 'CliSourceArtifact',
      producer: 'cli-source',
      authority: 'provenance-only',
      sourceRef: entryPath,
      entry: { modulePath: entryPath, exportName: 'BasicProgram' },
    })
    expect(sourceArtifact?.inline).not.toHaveProperty('declaration')
    expect(sourceArtifact?.inline).not.toHaveProperty('declarationTruth')
  })

  it('emits source provenance without owning declaration truth for startup trial', async () => {
    const out = await Effect.runPromise(runCli(['trial', '--runId', 'source-boundary-trial', '--entry', entry]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    const keys = out.result.artifacts.map((artifact) => artifact.outputKey)
    expect(keys).toContain('sourceArtifact')
    expect(out.result.primaryReportOutputKey).toBe('trialReport')
  })
})
