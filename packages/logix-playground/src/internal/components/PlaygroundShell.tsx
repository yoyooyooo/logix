import React from 'react'
import { useDispatch, useModule, useRuntime, useSelector } from '@logixjs/react'
import {
  projectActionManifestFromRuntimeEvidence,
  unavailableActionManifest,
} from '../action/actionManifest.js'
import type { InteractionDriver } from '../driver/driverModel.js'
import { resolveDriverAction } from '../driver/driverRunner.js'
import { ResizableWorkbench } from '../layout/ResizableWorkbench.js'
import {
  makePressureDrivers,
  makePressureScenarios,
  pressureInspectorTab,
  resolveVisualPressureFixture,
} from '../pressure/pressureFixture.js'
import type { ProgramSessionRunner } from '../runner/programSessionRunner.js'
import {
  useProgramSessionRunnerOverride,
  useProjectSnapshotRuntimeInvokerOverride,
} from '../runner/programSessionRunnerContext.js'
import { createProjectSnapshotRuntimeInvoker } from '../runner/projectSnapshotRuntimeInvoker.js'
import { createDefaultSandboxTransport } from '../runner/sandboxRunner.js'
import { makeRunId } from '../snapshot/identity.js'
import { createProjectSnapshot } from '../snapshot/projectSnapshot.js'
import {
  canCommitProgramSessionOperation,
  createInitialProgramSession,
  createRestartedProgramSession,
  makeProgramSessionOperationRoot,
  recordProgramSessionDispatchAccepted,
  recordProgramSessionFailure,
  recordProgramSessionOperation,
  type ProgramSessionAction,
} from '../session/programSession.js'
import { makeRunnerErrorLog } from '../session/logs.js'
import type { PlaygroundWorkspace } from '../session/workspace.js'
import type { ScenarioPlayback } from '../scenario/scenarioModel.js'
import { runScenario } from '../scenario/scenarioRunner.js'
import { PlaygroundWorkbenchProgram, type PlaygroundWorkbenchAction } from '../state/workbenchProgram.js'
import { derivePlaygroundWorkbenchProjection } from '../summary/workbenchProjection.js'
import { FilesPanel } from './FilesPanel.js'
import { HostCommandBar } from './HostCommandBar.js'
import { PlaygroundErrorBoundary } from './PlaygroundErrorBoundary.js'
import { RuntimeInspector } from './RuntimeInspector.js'
import { SourcePanel } from './SourcePanel.js'
import { WorkbenchBottomPanel } from './WorkbenchBottomPanel.js'
import {
  readProjectSnapshot,
  readWorkbenchState,
  selectActiveFile,
  selectActiveInspectorTab,
  selectAdvancedDispatchExpanded,
  selectBottomTab,
  selectCheckExpanded,
  selectCheckState,
  selectDriverExecution,
  selectLayout,
  selectProgramSession,
  selectRunState,
  selectRuntimeEvidence,
  selectScenarioExecution,
  selectTrialExpanded,
  selectTrialStartupState,
  selectWorkspaceRevision,
  type PlaygroundWorkbenchHandle,
} from './workbenchSelectors.js'

export interface PlaygroundShellProps {
  readonly workspace: PlaygroundWorkspace
  readonly projectSwitcher?: React.ReactNode
  readonly backHref?: string
  readonly backLabel?: string
}

