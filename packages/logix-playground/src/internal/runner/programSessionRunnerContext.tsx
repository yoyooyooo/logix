import React from 'react'
import type { ProjectSnapshotRuntimeInvoker } from './projectSnapshotRuntimeInvoker.js'
import type { ProgramSessionRunner } from './programSessionRunner.js'

interface ProgramSessionRunnerContextValue {
  readonly runner?: ProgramSessionRunner
  readonly runtimeInvoker?: ProjectSnapshotRuntimeInvoker
}

const ProgramSessionRunnerContext = React.createContext<ProgramSessionRunnerContextValue | undefined>(undefined)

export function ProgramSessionRunnerProvider({
  runner,
  runtimeInvoker,
  children,
}: {
  readonly runner?: ProgramSessionRunner
  readonly runtimeInvoker?: ProjectSnapshotRuntimeInvoker
  readonly children: React.ReactNode
}): React.ReactElement {
  return (
    <ProgramSessionRunnerContext.Provider value={{ runner, runtimeInvoker }}>
      {children}
    </ProgramSessionRunnerContext.Provider>
  )
}

export const useProgramSessionRunnerOverride = (): ProgramSessionRunner | undefined =>
  React.useContext(ProgramSessionRunnerContext)?.runner

export const useProjectSnapshotRuntimeInvokerOverride = (): ProjectSnapshotRuntimeInvoker | undefined =>
  React.useContext(ProgramSessionRunnerContext)?.runtimeInvoker
