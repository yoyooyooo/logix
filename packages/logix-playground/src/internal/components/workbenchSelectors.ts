import type {
  PlaygroundWorkbenchAction,
  PlaygroundWorkbenchState,
} from '../state/workbenchProgram.js'
import type { ModuleRef } from '@logixjs/react'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import { createProjectSnapshot } from '../snapshot/projectSnapshot.js'
import type { PlaygroundWorkspace } from '../session/workspace.js'
import type { ManagedRuntime } from 'effect'

export type PlaygroundWorkbenchHandle = ModuleRef<PlaygroundWorkbenchState, any>

type WorkbenchSelector<V> = ((state: PlaygroundWorkbenchState) => V) & {
  readonly fieldPaths: ReadonlyArray<string>
  readonly debugKey: string
}

const makeWorkbenchSelector = <V>(
  debugKey: string,
  fieldPaths: ReadonlyArray<string>,
  select: (state: PlaygroundWorkbenchState) => V,
): WorkbenchSelector<V> =>
  Object.assign(select, { debugKey, fieldPaths })

export const selectWorkspaceRevision = makeWorkbenchSelector(
  'playground.workspaceRevision',
  ['workspaceRevision'],
  (state) => state.workspaceRevision,
)

export const selectActiveFile = makeWorkbenchSelector(
  'playground.activeFile',
  ['activeFile'],
  (state) => state.activeFile,
)

export const selectLayout = makeWorkbenchSelector(
  'playground.layout',
  ['layout'],
  (state) => state.layout,
)

export const selectRunState = makeWorkbenchSelector(
  'playground.runState',
  ['runState'],
  (state) => state.runState,
)

export const selectCheckState = makeWorkbenchSelector(
  'playground.checkState',
  ['checkState'],
  (state) => state.checkState,
)

export const selectTrialStartupState = makeWorkbenchSelector(
  'playground.trialStartupState',
  ['trialStartupState'],
  (state) => state.trialStartupState,
)

export const selectRuntimeEvidence = makeWorkbenchSelector(
  'playground.runtimeEvidence',
  ['runtimeEvidence'],
  (state) => state.runtimeEvidence,
)

export const selectProgramSession = makeWorkbenchSelector(
  'playground.programSession',
  ['programSession'],
  (state) => state.programSession,
)

export const selectSessionSeq = makeWorkbenchSelector(
  'playground.sessionSeq',
  ['sessionSeq'],
  (state) => state.sessionSeq,
)

export const selectSessionActions = makeWorkbenchSelector(
  'playground.sessionActions',
  ['sessionActions'],
  (state) => state.sessionActions,
)

export const selectBottomTab = makeWorkbenchSelector(
  'playground.bottomTab',
  ['bottomTab'],
  (state) => state.bottomTab,
)

export const selectCheckExpanded = makeWorkbenchSelector(
  'playground.checkExpanded',
  ['checkExpanded'],
  (state) => state.checkExpanded,
)

export const selectTrialExpanded = makeWorkbenchSelector(
  'playground.trialExpanded',
  ['trialExpanded'],
  (state) => state.trialExpanded,
)

export const selectActiveInspectorTab = makeWorkbenchSelector(
  'playground.inspector.activeInspectorTab',
  ['inspector.activeInspectorTab'],
  (state) => state.inspector.activeInspectorTab,
)

export const selectAdvancedDispatchExpanded = makeWorkbenchSelector(
  'playground.inspector.advancedDispatchExpanded',
  ['inspector.advancedDispatchExpanded'],
  (state) => state.inspector.advancedDispatchExpanded,
)

export const selectDriverExecution = makeWorkbenchSelector(
  'playground.inspector.driverExecution',
  ['inspector.driverExecution'],
  (state) => state.inspector.driverExecution,
)

export const selectScenarioExecution = makeWorkbenchSelector(
  'playground.inspector.scenarioExecution',
  ['inspector.scenarioExecution'],
  (state) => state.inspector.scenarioExecution,
)

export const readWorkbenchState = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  workbench: PlaygroundWorkbenchHandle,
): PlaygroundWorkbenchState =>
  runtime.runSync(workbench.runtime.getState as never) as PlaygroundWorkbenchState

export const readProjectSnapshot = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  workbench: PlaygroundWorkbenchHandle,
  workspace: PlaygroundWorkspace,
): ProjectSnapshot => {
  const _workspaceRevision = readWorkbenchState(runtime, workbench).workspaceRevision
  return createProjectSnapshot(workspace)
}
