import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createOperationAcceptedEvent, createOperationCompletedEvent, createRuntimeOperationEvidenceGap } from '@logixjs/core/repo-internal/reflection-api'
import { createProjectSnapshot } from '../snapshot/projectSnapshot.js'
import { createPlaygroundWorkspace } from '../session/workspace.js'
import type { ProgramPanelControlPlaneState, ScenarioExecutionState, WorkbenchBottomTab } from '../state/workbenchTypes.js'
import type { ProgramSessionState } from '../session/programSession.js'
import { createRuntimeEvidenceEnvelope } from '../runner/runtimeEvidence.js'
import { derivePlaygroundWorkbenchProjection } from '../summary/workbenchProjection.js'
import { localCounterProjectFixture } from '../../../test/support/projectFixtures.js'
import { makeCheckImportFailureState, makeTrialMissingConfigState } from '../../../test/support/controlPlaneDiagnosticFixtures.js'
import { WorkbenchBottomPanel } from './WorkbenchBottomPanel.js'

const workspace = createPlaygroundWorkspace(localCounterProjectFixture)
const snapshot = createProjectSnapshot(workspace)

const idleControlPlaneState: ProgramPanelControlPlaneState = { status: 'idle' }
const passedScenarioState: ScenarioExecutionState = {
  status: 'passed',
  scenarioRunId: 'scenario-run-1',
  scenarioId: 'counter-demo',
  durationMs: 9,
  stepResults: [
    { stepId: 'increase-once', kind: 'driver', status: 'passed', durationMs: 4, result: { actionTag: 'increment' } },
    { stepId: 'expect-state', kind: 'expect', status: 'passed', durationMs: 1, result: { target: 'state' } },
  ],
}

const consoleSession: ProgramSessionState = {
  sessionId: 'logix-react.local-counter:r0:s1',
  projectId: 'logix-react.local-counter',
  revision: 0,
  status: 'ready',
  operationSeq: 1,
  stale: false,
  logs: [
    {
      level: 'info',
      source: 'session',
      message: 'session started logix-react.local-counter:r0:s1',
      sessionId: 'logix-react.local-counter:r0:s1',
    },
  ],
  traces: [],
}

