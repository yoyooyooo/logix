import { ControlPlane } from '@logixjs/core'
import { describe, expect, it } from 'vitest'
import { createProgramWrapperSource } from '../src/internal/runner/programWrapper.js'
import {
  assertRunnerSnapshotBoundary,
  createSandboxBackedRunner,
  type InternalSandboxTransport,
} from '../src/internal/runner/sandboxRunner.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('Program Run contract', () => {
  it('generates wrapper code for fixed Program and main exports', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const wrapper = createProgramWrapperSource({ snapshot, kind: 'run' })

    expect(wrapper).toContain('__LogixPlaygroundLogix.Runtime.run(Program, main, options)')
    expect(wrapper).toContain('__LogixPlaygroundEffect.promise(() => __LogixPlaygroundLogix.Runtime.run')
    expect(wrapper).toContain('import { Effect as __LogixPlaygroundEffect } from "effect"')
    expect(wrapper).not.toContain('programExport')
    expect(wrapper).not.toContain('mainExport')
  })

  it('returns bounded JSON-safe Run projection without control-plane report fields', async () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const transport: InternalSandboxTransport = {
      init: async () => undefined,
      compile: async () => ({ success: true }),
      run: async () => ({ stateSnapshot: { count: 1 } }),
      trial: async () => ({ stateSnapshot: undefined }),
    }

    const result = await createSandboxBackedRunner({ transport }).runProgram(snapshot)

    expect(result.status).toBe('passed')
    expect(result.runId).toBe('logix-react.local-counter:run:r0:op1')
    expect(ControlPlane.isVerificationControlPlaneReport(result)).toBe(false)
    expect(result).not.toHaveProperty('kind', 'VerificationControlPlaneReport')
  })

  it('guards runner execution through current ProjectSnapshot files', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const currentProgramFile = snapshot.files.get('/src/main.program.ts')

    expect(currentProgramFile?.content).toContain('export const main')
    expect(() => assertRunnerSnapshotBoundary(snapshot)).not.toThrow()

    const missingEntrySnapshot = {
      ...snapshot,
      files: new Map(Array.from(snapshot.files).filter(([path]) => path !== '/src/main.program.ts')),
    }

    expect(() => assertRunnerSnapshotBoundary(missingEntrySnapshot)).toThrow(/ProjectSnapshot missing Program entry file/)
  })
})
