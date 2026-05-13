import React from 'react'
import type { ActionPanelViewModel } from '../action/actionManifest.js'
import type { InteractionDriver } from '../driver/driverModel.js'
import {
  projectControlPlaneDiagnosticRows,
  summarizeControlPlaneDiagnosticRows,
} from '../diagnostics/controlPlaneDiagnostics.js'
import { MonacoSourceEditor } from '../editor/MonacoSourceEditor.js'
import {
  makePressureStateRows,
  type PressureStateRow,
  type VisualPressureFixture,
} from '../pressure/pressureFixture.js'
import type { ScenarioExecutionState, ScenarioPlayback } from '../scenario/scenarioModel.js'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import type { ProgramSessionAction, ProgramSessionState } from '../session/programSession.js'
import type {
  ProgramPanelControlPlaneState,
  ProgramPanelRunState,
  RuntimeEvidenceState,
  WorkbenchInspectorTab,
} from '../state/workbenchTypes.js'
import { ActionManifestPanel } from './ActionManifestPanel.js'
import { DriverPanel } from './DriverPanel.js'
import { ProgramPanel } from './ProgramPanel.js'
import { ProgramSessionPanel } from './ProgramSessionPanel.js'
import { RawDispatchPanel } from './RawDispatchPanel.js'
import { ScenarioPanel } from './ScenarioPanel.js'
import { EvidenceCoordinateView, evidenceCoordinateFromEnvelope, formatEvidenceCoordinate } from './evidenceCoordinateView.js'

export interface RuntimeInspectorProps {
  readonly snapshot: ProjectSnapshot
  readonly session: ProgramSessionState | undefined
  readonly actionManifest: ActionPanelViewModel
  readonly runState: ProgramPanelRunState
  readonly checkState: ProgramPanelControlPlaneState
  readonly trialStartupState: ProgramPanelControlPlaneState
  readonly runtimeEvidence?: RuntimeEvidenceState
  readonly checkExpanded: boolean
  readonly trialExpanded: boolean
  readonly activeTab: WorkbenchInspectorTab
  readonly onActiveTabChange: (tab: WorkbenchInspectorTab) => void
  readonly advancedDispatchExpanded: boolean
  readonly onReset: () => void
  readonly onDispatch: (action: ProgramSessionAction) => void
  readonly onAdvancedDispatchExpandedChange: (expanded: boolean) => void
  readonly drivers?: ReadonlyArray<InteractionDriver>
  readonly onRunDriver?: (driver: InteractionDriver, exampleId?: string) => void
  readonly scenarios?: ReadonlyArray<ScenarioPlayback>
  readonly scenarioExecution: ScenarioExecutionState
  readonly onRunScenario?: (scenario: ScenarioPlayback) => void
  readonly onStepScenario?: (scenario: ScenarioPlayback) => void
  readonly pressure?: VisualPressureFixture
}

