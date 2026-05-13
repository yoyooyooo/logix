import { describe, expect, it } from 'vitest'
import { createProjectSnapshotRuntimeInvoker } from '../src/internal/runner/projectSnapshotRuntimeInvoker.js'
import type { InternalSandboxTransport } from '../src/internal/runner/sandboxRunner.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'
import { makeControlPlaneReport } from './support/controlPlaneFixtures.js'

describe('ProjectSnapshot runtime evidence invoker', () => {
  it('returns reflection, run, check and trial envelopes sharing the same source digest', async () => {
    const transport: InternalSandboxTransport = {
      init: async () => undefined,
      compile: async () => ({ success: true }),
      run: async ({ runId }) => {
        if (String(runId).includes('reflect')) {
          return {
            stateSnapshot: {
              reflectionManifest: {
                manifestVersion: 'runtime-reflection-manifest@167B',
                programId: 'logix-react.local-counter',
                rootModuleId: 'FixtureCounter',
                rootModule: { moduleId: 'FixtureCounter', digest: 'module:1', actions: [] },
                modules: [],
                actions: [
                  {
                    actionTag: 'increment',
                    payload: { kind: 'void', validatorAvailable: false },
                    authority: 'runtime-reflection',
                  },
                ],
                logicUnits: [],
                effects: [],
                processes: [],
                imports: [],
                services: [],
                capabilities: { run: 'available', check: 'available', trial: 'available' },
                sourceRefs: [],
                budget: { truncated: false, originalActionCount: 1 },
                digest: 'runtime-manifest:fixture',
              },
              minimumActionManifest: {
                manifestVersion: 'program-action-manifest@167A',
                programId: 'logix-react.local-counter',
                moduleId: 'FixtureCounter',
                revision: 0,
                digest: 'module:1',
                actions: [
                  { actionTag: 'increment', payload: { kind: 'void' }, authority: 'runtime-reflection' },
                ],
              },
            },
          }
        }
        if (String(runId).includes('check')) return { stateSnapshot: makeControlPlaneReport('check', 'static') }
        return { stateSnapshot: { count: 1, runId } }
      },
      trial: async () => ({ stateSnapshot: makeControlPlaneReport('trial', 'startup') }),
    }
    const invoker = createProjectSnapshotRuntimeInvoker({ transport })
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))

    const reflection = await invoker.reflect(snapshot, 1)
    const run = await invoker.run(snapshot, 2)
    const check = await invoker.check(snapshot, 3)
    const trial = await invoker.trialStartup(snapshot, 4)

    expect(reflection.kind).toBe('runtimeEvidence')
    expect(reflection.operationKind).toBe('reflect')
    expect(reflection.reflectionManifest?.digest).toBe('runtime-manifest:fixture')
    expect(reflection.minimumActionManifest?.actions.map((action) => action.actionTag)).toEqual(['increment'])
    expect(run.sourceDigest).toBe(reflection.sourceDigest)
    expect(check.sourceDigest).toBe(reflection.sourceDigest)
    expect(trial.sourceDigest).toBe(reflection.sourceDigest)
    expect(run.runtimeOutput?.operation).toBe('run')
    expect(check.controlPlaneReport?.verdict).toBe('PASS')
    expect(trial.controlPlaneReport?.mode).toBe('startup')
    expect(run.operationEvents.map((event) => event.name)).toEqual(['operation.accepted', 'operation.completed'])
  })
})