export function PlaygroundShell({
  workspace,
  projectSwitcher,
  backHref,
  backLabel,
}: PlaygroundShellProps): React.ReactElement {
  const runtime = useRuntime()
  const workbench = useModule(PlaygroundWorkbenchProgram)
  const dispatchWorkbench = useDispatch(workbench) as (action: PlaygroundWorkbenchAction) => void
  const initialWorkbenchState = React.useMemo(() => readWorkbenchState(runtime, workbench), [runtime, workbench])
  const programSessionRef = React.useRef(initialWorkbenchState.programSession)
  const sessionActionsRef = React.useRef(initialWorkbenchState.sessionActions)
  const didAutoStartRef = React.useRef(false)
  const pressure = React.useMemo(() => resolveVisualPressureFixture(workspace.originalProject.fixtures), [workspace.originalProject.fixtures])
  const pressureDrivers = React.useMemo(() => makePressureDrivers(pressure), [pressure])
  const pressureScenarios = React.useMemo(() => makePressureScenarios(pressure), [pressure])
  const drivers = workspace.originalProject.drivers ?? pressureDrivers
  const scenarios = workspace.originalProject.scenarios ?? pressureScenarios
  const runnerOverride = useProgramSessionRunnerOverride()
  const runtimeInvokerOverride = useProjectSnapshotRuntimeInvokerOverride()
  const transport = React.useMemo(() => createDefaultSandboxTransport(), [])
  const defaultRuntimeInvoker = React.useMemo(() => createProjectSnapshotRuntimeInvoker({ transport }), [transport])
  const runtimeInvoker = runtimeInvokerOverride ?? defaultRuntimeInvoker
  const defaultSessionRunner = React.useMemo<ProgramSessionRunner>(() => ({
    dispatch: async (input) => {
      const result = await runtimeInvoker.dispatch(input)
      dispatchWorkbench({ _tag: 'recordRuntimeEvidence', payload: { lane: 'dispatch', evidence: result } })
      if (result.runtimeOutput?.operation === 'dispatch') {
        return {
          state: result.runtimeOutput.state,
          logs: result.runtimeOutput.logs ?? [],
          traces: result.runtimeOutput.traces ?? [],
        }
      }
      const failed = result.operationEvents.find((event) => event.name === 'operation.failed')
      if (failed?.name === 'operation.failed') throw failed.failure
      const gap = result.evidenceGaps[0]
      if (gap?.name === 'evidence.gap') throw { kind: 'runtime', message: gap.message }
      throw { kind: 'runtime', message: 'Dispatch did not return runtime output.' }
    },
  }), [dispatchWorkbench, runtimeInvoker])
  const sessionRunner = runnerOverride ?? defaultSessionRunner

  React.useEffect(() => {
    dispatchWorkbench({ _tag: 'workspaceSynced', payload: { revision: workspace.revision } })
  }, [dispatchWorkbench, workspace, workspace.revision])

  React.useEffect(() => {
    const snapshot = createProjectSnapshot(workspace)
    if (!snapshot.programEntry) return
    let cancelled = false
    void runtimeInvoker.reflect(snapshot, 1).then((evidence) => {
      if (cancelled) return
      dispatchWorkbench({ _tag: 'recordRuntimeEvidence', payload: { lane: 'reflect', evidence } })
    })
    return () => {
      cancelled = true
    }
  }, [dispatchWorkbench, runtimeInvoker, workspace, workspace.revision])

  const reflectWorkspaceSnapshot = React.useCallback((revision: number) => {
    const snapshot = createProjectSnapshot(workspace)
    if (!snapshot.programEntry || snapshot.revision !== revision) return
    void runtimeInvoker.reflect(snapshot, 1).then((evidence) => {
      if (workspace.revision !== revision) return
      dispatchWorkbench({ _tag: 'recordRuntimeEvidence', payload: { lane: 'reflect', evidence } })
    })
  }, [dispatchWorkbench, runtimeInvoker, workspace])

  React.useEffect(() => {
    const tab = pressureInspectorTab(pressure)
    dispatchWorkbench({ _tag: 'selectInspectorTab', payload: tab ?? 'actions' })
    dispatchWorkbench({ _tag: 'selectBottomTab', payload: pressure?.activeBottomTab ?? 'Console' })
  }, [dispatchWorkbench, pressure, workspace.projectId])

  const restartSessionForRevision = React.useCallback((revision: number, previous = programSessionRef.current) => {
    const nextSeq = readWorkbenchState(runtime, workbench).sessionSeq + 1
    const nextSession = previous
      ? createRestartedProgramSession({
          projectId: workspace.projectId,
          revision,
          seq: nextSeq,
          previousSessionId: previous.sessionId,
          previousRevision: previous.revision,
        })
      : createInitialProgramSession({
          projectId: workspace.projectId,
          revision,
          seq: nextSeq,
        })
    programSessionRef.current = nextSession
    sessionActionsRef.current = []
    dispatchWorkbench({ _tag: 'workspaceRestartedSession', payload: nextSession })
  }, [dispatchWorkbench, runtime, workbench, workspace.projectId])

  React.useEffect(() => {
    const snapshot = createProjectSnapshot(workspace)
    if (!snapshot.programEntry || didAutoStartRef.current) return
    const current = programSessionRef.current
    if (current?.projectId === snapshot.projectId && current.revision === snapshot.revision) {
      didAutoStartRef.current = true
      return
    }

    didAutoStartRef.current = true
    restartSessionForRevision(snapshot.revision, current)
  }, [restartSessionForRevision, workspace, workspace.revision])

  const editFile = React.useCallback((path: string, content: string) => {
    const previous = programSessionRef.current
    workspace.editFile(path, content)
    dispatchWorkbench({ _tag: 'workspaceSynced', payload: { revision: workspace.revision } })
    restartSessionForRevision(workspace.revision, previous)
    reflectWorkspaceSnapshot(workspace.revision)
  }, [dispatchWorkbench, reflectWorkspaceSnapshot, restartSessionForRevision, workspace])

  const selectFile = React.useCallback((path: string) => {
    workspace.setActiveFile(path)
    dispatchWorkbench({ _tag: 'selectFile', payload: workspace.activeFile })
  }, [dispatchWorkbench, workspace])

  const resetProgramSession = React.useCallback(() => {
    const previous = programSessionRef.current
    restartSessionForRevision(workspace.revision, previous)
  }, [restartSessionForRevision, workspace.revision])

  const runProgram = React.useCallback(() => {
    const current = programSessionRef.current
    if (!current) return
    const snapshot = readProjectSnapshot(runtime, workbench, workspace)
    const operationSeq = current.operationSeq + 1
    const root = makeProgramSessionOperationRoot(current, operationSeq)
    const runId = makeRunId(snapshot.projectId, snapshot.revision, 'run', operationSeq)
    dispatchWorkbench({ _tag: 'selectInspectorTab', payload: 'result' })
    dispatchWorkbench({ _tag: 'setRunState', payload: { status: 'running' } })
    void runtimeInvoker.run(snapshot, operationSeq).then(
      (result) => {
        if (!canCommitProgramSessionOperation(programSessionRef.current, root)) return
        dispatchWorkbench({ _tag: 'recordRuntimeEvidence', payload: { lane: 'run', evidence: result } })
        if (result.runtimeOutput?.operation === 'run') {
          if (result.runtimeOutput.status === 'failed') {
            dispatchWorkbench({
              _tag: 'setRunState',
              payload: {
                status: 'failed',
                runId: result.runtimeOutput.runId ?? runId,
                message: result.runtimeOutput.failure?.message ?? 'Runtime.run failed',
              },
            })
            return
          }
          dispatchWorkbench({
            _tag: 'setRunState',
            payload: {
              status: 'passed',
              runId: result.runtimeOutput.runId ?? runId,
              value: result.runtimeOutput.value,
              valueKind: result.runtimeOutput.valueKind,
              lossy: result.runtimeOutput.lossy,
              lossReasons: result.runtimeOutput.lossReasons,
            },
          })
          return
        }
        const message = result.evidenceGaps[0]?.message ?? 'Run did not return runtime output.'
        dispatchWorkbench({
          _tag: 'setRunState',
          payload: { status: 'failed', runId, message },
        })
      },
      (error: unknown) => {
        if (!canCommitProgramSessionOperation(programSessionRef.current, root)) return
        dispatchWorkbench({
          _tag: 'setRunState',
          payload: {
            status: 'failed',
            runId,
            message: error instanceof Error ? error.message : String(error),
          },
        })
      },
    )
  }, [dispatchWorkbench, runtime, runtimeInvoker, workbench, workspace])

  const checkProgram = React.useCallback(() => {
    const current = programSessionRef.current
    if (!current) return
    const snapshot = readProjectSnapshot(runtime, workbench, workspace)
    const operationSeq = current.operationSeq + 1
    const root = makeProgramSessionOperationRoot(current, operationSeq)
    dispatchWorkbench({ _tag: 'selectInspectorTab', payload: 'result' })
    dispatchWorkbench({ _tag: 'setCheckState', payload: { status: 'running' } })
    void runtimeInvoker.check(snapshot, operationSeq).then(
      (result) => {
        if (!canCommitProgramSessionOperation(programSessionRef.current, root)) return
        dispatchWorkbench({ _tag: 'recordRuntimeEvidence', payload: { lane: 'check', evidence: result } })
        if (result.controlPlaneReport) {
          dispatchWorkbench({ _tag: 'setCheckState', payload: { status: 'passed', report: result.controlPlaneReport } })
          return
        }
        const message = result.evidenceGaps[0]?.message ?? 'Check did not return a control-plane report.'
        dispatchWorkbench({ _tag: 'setCheckState', payload: { status: 'failed', message } })
      },
      (error: unknown) => {
        if (!canCommitProgramSessionOperation(programSessionRef.current, root)) return
        dispatchWorkbench({
          _tag: 'setCheckState',
          payload: { status: 'failed', message: error instanceof Error ? error.message : String(error) },
        })
      },
    )
  }, [dispatchWorkbench, runtime, runtimeInvoker, workbench, workspace])

  const trialStartup = React.useCallback(() => {
    const current = programSessionRef.current
    if (!current) return
    const snapshot = readProjectSnapshot(runtime, workbench, workspace)
    const operationSeq = current.operationSeq + 1
    const root = makeProgramSessionOperationRoot(current, operationSeq)
    dispatchWorkbench({ _tag: 'selectInspectorTab', payload: 'result' })
    dispatchWorkbench({ _tag: 'setTrialStartupState', payload: { status: 'running' } })
    void runtimeInvoker.trialStartup(snapshot, operationSeq).then(
      (result) => {
        if (!canCommitProgramSessionOperation(programSessionRef.current, root)) return
        dispatchWorkbench({ _tag: 'recordRuntimeEvidence', payload: { lane: 'trialStartup', evidence: result } })
        if (result.controlPlaneReport) {
          dispatchWorkbench({ _tag: 'setTrialStartupState', payload: { status: 'passed', report: result.controlPlaneReport } })
          return
        }
        const message = result.evidenceGaps[0]?.message ?? 'Trial did not return a control-plane report.'
        dispatchWorkbench({ _tag: 'setTrialStartupState', payload: { status: 'failed', message } })
      },
      (error: unknown) => {
        if (!canCommitProgramSessionOperation(programSessionRef.current, root)) return
        dispatchWorkbench({
          _tag: 'setTrialStartupState',
          payload: { status: 'failed', message: error instanceof Error ? error.message : String(error) },
        })
      },
    )
  }, [dispatchWorkbench, runtime, runtimeInvoker, workbench, workspace])

  const dispatchAction = React.useCallback((action: ProgramSessionAction, callbacks?: {
    readonly onSettled?: () => void
    readonly onFailed?: (error: unknown) => void
  }) => {
    const current = programSessionRef.current
    if (!current || current.stale || current.status === 'running') {
      callbacks?.onFailed?.({ kind: 'runtime', message: 'Program session is unavailable for dispatch.' })
      return
    }
    const snapshot = readProjectSnapshot(runtime, workbench, workspace)
    const runtimeEvidence = readWorkbenchState(runtime, workbench).runtimeEvidence
    const actionManifest = snapshot.programEntry
      ? projectActionManifestFromRuntimeEvidence(snapshot, runtimeEvidence.reflect)
      : unavailableActionManifest(snapshot, 'Project has no Program entry.')
    const availableActionTags = new Set(actionManifest.actions.map((manifestAction) => manifestAction.actionTag))
    if (!availableActionTags.has(action._tag)) {
      callbacks?.onFailed?.({ kind: 'runtime', message: `Unknown action ${action._tag}.` })
      return
    }

    const nextActions = [...sessionActionsRef.current, action]
    const nextSession = recordProgramSessionDispatchAccepted(current, { actionTag: action._tag })
    const operationSeq = current.operationSeq + 1
    const root = makeProgramSessionOperationRoot(current, operationSeq)
    programSessionRef.current = nextSession
    sessionActionsRef.current = nextActions
    dispatchWorkbench({ _tag: 'recordDispatchAccepted', payload: { session: nextSession, actions: nextActions } })

    void sessionRunner.dispatch({
      snapshot,
      sessionId: current.sessionId,
      actions: nextActions,
      operationSeq,
    }).then(
      (result) => {
        const latest = programSessionRef.current
        if (latest && canCommitProgramSessionOperation(latest, root)) {
          const recorded = recordProgramSessionOperation(latest, {
              operation: { kind: 'dispatch', actionTag: action._tag, payload: action.payload },
              state: result.state,
              logs: result.logs,
              traces: result.traces,
          })
          programSessionRef.current = recorded
          sessionActionsRef.current = nextActions
          dispatchWorkbench({ _tag: 'recordDispatchSettled', payload: { session: recorded, actions: nextActions } })
          callbacks?.onSettled?.()
          return
        }
        callbacks?.onFailed?.({ kind: 'runtime', message: 'Dispatch result was superseded by a newer session operation.' })
      },
      (error: unknown) => {
        const failure = error && typeof error === 'object' && 'kind' in error && 'message' in error
          ? error as { readonly kind: string; readonly message: string }
          : { kind: 'runtime', message: error instanceof Error ? error.message : String(error) }
        const latest = programSessionRef.current
        if (latest && canCommitProgramSessionOperation(latest, root)) {
          const recorded = recordProgramSessionFailure(latest, {
              operation: { kind: 'dispatch', actionTag: action._tag, payload: action.payload },
              error: failure,
              logs: [makeRunnerErrorLog({ message: failure.message, sessionId: current.sessionId, operationSeq })],
          })
          programSessionRef.current = recorded
          dispatchWorkbench({ _tag: 'recordDispatchSettled', payload: { session: recorded, actions: sessionActionsRef.current } })
          callbacks?.onFailed?.(failure)
          return
        }
        callbacks?.onFailed?.({ kind: 'runtime', message: 'Dispatch failure was superseded by a newer session operation.' })
      },
    )
  }, [dispatchWorkbench, runtime, sessionRunner, workbench, workspace])

  const runDriver = React.useCallback((driver: InteractionDriver, exampleId?: string) => {
    dispatchWorkbench({ _tag: 'selectDriver', payload: driver.id })
    dispatchWorkbench({ _tag: 'setDriverExecution', payload: { status: 'running', driverId: driver.id } })
    dispatchAction(resolveDriverAction(driver, exampleId), {
      onSettled: () => {
        dispatchWorkbench({ _tag: 'setDriverExecution', payload: { status: 'passed', driverId: driver.id } })
      },
      onFailed: (error) => {
        dispatchWorkbench({
          _tag: 'setDriverExecution',
          payload: {
            status: 'failed',
            driverId: driver.id,
            message: error && typeof error === 'object' && 'message' in error
              ? String((error as { readonly message: unknown }).message)
              : String(error),
          },
        })
      },
    })
  }, [dispatchAction, dispatchWorkbench])

  const runScenarioPlayback = React.useCallback((scenario: ScenarioPlayback, mode: 'all' | 'step') => {
    const snapshot = readProjectSnapshot(runtime, workbench, workspace)
    const steps = mode === 'step' ? scenario.steps.slice(0, 1) : scenario.steps
    const scenarioRunId = makeRunId(snapshot.projectId, snapshot.revision, 'scenario', Date.now())
    const playback: ScenarioPlayback = { ...scenario, steps }
    dispatchWorkbench({ _tag: 'selectScenario', payload: scenario.id })
    dispatchWorkbench({
      _tag: 'setScenarioExecution',
      payload: {
        status: 'running',
        scenarioRunId,
        scenarioId: scenario.id,
        stepResults: [],
      },
    })
    void runScenario({
      scenario: playback,
      scenarioRunId,
      drivers,
      dispatchAction: (action) =>
        new Promise<void>((resolve, reject) => {
          dispatchAction(action, { onSettled: resolve, onFailed: reject })
        }),
      settle: () => undefined,
      read: (target) => {
        if (target === 'state') return programSessionRef.current?.state
        if (target === 'result') return programSessionRef.current?.lastOperation
        if (target === 'log') return programSessionRef.current?.logs
        if (target === 'trace') return programSessionRef.current?.traces
        return programSessionRef.current?.error
      },
    }).then((result) => {
      dispatchWorkbench({
        _tag: 'setScenarioExecution',
        payload: result.status === 'passed'
          ? {
              status: 'passed',
              scenarioRunId: result.scenarioRunId,
              scenarioId: result.scenarioId,
              durationMs: result.durationMs,
              stepResults: result.stepResults,
            }
          : {
              status: 'failed',
              scenarioRunId: result.scenarioRunId,
              scenarioId: result.scenarioId,
              durationMs: result.durationMs,
              stepResults: result.stepResults,
              failure: result.failure ?? {
                kind: 'scenario-runtime',
                classification: 'product-failure',
                stepId: scenario.id,
                message: 'Scenario failed without failure detail.',
              },
            },
      })
      dispatchWorkbench({ _tag: 'selectBottomTab', payload: 'Scenario' })
    })
  }, [dispatchAction, dispatchWorkbench, drivers, runtime, workbench, workspace])

  return (
    <PlaygroundErrorBoundary>
      <WorkbenchLayoutRoot
        workbench={workbench}
        workspace={workspace}
        projectSwitcher={projectSwitcher}
        backHref={backHref}
        backLabel={backLabel}
        onRun={runProgram}
        onCheck={checkProgram}
        onTrialStartup={trialStartup}
        onReset={resetProgramSession}
        onSelectFile={selectFile}
        onEditFile={editFile}
        onDispatch={dispatchAction}
        drivers={drivers}
        onRunDriver={runDriver}
        scenarios={scenarios}
        onRunScenario={(scenario) => runScenarioPlayback(scenario, 'all')}
        onStepScenario={(scenario) => runScenarioPlayback(scenario, 'step')}
        pressure={pressure}
      />
    </PlaygroundErrorBoundary>
  )
}

