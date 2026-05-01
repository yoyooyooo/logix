import type { VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import { makeRunId } from '../snapshot/identity.js'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import type { InternalSandboxTransport } from './sandboxRunner.js'
import { createProgramWrapperSource, snapshotFilesToModuleSource } from './programWrapper.js'

export interface ControlPlaneRunnerOptions {
  readonly transport: InternalSandboxTransport
}

export const createControlPlaneRunner = ({ transport }: ControlPlaneRunnerOptions) => {
  const check = async (snapshot: ProjectSnapshot, seq = 1): Promise<VerificationControlPlaneReport> => {
    const runId = makeRunId(snapshot.projectId, snapshot.revision, 'check', seq)
    const wrapper = createProgramWrapperSource({ snapshot, kind: 'check' })
    await transport.init()
    const compiled = await transport.compile(wrapper, snapshot.programEntry?.entry)
    if (!compiled.success) throw new Error(compiled.errors?.join('\n') ?? 'compile failed')
    const result = await transport.run({ runId })
    return result.stateSnapshot as VerificationControlPlaneReport
  }

  const trialStartup = async (snapshot: ProjectSnapshot, seq = 1): Promise<VerificationControlPlaneReport> => {
    const runId = makeRunId(snapshot.projectId, snapshot.revision, 'trialStartup', seq)
    const moduleCode = snapshotFilesToModuleSource(snapshot)
    await transport.init()
    const result = await transport.trial({ moduleCode, moduleExport: 'Program', runId })
    return result.stateSnapshot as VerificationControlPlaneReport
  }

  return {
    check,
    trialStartup,
  }
}
