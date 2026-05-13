import { ControlPlane } from '@logixjs/core'
import { describe, expect, it } from 'vitest'
import { createControlPlaneRunner } from '../src/internal/runner/controlPlaneRunner.js'
import type { InternalSandboxTransport } from '../src/internal/runner/sandboxRunner.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { makeControlPlaneReport } from './support/controlPlaneFixtures.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('startup Trial boundary', () => {
  it('sends plain Program module source to the sandbox Trial wrapper', async () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const report = makeControlPlaneReport('trial', 'startup')
    let trialOptions:
      | Parameters<InternalSandboxTransport['trial']>[0]
      | undefined
    const transport: InternalSandboxTransport = {
      init: async () => undefined,
      compile: async () => ({ success: true }),
      run: async () => ({ stateSnapshot: undefined }),
      trial: async (options) => {
        trialOptions = options
        return { stateSnapshot: report }
      },
    }

    await createControlPlaneRunner({ transport }).trialStartup(snapshot)

    expect(trialOptions?.moduleExport).toBe('Program')
    expect(trialOptions?.moduleCode).toContain('export const Program')
    expect(trialOptions?.moduleCode).not.toContain('export default')
    expect(trialOptions?.moduleCode).not.toContain('Runtime.trial')
  })

  it('returns core VerificationControlPlaneReport for startup Trial', async () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const report = makeControlPlaneReport('trial', 'startup')
    let trialOptions:
      | Parameters<InternalSandboxTransport['trial']>[0]
      | undefined
    const transport: InternalSandboxTransport = {
      init: async () => undefined,
      compile: async () => ({ success: true }),
      run: async () => ({ stateSnapshot: undefined }),
      trial: async (options) => {
        trialOptions = options
        return { stateSnapshot: report }
      },
    }

    const result = await createControlPlaneRunner({ transport }).trialStartup(snapshot)

    expect(ControlPlane.isVerificationControlPlaneReport(result)).toBe(true)
    expect(result.stage).toBe('trial')
    expect(result.mode).toBe('startup')
    expect(trialOptions?.runId).toContain(':trialStartup:r')
  })
})