interface WorkbenchLayoutRootProps {
  readonly workbench: PlaygroundWorkbenchHandle
  readonly workspace: PlaygroundWorkspace
  readonly projectSwitcher?: React.ReactNode
  readonly backHref?: string
  readonly backLabel?: string
  readonly onRun: () => void
  readonly onCheck: () => void
  readonly onTrialStartup: () => void
  readonly onReset: () => void
  readonly onSelectFile: (path: string) => void
  readonly onEditFile: (path: string, content: string) => void
  readonly onDispatch: (action: ProgramSessionAction) => void
  readonly drivers: ReadonlyArray<InteractionDriver>
  readonly onRunDriver: (driver: InteractionDriver, exampleId?: string) => void
  readonly scenarios: ReadonlyArray<ScenarioPlayback>
  readonly onRunScenario: (scenario: ScenarioPlayback) => void
  readonly onStepScenario: (scenario: ScenarioPlayback) => void
  readonly pressure: ReturnType<typeof resolveVisualPressureFixture>
}

function WorkbenchLayoutRoot({
  workbench,
  workspace,
  projectSwitcher,
  backHref,
  backLabel,
  onRun,
  onCheck,
  onTrialStartup,
  onReset,
  onSelectFile,
  onEditFile,
  onDispatch,
  drivers,
  onRunDriver,
  scenarios,
  onRunScenario,
  onStepScenario,
  pressure,
}: WorkbenchLayoutRootProps): React.ReactElement {
  const layout = useSelector(workbench, selectLayout)
  const dispatchWorkbench = useDispatch(workbench) as (action: PlaygroundWorkbenchAction) => void

  return (
    <ResizableWorkbench
      layout={layout}
      onLayoutChange={(payload) => dispatchWorkbench({ _tag: 'resizeWorkbenchLayout', payload })}
      commandBar={(
        <CommandBarContainer
          workbench={workbench}
          workspace={workspace}
          projectSwitcher={projectSwitcher}
          onRun={onRun}
          onCheck={onCheck}
          onTrialStartup={onTrialStartup}
          onReset={onReset}
          backHref={backHref}
          backLabel={backLabel}
        />
      )}
      filesPanel={(
        <FilesPanelContainer
          workbench={workbench}
          workspace={workspace}
          onSelectFile={onSelectFile}
        />
      )}
      sourceEditor={(
        <SourcePanelContainer
          workbench={workbench}
          workspace={workspace}
          onEdit={onEditFile}
        />
      )}
      runtimeInspector={(
        <RuntimeInspectorContainer
          workbench={workbench}
          workspace={workspace}
          onReset={onReset}
          onDispatch={onDispatch}
          drivers={drivers}
          onRunDriver={onRunDriver}
          scenarios={scenarios}
          onRunScenario={onRunScenario}
          onStepScenario={onStepScenario}
          pressure={pressure}
        />
      )}
      bottomDrawer={(
        <BottomPanelContainer
          workbench={workbench}
          workspace={workspace}
          pressure={pressure}
        />
      )}
    />
  )
}

