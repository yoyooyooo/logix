import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { EXAMPLE_ENTRY_DIRTY_FORM } from '../helpers/exampleEntries.js'

describe('logix-cli integration (ir export projection)', () => {
  it('emits deterministic control-surface projection for entry ref', async () => {
    const argv = ['ir', 'export', '--runId', 'ir-export-projection-1', '--entry', EXAMPLE_ENTRY_DIRTY_FORM] as const

    const first = await Effect.runPromise(runCli(argv))
    const second = await Effect.runPromise(runCli(argv))

    expect(first.kind).toBe('result')
    expect(second.kind).toBe('result')
    if (first.kind !== 'result' || second.kind !== 'result') throw new Error('expected result')

    expect(first.exitCode).toBe(0)
    expect(second.exitCode).toBe(0)
    expect(first.result).toEqual(second.result)

    const manifest = first.result.artifacts.find((artifact) => artifact.outputKey === 'controlSurfaceManifest')?.inline as any
    const workflow = first.result.artifacts.find((artifact) => artifact.outputKey === 'workflowSurface')?.inline as any

    expect(manifest?.kind).toBe('ControlSurfaceManifest')
    expect(Array.isArray(manifest?.modules)).toBe(true)
    expect(manifest?.modules?.length).toBe(1)
    expect(Array.isArray(workflow)).toBe(true)
    expect(workflow?.length).toBe(1)

    const workflowItem = workflow[0]
    expect(workflowItem?.surface?.source).toBe(EXAMPLE_ENTRY_DIRTY_FORM)
    expect(workflowItem?.surface?.digest).toBe(manifest?.modules?.[0]?.workflowSurface?.digest)
  })
})