describe('WorkbenchBottomPanel', () => {
  it('collapses to the tab bar and flips the expand control', () => {
    let collapsed = false
    const view = render(
      <WorkbenchBottomPanel
        activeTab="Console"
        collapsed={collapsed}
        onCollapsedChange={(next) => {
          collapsed = next
        }}
        onSelectTab={() => {}}
        workspace={workspace}
        snapshot={snapshot}
        session={consoleSession}
        checkState={idleControlPlaneState}
        trialStartupState={idleControlPlaneState}
        scenarioExecution={passedScenarioState}
        projection={derivePlaygroundWorkbenchProjection({ snapshot })}
      />,
    )
    const bottom = screen.getByRole('region', { name: 'Workbench bottom console' })

    expect(within(bottom).getByLabelText('Console detail').textContent).toContain('session started')

    fireEvent.click(within(bottom).getByRole('button', { name: 'Collapse bottom panel' }))
    view.rerender(
      <WorkbenchBottomPanel
        activeTab="Console"
        collapsed={collapsed}
        onCollapsedChange={(next) => {
          collapsed = next
        }}
        onSelectTab={() => {}}
        workspace={workspace}
        snapshot={snapshot}
        session={consoleSession}
        checkState={idleControlPlaneState}
        trialStartupState={idleControlPlaneState}
        scenarioExecution={passedScenarioState}
        projection={derivePlaygroundWorkbenchProjection({ snapshot })}
      />,
    )

    expect(bottom.getAttribute('data-bottom-collapsed')).toBe('true')
    expect(within(bottom).queryByLabelText('Console detail')).toBeNull()
    expect(within(bottom).getByRole('button', { name: 'Expand bottom panel' })).toBeTruthy()

    fireEvent.click(within(bottom).getByRole('button', { name: 'Expand bottom panel' }))
    view.rerender(
      <WorkbenchBottomPanel
        activeTab="Console"
        collapsed={collapsed}
        onCollapsedChange={(next) => {
          collapsed = next
        }}
        onSelectTab={() => {}}
        workspace={workspace}
        snapshot={snapshot}
        session={consoleSession}
        checkState={idleControlPlaneState}
        trialStartupState={idleControlPlaneState}
        scenarioExecution={passedScenarioState}
        projection={derivePlaygroundWorkbenchProjection({ snapshot })}
      />,
    )

    expect(bottom.getAttribute('data-bottom-collapsed')).toBe('false')
    expect(within(bottom).getByLabelText('Console detail').textContent).toContain('session started')
  })

  it('clears only the active bottom tab display buffer', () => {
    let activeTab: WorkbenchBottomTab = 'Console'
    const view = render(
      <WorkbenchBottomPanel
        activeTab={activeTab}
        onSelectTab={(tab) => {
          activeTab = tab
        }}
        workspace={workspace}
        snapshot={snapshot}
        session={consoleSession}
        checkState={idleControlPlaneState}
        trialStartupState={idleControlPlaneState}
        scenarioExecution={passedScenarioState}
        projection={derivePlaygroundWorkbenchProjection({ snapshot })}
      />,
    )
    const bottom = screen.getByRole('region', { name: 'Workbench bottom console' })

    expect(within(bottom).getByLabelText('Console detail').textContent).toContain('session started')
    fireEvent.click(within(bottom).getByRole('button', { name: 'Clear current bottom tab' }))
    expect(within(bottom).getByLabelText('Console detail').textContent).toContain('Console cleared.')

    fireEvent.click(within(bottom).getByRole('button', { name: 'Trace' }))
    view.rerender(
      <WorkbenchBottomPanel
        activeTab={activeTab}
        onSelectTab={(tab) => {
          activeTab = tab
        }}
        workspace={workspace}
        snapshot={snapshot}
        session={consoleSession}
        checkState={idleControlPlaneState}
        trialStartupState={idleControlPlaneState}
        scenarioExecution={passedScenarioState}
        projection={derivePlaygroundWorkbenchProjection({ snapshot })}
      />,
    )

    expect(within(bottom).getByLabelText('Trace detail').textContent).toContain('evidence-gap')
  })

  it('switches visible bottom tab content through stable regions', () => {
    let activeTab: WorkbenchBottomTab = 'Console'
    const renderPanel = () =>
      render(
        <WorkbenchBottomPanel
          activeTab={activeTab}
          onSelectTab={(tab) => {
            activeTab = tab
          }}
          workspace={workspace}
          snapshot={snapshot}
          session={undefined}
          checkState={idleControlPlaneState}
          trialStartupState={idleControlPlaneState}
          scenarioExecution={passedScenarioState}
          projection={derivePlaygroundWorkbenchProjection({ snapshot })}
        />,
      )

    const view = renderPanel()
    const bottom = screen.getByRole('region', { name: 'Workbench bottom console' })

    expect(within(bottom).getByLabelText('Console detail').textContent).toContain('No logs captured.')

    fireEvent.click(within(bottom).getByRole('button', { name: 'Diagnostics' }))
    view.rerender(
      <WorkbenchBottomPanel
        activeTab={activeTab}
        onSelectTab={(tab) => {
          activeTab = tab
        }}
        workspace={workspace}
        snapshot={snapshot}
        session={undefined}
        checkState={idleControlPlaneState}
        trialStartupState={idleControlPlaneState}
        scenarioExecution={passedScenarioState}
        projection={derivePlaygroundWorkbenchProjection({ snapshot })}
      />,
    )
    expect(within(bottom).getByLabelText('Diagnostics detail').textContent).toContain('Check')

    fireEvent.click(within(bottom).getByRole('button', { name: 'Trace' }))
    view.rerender(
      <WorkbenchBottomPanel
        activeTab={activeTab}
        onSelectTab={(tab) => {
          activeTab = tab
        }}
        workspace={workspace}
        snapshot={snapshot}
        session={undefined}
        checkState={idleControlPlaneState}
        trialStartupState={idleControlPlaneState}
        scenarioExecution={passedScenarioState}
        projection={derivePlaygroundWorkbenchProjection({ snapshot })}
      />,
    )
    expect(within(bottom).getByLabelText('Trace detail').textContent).toContain('evidence-gap')

    fireEvent.click(within(bottom).getByRole('button', { name: 'Snapshot' }))
    view.rerender(
      <WorkbenchBottomPanel
        activeTab={activeTab}
        onSelectTab={(tab) => {
          activeTab = tab
        }}
        workspace={workspace}
        snapshot={snapshot}
        session={undefined}
        checkState={idleControlPlaneState}
        trialStartupState={idleControlPlaneState}
        scenarioExecution={passedScenarioState}
        projection={derivePlaygroundWorkbenchProjection({ snapshot })}
      />,
    )
    expect(within(bottom).getByLabelText('Snapshot summary').textContent).toContain('logix-react.local-counter')
  })

  it('renders diagnostics detail rows from real control-plane reports only', () => {
    render(
      <WorkbenchBottomPanel
        activeTab="Diagnostics"
        onSelectTab={() => {}}
        workspace={workspace}
        snapshot={snapshot}
        session={undefined}
        checkState={makeCheckImportFailureState()}
        trialStartupState={makeTrialMissingConfigState()}
        scenarioExecution={passedScenarioState}
        projection={derivePlaygroundWorkbenchProjection({ snapshot })}
      />,
    )

    const bottom = screen.getByRole('region', { name: 'Workbench bottom console' })
    const diagnostics = within(bottom).getByRole('region', { name: 'Diagnostics detail' })

    expect(diagnostics.textContent).toContain('PROGRAM_IMPORT_INVALID')
    expect(diagnostics.textContent).toContain('MissingDependency')
    expect(diagnostics.textContent).toContain('Program.capabilities.imports[2]')
    expect(diagnostics.textContent).toContain('config:MISSING_CONFIG_KEY')
    expect(diagnostics.textContent).toContain('runtime.check/static')
    expect(diagnostics.textContent).toContain('runtime.trial/startup')
    expect(diagnostics.textContent).not.toContain('Pressure diagnostic')
    expect(diagnostics.textContent).not.toContain('LC-0001')
  })

  it('shows scenario step evidence in the bottom drawer scenario tab', () => {
    render(
      <WorkbenchBottomPanel
        activeTab="Scenario"
        onSelectTab={() => {}}
        workspace={workspace}
        snapshot={snapshot}
        session={undefined}
        checkState={idleControlPlaneState}
        trialStartupState={idleControlPlaneState}
        scenarioExecution={passedScenarioState}
        projection={derivePlaygroundWorkbenchProjection({ snapshot })}
      />,
    )

    expect(screen.getByRole('button', { name: 'Scenario' }).getAttribute('data-playground-tab')).toBe('scenario')
    expect(screen.getByLabelText('Scenario detail').textContent).toContain('counter-demo')
    expect(screen.getByLabelText('Scenario detail').textContent).toContain('increase-once')
    expect(screen.getByLabelText('Scenario detail').textContent).toContain('expect-state')
  })

  it('shows runtime operation events and evidence gap classifications in trace and snapshot lanes', () => {
    const runtimeEvidence = createRuntimeEvidenceEnvelope({
      snapshot,
      operationKind: 'dispatch',
      opSeq: 1,
      minimumActionManifest: {
        manifestVersion: 'program-action-manifest@167A',
        programId: snapshot.projectId,
        moduleId: 'FixtureCounter',
        revision: snapshot.revision,
        digest: 'manifest:counter',
        actions: [{ actionTag: 'increment', payload: { kind: 'void' }, authority: 'runtime-reflection' }],
      },
      operationEvents: [
        createOperationAcceptedEvent({
          instanceId: `${snapshot.projectId}:r${snapshot.revision}`,
          txnSeq: snapshot.revision,
          opSeq: 1,
          operationKind: 'dispatch',
          actionTag: 'increment',
        }),
        createOperationCompletedEvent({
          instanceId: `${snapshot.projectId}:r${snapshot.revision}`,
          txnSeq: snapshot.revision,
          opSeq: 1,
          operationKind: 'dispatch',
          actionTag: 'increment',
        }),
      ],
      artifactRefs: [],
      evidenceGaps: [
        createRuntimeOperationEvidenceGap({
          instanceId: `${snapshot.projectId}:r${snapshot.revision}`,
          txnSeq: snapshot.revision,
          opSeq: 1,
          operationKind: 'dispatch',
          actionTag: 'increment',
          code: 'runtime-trace-sample-gap',
          message: 'Runtime trace sample gap.',
        }),
      ],
    })
    const projection = derivePlaygroundWorkbenchProjection({
      snapshot,
      runtimeEvidence: { dispatch: runtimeEvidence },
    })
    const view = render(
      <WorkbenchBottomPanel
        activeTab="Trace"
        onSelectTab={() => {}}
        workspace={workspace}
        snapshot={snapshot}
        session={undefined}
        checkState={idleControlPlaneState}
        trialStartupState={idleControlPlaneState}
        scenarioExecution={passedScenarioState}
        projection={projection}
      />,
    )

    const traceText = screen.getByLabelText('Trace detail').textContent ?? ''
    expect(traceText).toContain('operation.accepted')
    expect(traceText).toContain('operation.completed')
    expect(traceText).toContain('evidence-gap runtime-trace-sample-gap')

    view.rerender(
      <WorkbenchBottomPanel
        activeTab="Snapshot"
        onSelectTab={() => {}}
        workspace={workspace}
        snapshot={snapshot}
        session={undefined}
        checkState={idleControlPlaneState}
        trialStartupState={idleControlPlaneState}
        scenarioExecution={passedScenarioState}
        projection={projection}
      />,
    )

    expect(screen.getByLabelText('Snapshot summary').textContent).toContain('projectionSessions')
    expect(screen.getByLabelText('Snapshot summary').textContent).toContain('projectionGaps')
  })
})