function CommandBarContainer({
  workbench,
  workspace,
  projectSwitcher,
  onRun,
  onCheck,
  onTrialStartup,
  onReset,
  backHref,
  backLabel,
}: {
  readonly workbench: PlaygroundWorkbenchHandle
  readonly workspace: PlaygroundWorkspace
  readonly projectSwitcher?: React.ReactNode
  readonly onRun: () => void
  readonly onCheck: () => void
  readonly onTrialStartup: () => void
  readonly onReset: () => void
  readonly backHref?: string
  readonly backLabel?: string
}): React.ReactElement {
  const workspaceRevision = useSelector(workbench, selectWorkspaceRevision)
  const runState = useSelector(workbench, selectRunState)
  const checkState = useSelector(workbench, selectCheckState)
  const trialStartupState = useSelector(workbench, selectTrialStartupState)
  const session = useSelector(workbench, selectProgramSession)
  const snapshot = React.useMemo(() => createProjectSnapshot(workspace), [workspace, workspaceRevision])

  return (
    <HostCommandBar
      snapshot={snapshot}
      projectSwitcher={projectSwitcher}
      runState={runState}
      checkState={checkState}
      trialStartupState={trialStartupState}
      session={session}
      onRun={onRun}
      onCheck={onCheck}
      onTrialStartup={onTrialStartup}
      onReset={onReset}
      backHref={backHref}
      backLabel={backLabel}
    />
  )
}

