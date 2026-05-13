import { describe, expect, it } from 'vitest'
import { createProjectSnapshotRuntimeInvoker } from '../src/internal/runner/projectSnapshotRuntimeInvoker.js'
import type { InternalSandboxTransport } from '../src/internal/runner/sandboxRunner.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('Program Run runtime contract', () => {
  it('runs the current edited ProjectSnapshot through Runtime.run output', async () => {
    const compiledSources: Array<string> = []
    const transport: InternalSandboxTransport = {
      init: async () => undefined,
      compile: async (code) => {
        compiledSources.push(code)
        return { success: true }
      },
      run: async ({ runId }) => ({
        stateSnapshot: {
          count: compiledSources[compiledSources.length - 1]?.includes('counterStep = 2') ? 2 : 1,
          runId,
        },
      }),
      trial: async () => ({ stateSnapshot: undefined }),
    }

    const workspace = createPlaygroundWorkspace(localCounterProjectFixture)
    const invoker = createProjectSnapshotRuntimeInvoker({ transport })
    const initial = await invoker.run(createProjectSnapshot(workspace), 1)

    workspace.editFile('/src/logic/localCounter.logic.ts', 'export const counterStep = 2')
    const edited = await invoker.run(createProjectSnapshot(workspace), 2)

    expect(initial).toMatchObject({
      kind: 'runtimeEvidence',
      operationKind: 'run',
      runtimeOutput: {
        kind: 'runtimeOutput',
        operation: 'run',
        runId: 'logix-react.local-counter:run:r0:op1',
        value: { count: 1, runId: 'logix-react.local-counter:run:r0:op1' },
      },
    })
    expect(edited).toMatchObject({
      kind: 'runtimeEvidence',
      operationKind: 'run',
      runtimeOutput: {
        kind: 'runtimeOutput',
        operation: 'run',
        runId: 'logix-react.local-counter:run:r1:op2',
        value: { count: 2, runId: 'logix-react.local-counter:run:r1:op2' },
      },
    })
    expect(compiledSources[0]).toContain('counterStep = 1')
    expect(compiledSources[1]).toContain('counterStep = 2')
    expect(compiledSources[1]).toContain('__LogixPlaygroundLogix.Runtime.run(Program, main, options)')
  })

  it('projects Runtime.run rejection as failed runtime evidence instead of a null value', async () => {
    const transport: InternalSandboxTransport = {
      init: async () => undefined,
      compile: async () => ({ success: true }),
      run: async () => {
        throw new Error('Missing service: DemoConfig')
      },
      trial: async () => ({ stateSnapshot: undefined }),
    }

    const workspace = createPlaygroundWorkspace(localCounterProjectFixture)
    const invoker = createProjectSnapshotRuntimeInvoker({ transport })
    const result = await invoker.run(createProjectSnapshot(workspace), 1)

    expect(result).toMatchObject({
      kind: 'runtimeEvidence',
      operationKind: 'run',
      runtimeOutput: {
        kind: 'runtimeOutput',
        operation: 'run',
        status: 'failed',
        runId: 'logix-react.local-counter:run:r0:op1',
        failure: {
          kind: 'runtime',
          message: 'Missing service: DemoConfig',
        },
      },
      evidenceGaps: [
        {
          name: 'evidence.gap',
          code: 'runtime',
          message: 'Missing service: DemoConfig',
        },
      ],
    })
    expect(result.operationEvents).toMatchObject([
      {
        name: 'operation.failed',
        failure: {
          code: 'runtime',
          message: 'Missing service: DemoConfig',
        },
      },
    ])
  })
})