export function RuntimeInspector({
  snapshot,
  session,
  actionManifest,
  runState,
  checkState,
  trialStartupState,
  runtimeEvidence,
  checkExpanded,
  trialExpanded,
  activeTab,
  onActiveTabChange,
  advancedDispatchExpanded,
  onReset,
  onDispatch,
  onAdvancedDispatchExpandedChange,
  drivers = [],
  onRunDriver,
  scenarios = [],
  scenarioExecution,
  onRunScenario,
  onStepScenario,
  pressure,
}: RuntimeInspectorProps): React.ReactElement {
  const dispatchDisabled = !session || session.status === 'running' || session.stale
  const availableActionTags = React.useMemo<ReadonlySet<string>>(
    () => new Set(actionManifest.actions.map((action) => action.actionTag)),
    [actionManifest.actions],
  )
  const tabs = React.useMemo(() => {
    const base: Array<{ readonly id: WorkbenchInspectorTab; readonly label: string }> = [
      { id: 'actions', label: 'Actions' },
      { id: 'drivers', label: 'Drivers' },
      { id: 'result', label: 'Result' },
      { id: 'diagnostics', label: 'Diagnostics' },
    ]
    return base
  }, [])

  return (
    <section
      aria-label="Runtime inspector"
      className="flex h-full min-h-0 flex-col bg-white text-gray-800"
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-gray-200 px-4 text-xs font-medium">
        <div className="flex h-full min-w-0 items-center gap-5 overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={activeTab === tab.id}
            onClick={() => onActiveTabChange(tab.id)}
              className="flex h-full shrink-0 items-center border-b-2 border-transparent text-gray-500 transition-colors hover:text-gray-700 aria-pressed:border-blue-600 aria-pressed:text-blue-600"
          >
            {tab.label}
          </button>
        ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-[#fcfcfc]">
        {activeTab === 'actions' ? (
          <ActionLane
            snapshot={snapshot}
            session={session}
            pressure={pressure}
            actionManifest={actionManifest}
            runState={runState}
            checkState={checkState}
            trialStartupState={trialStartupState}
            runtimeEvidence={runtimeEvidence}
            checkExpanded={checkExpanded}
            trialExpanded={trialExpanded}
            disabled={dispatchDisabled}
            onReset={onReset}
            onDispatch={onDispatch}
            advancedDispatchExpanded={advancedDispatchExpanded}
            onAdvancedDispatchExpandedChange={onAdvancedDispatchExpandedChange}
            drivers={drivers}
            scenarios={scenarios}
            scenarioExecution={scenarioExecution}
            onRunDriver={onRunDriver}
            availableActionTags={availableActionTags}
            onRunScenario={onRunScenario}
            onStepScenario={onStepScenario}
          />
        ) : null}
        {activeTab === 'drivers' ? (
          <DriverLane
            session={session}
            pressure={pressure}
            drivers={drivers}
            scenarios={scenarios}
            scenarioExecution={scenarioExecution}
            disabled={dispatchDisabled}
            onRunDriver={onRunDriver}
            availableActionTags={availableActionTags}
            onRunScenario={onRunScenario}
            onStepScenario={onStepScenario}
            onShowScenario={() => onActiveTabChange('scenario')}
          />
        ) : null}
        {activeTab === 'result' ? (
          <section aria-label="Result" className="h-full overflow-auto p-3">
            <div className="space-y-3">
              <ProgramSessionPanel session={session} onReset={onReset} />
              <ProgramPanel
                snapshot={snapshot}
                runState={runState}
                checkState={checkState}
                trialStartupState={trialStartupState}
                runtimeEvidence={runtimeEvidence}
                checkExpanded={checkExpanded}
                trialExpanded={trialExpanded}
              />
            </div>
          </section>
        ) : null}
        {activeTab === 'diagnostics' ? (
          <DiagnosticsLane
            snapshot={snapshot}
            checkState={checkState}
            trialStartupState={trialStartupState}
          />
        ) : null}
        {activeTab === 'scenario' ? (
          <section className="h-full overflow-auto p-3">
            <ScenarioPanel
              scenarios={scenarios}
              execution={scenarioExecution}
              disabled={dispatchDisabled || !onRunScenario || !onStepScenario}
              onRunScenario={(scenario) => onRunScenario?.(scenario)}
              onStepScenario={(scenario) => onStepScenario?.(scenario)}
            />
          </section>
        ) : null}
      </div>
    </section>
  )
}

function ActionLane({
  snapshot,
  session,
  pressure,
  actionManifest,
  runState,
  checkState,
  trialStartupState,
  runtimeEvidence,
  checkExpanded,
  trialExpanded,
  disabled,
  onReset,
  onDispatch,
  advancedDispatchExpanded,
  onAdvancedDispatchExpandedChange,
  drivers,
  scenarios,
  scenarioExecution,
  onRunDriver,
  availableActionTags,
  onRunScenario,
  onStepScenario,
}: {
  readonly snapshot: ProjectSnapshot
  readonly session: ProgramSessionState | undefined
  readonly pressure: VisualPressureFixture | undefined
  readonly actionManifest: ActionPanelViewModel
  readonly runState: ProgramPanelRunState
  readonly checkState: ProgramPanelControlPlaneState
  readonly trialStartupState: ProgramPanelControlPlaneState
  readonly runtimeEvidence: RuntimeEvidenceState | undefined
  readonly checkExpanded: boolean
  readonly trialExpanded: boolean
  readonly disabled: boolean
  readonly onReset: () => void
  readonly onDispatch: (action: ProgramSessionAction) => void
  readonly advancedDispatchExpanded: boolean
  readonly onAdvancedDispatchExpandedChange: (expanded: boolean) => void
  readonly drivers: ReadonlyArray<InteractionDriver>
  readonly scenarios: ReadonlyArray<ScenarioPlayback>
  readonly scenarioExecution: ScenarioExecutionState
  readonly onRunDriver: ((driver: InteractionDriver, exampleId?: string) => void) | undefined
  readonly availableActionTags: ReadonlySet<string>
  readonly onRunScenario: ((scenario: ScenarioPlayback) => void) | undefined
  readonly onStepScenario: ((scenario: ScenarioPlayback) => void) | undefined
}): React.ReactElement {
  const stateRows = React.useMemo(() => makePressureStateRows(pressure), [pressure])
  const dispatchCoordinate = formatEvidenceCoordinate(evidenceCoordinateFromEnvelope(runtimeEvidence?.dispatch))

  return (
    <section aria-label="Action workbench" data-playground-section="actions" className="flex h-full min-h-0 flex-col overflow-hidden p-4">
      <section
        aria-label="State"
        data-playground-section="state"
        className="mb-4 max-h-[34%] min-h-[128px] shrink-0 overflow-auto rounded-md border border-gray-200 bg-white shadow-sm"
        style={{ maxHeight: '34%', minHeight: 128, overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-xs font-medium">
          <span>State</span>
          <span className="text-[11px] text-gray-500">{session?.status ?? 'unavailable'}</span>
        </div>
        {stateRows.length ? (
          <PressureStateTree rows={stateRows} />
        ) : (
          <pre
            aria-label="Action workbench state preview"
            {...(dispatchCoordinate ? { 'data-playground-evidence-coordinate': dispatchCoordinate } : {})}
            className="rounded-b-md bg-[#fafafa] p-3 font-mono text-[13px] leading-5 text-gray-800"
          >
            <EvidenceCoordinateView evidence={runtimeEvidence?.dispatch} />
            {JSON.stringify(session?.state ?? null, null, 2)}
          </pre>
        )}
      </section>
      <div className="min-h-0 flex-1 overflow-hidden">
        <ActionManifestPanel
          manifest={actionManifest}
          disabled={disabled}
          onDispatch={onDispatch}
          dense={pressure?.id === 'action-dense'}
        />
      </div>
      <div className="sr-only">
        <div>
          <RawDispatchPanel
            manifest={actionManifest}
            disabled={disabled}
            onDispatch={onDispatch}
            expanded={advancedDispatchExpanded}
            onExpandedChange={onAdvancedDispatchExpandedChange}
          />
        </div>
        <section aria-label="Result" className="space-y-3">
          <ProgramSessionPanel session={session} onReset={onReset} />
          <ProgramPanel
            snapshot={snapshot}
            runState={runState}
            checkState={checkState}
            trialStartupState={trialStartupState}
            runtimeEvidence={runtimeEvidence}
            checkExpanded={checkExpanded}
            trialExpanded={trialExpanded}
          />
          <DriverPanel
            drivers={drivers}
            availableActionTags={availableActionTags}
            disabled={disabled || !onRunDriver}
            onRunDriver={(driver, exampleId) => onRunDriver?.(driver, exampleId)}
          />
          <ScenarioPanel
            scenarios={scenarios}
            execution={scenarioExecution}
            disabled={disabled || !onRunScenario || !onStepScenario}
            onRunScenario={(scenario) => onRunScenario?.(scenario)}
            onStepScenario={(scenario) => onStepScenario?.(scenario)}
          />
        </section>
      </div>
    </section>
  )
}

function DriverLane({
  session,
  pressure,
  drivers,
  scenarios,
  scenarioExecution,
  disabled,
  onRunDriver,
  availableActionTags,
  onRunScenario,
  onStepScenario,
  onShowScenario,
}: {
  readonly session: ProgramSessionState | undefined
  readonly pressure: VisualPressureFixture | undefined
  readonly drivers: ReadonlyArray<InteractionDriver>
  readonly scenarios: ReadonlyArray<ScenarioPlayback>
  readonly scenarioExecution: ScenarioExecutionState
  readonly disabled: boolean
  readonly onRunDriver: ((driver: InteractionDriver, exampleId?: string) => void) | undefined
  readonly availableActionTags: ReadonlySet<string>
  readonly onRunScenario: ((scenario: ScenarioPlayback) => void) | undefined
  readonly onStepScenario: ((scenario: ScenarioPlayback) => void) | undefined
  readonly onShowScenario: () => void
}): React.ReactElement {
  return (
    <section data-playground-section="drivers" className="h-full min-h-0 overflow-auto">
      <div className="sticky top-0 z-[2] border-b border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Drivers</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">session {session?.status ?? 'unavailable'}</p>
          </div>
          {scenarios.length ? (
            <button type="button" onClick={onShowScenario} className="rounded-md border border-border px-2 py-1 text-xs">
              Scenario
            </button>
          ) : null}
        </div>
      </div>
      <div className="p-3">
        {pressure?.id === 'scenario-driver-payload' ? (
          <DriverPayloadPreview driver={drivers[1] ?? drivers[0]} payloadBytes={pressure.dataProfile.payloadBytes ?? 0} />
        ) : null}
        <DriverPanel
          drivers={drivers}
          availableActionTags={availableActionTags}
          disabled={disabled || !onRunDriver}
          onRunDriver={(driver, exampleId) => onRunDriver?.(driver, exampleId)}
        />
        <div className="mt-3">
          <ScenarioPanel
            scenarios={scenarios}
            execution={scenarioExecution}
            disabled={disabled || !onRunScenario || !onStepScenario}
            onRunScenario={(scenario) => onRunScenario?.(scenario)}
            onStepScenario={(scenario) => onStepScenario?.(scenario)}
          />
        </div>
      </div>
    </section>
  )
}

function DiagnosticsLane({
  snapshot,
  checkState,
  trialStartupState,
}: {
  readonly snapshot: ProjectSnapshot
  readonly checkState: ProgramPanelControlPlaneState
  readonly trialStartupState: ProgramPanelControlPlaneState
}): React.ReactElement {
  const rows = React.useMemo(
    () => projectControlPlaneDiagnosticRows({ checkState, trialStartupState }),
    [checkState, trialStartupState],
  )
  const summary = React.useMemo(() => summarizeControlPlaneDiagnosticRows(rows), [rows])

  return (
    <section aria-label="Diagnostics summary" data-playground-section="diagnostics-summary" className="h-full overflow-auto p-3">
      <div className="sticky top-0 z-[1] border-b border-border bg-card pb-3">
        <h2 className="text-sm font-semibold">Diagnostics</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <Metric label="errors" value={String(summary.errors)} />
          <Metric label="warnings" value={String(summary.warnings)} />
          <Metric label="info" value={String(summary.info)} />
        </div>
      </div>
      <div className="mt-3 space-y-2 text-xs">
        <Metric label="Check" value={snapshot.diagnostics.check ? checkState.status : 'unavailable'} />
        <Metric label="Trial" value={snapshot.diagnostics.trialStartup ? trialStartupState.status : 'unavailable'} />
        {rows.length === 0 ? (
          <div className="border-b border-border py-2 text-muted-foreground">No Check/Trial diagnostics captured.</div>
        ) : rows.slice(0, 12).map((row) => (
          <div key={row.id} className="grid grid-cols-[150px_1fr] gap-2 border-b border-border py-2">
            <span className="font-mono text-muted-foreground">{row.code}</span>
            <span className="truncate">{row.message}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function PressureStateTree({ rows }: { readonly rows: ReadonlyArray<PressureStateRow> }): React.ReactElement {
  return (
    <div className="p-3 font-mono text-xs" data-playground-section="state-tree">
      {rows.map((row, index) => (
        <div key={`${row.key}:${index}`} className="grid grid-cols-[minmax(0,1fr)_96px] gap-3 border-b border-border/70 py-1">
          <span className="truncate" style={{ paddingLeft: `${row.depth * 12}px` }}>
            {row.key}
          </span>
          <span className="truncate text-right text-muted-foreground">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

function DriverPayloadPreview({
  driver,
  payloadBytes,
}: {
  readonly driver: InteractionDriver | undefined
  readonly payloadBytes: number
}): React.ReactElement | null {
  const makePayloadText = React.useCallback(() => {
    const base = driver?.payload.kind === 'json' ? driver.payload.value ?? {} : {}
    if (payloadBytes <= 0) return JSON.stringify(base, null, 2)
    return JSON.stringify({
      ...base,
      fields: Array.from({ length: Math.max(24, Math.ceil(payloadBytes / 220)) }, (_, index) => ({
        key: `field_${String(index + 1).padStart(2, '0')}`,
        value: `driver-payload-${String(index + 1).padStart(3, '0')}`,
        source: index % 3 === 0 ? 'fixture' : index % 3 === 1 ? 'form' : 'scenario',
      })),
    }, null, 2)
  }, [driver, payloadBytes])
  const [payloadText, setPayloadText] = React.useState(makePayloadText)
  React.useEffect(() => {
    setPayloadText(makePayloadText())
  }, [makePayloadText])
  if (!driver || driver.payload.kind !== 'json') return null
  return (
    <section aria-label="Driver payload editor" className="mb-3 rounded-md border border-primary/40 bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <h3 className="text-xs font-semibold">{driver.label}</h3>
          <p className="text-[11px] text-muted-foreground">Payload JSON</p>
        </div>
        <span className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{driver.actionTag}</span>
      </div>
      <div data-playground-section="driver-payload" className="h-32 overflow-auto">
        <MonacoSourceEditor
          ariaLabel="Driver payload JSON"
          path={`/src/fixtures/${driver.id}.payload.json`}
          language="json"
          value={payloadText}
          onChange={setPayloadText}
          className="h-64 w-full overflow-hidden"
        />
      </div>
    </section>
  )
}

function Metric({ label, value }: { readonly label: string; readonly value: string }): React.ReactElement {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background px-2 py-1.5">
      <div className="truncate text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="truncate font-mono text-xs text-foreground">{value}</div>
    </div>
  )
}