function FilesPanelContainer({
  workbench,
  workspace,
  onSelectFile,
}: {
  readonly workbench: PlaygroundWorkbenchHandle
  readonly workspace: PlaygroundWorkspace
  readonly onSelectFile: (path: string) => void
}): React.ReactElement {
  const activeFilePath = useSelector(workbench, selectActiveFile)

  return (
    <FilesPanel
      workspace={workspace}
      activeFilePath={activeFilePath}
      onSelectFile={onSelectFile}
    />
  )
}

function SourcePanelContainer({
  workbench,
  workspace,
  onEdit,
}: {
  readonly workbench: PlaygroundWorkbenchHandle
  readonly workspace: PlaygroundWorkspace
  readonly onEdit: (path: string, content: string) => void
}): React.ReactElement {
  const activeFilePath = useSelector(workbench, selectActiveFile)
  useSelector(workbench, selectWorkspaceRevision)

  return (
    <SourcePanel
      workspace={workspace}
      activeFilePath={activeFilePath}
      onEdit={onEdit}
    />
  )
}

function RuntimeInspectorContainer({
  workbench,
  workspace,
  onReset,
  onDispatch,
  drivers,
  onRunDriver,
  scenarios,
  onRunScenario,
  onStepScenario,
  pressure,
}: {
  readonly workbench: PlaygroundWorkbenchHandle
  readonly workspace: PlaygroundWorkspace
  readonly onReset: () => void
  readonly onDispatch: (action: ProgramSessionAction) => void
  readonly drivers: ReadonlyArray<InteractionDriver>
  readonly onRunDriver: (driver: InteractionDriver, exampleId?: string) => void
  readonly scenarios: ReadonlyArray<ScenarioPlayback>
  readonly onRunScenario: (scenario: ScenarioPlayback) => void
  readonly onStepScenario: (scenario: ScenarioPlayback) => void
  readonly pressure: ReturnType<typeof resolveVisualPressureFixture>
}): React.ReactElement {
  const workspaceRevision = useSelector(workbench, selectWorkspaceRevision)
  const session = useSelector(workbench, selectProgramSession)
  const runState = useSelector(workbench, selectRunState)
  const checkState = useSelector(workbench, selectCheckState)
  const trialStartupState = useSelector(workbench, selectTrialStartupState)
  const runtimeEvidence = useSelector(workbench, selectRuntimeEvidence)
  const checkExpanded = useSelector(workbench, selectCheckExpanded)
  const trialExpanded = useSelector(workbench, selectTrialExpanded)
  const activeTab = useSelector(workbench, selectActiveInspectorTab)
  const advancedDispatchExpanded = useSelector(workbench, selectAdvancedDispatchExpanded)
  const scenarioExecution = useSelector(workbench, selectScenarioExecution)
  const dispatchWorkbench = useDispatch(workbench) as (action: PlaygroundWorkbenchAction) => void
  const snapshot = React.useMemo(() => createProjectSnapshot(workspace), [workspace, workspaceRevision])
  const actionManifest = React.useMemo(() =>
    snapshot.programEntry
      ? projectActionManifestFromRuntimeEvidence(snapshot, runtimeEvidence.reflect)
      : unavailableActionManifest(snapshot, 'Project has no Program entry.'), [runtimeEvidence.reflect, snapshot])

  return (
    <RuntimeInspector
      snapshot={snapshot}
      session={session}
      actionManifest={actionManifest}
      runState={runState}
      checkState={checkState}
      trialStartupState={trialStartupState}
      runtimeEvidence={runtimeEvidence}
      checkExpanded={checkExpanded}
      trialExpanded={trialExpanded}
      activeTab={activeTab}
      onActiveTabChange={(tab) => dispatchWorkbench({ _tag: 'selectInspectorTab', payload: tab })}
      advancedDispatchExpanded={advancedDispatchExpanded}
      onReset={onReset}
      onDispatch={onDispatch}
      onAdvancedDispatchExpandedChange={(expanded) => dispatchWorkbench({ _tag: 'setAdvancedDispatchExpanded', payload: expanded })}
      drivers={drivers}
      onRunDriver={onRunDriver}
      scenarios={scenarios}
      scenarioExecution={scenarioExecution}
      onRunScenario={onRunScenario}
      onStepScenario={onStepScenario}
      pressure={pressure}
    />
  )
}

function BottomPanelContainer({
  workbench,
  workspace,
  pressure,
}: {
  readonly workbench: PlaygroundWorkbenchHandle
  readonly workspace: PlaygroundWorkspace
  readonly pressure: ReturnType<typeof resolveVisualPressureFixture>
}): React.ReactElement {
  const workspaceRevision = useSelector(workbench, selectWorkspaceRevision)
  const activeTab = useSelector(workbench, selectBottomTab)
  const session = useSelector(workbench, selectProgramSession)
  const checkState = useSelector(workbench, selectCheckState)
  const trialStartupState = useSelector(workbench, selectTrialStartupState)
  const runtimeEvidence = useSelector(workbench, selectRuntimeEvidence)
  const scenarioExecution = useSelector(workbench, selectScenarioExecution)
  const driverExecution = useSelector(workbench, selectDriverExecution)
  const layout = useSelector(workbench, selectLayout)
  const dispatchWorkbench = useDispatch(workbench) as (action: PlaygroundWorkbenchAction) => void
  const snapshot = React.useMemo(() => createProjectSnapshot(workspace), [workspace, workspaceRevision])
  const projection = React.useMemo(() => derivePlaygroundWorkbenchProjection({
    snapshot,
    programSession: session,
    runtimeEvidence,
    driverExecution,
    scenarioExecution,
    checkReport: checkState.status === 'passed' ? checkState.report : undefined,
    trialStartupReport: trialStartupState.status === 'passed' ? trialStartupState.report : undefined,
    compileFailure: checkState.status === 'failed' ? { message: checkState.message } : undefined,
  }), [checkState, driverExecution, runtimeEvidence, scenarioExecution, session, snapshot, trialStartupState])

  return (
    <WorkbenchBottomPanel
      activeTab={activeTab}
      collapsed={layout.bottomCollapsed}
      onSelectTab={(tab) => dispatchWorkbench({ _tag: 'selectBottomTab', payload: tab })}
      onCollapsedChange={(collapsed) => dispatchWorkbench({ _tag: 'setWorkbenchCollapsed', payload: { bottomCollapsed: collapsed } })}
      workspace={workspace}
      snapshot={snapshot}
      session={session}
      checkState={checkState}
      trialStartupState={trialStartupState}
      runtimeEvidence={runtimeEvidence}
      scenarioExecution={scenarioExecution}
      projection={projection}
      pressure={pressure}
    />
  )
}
