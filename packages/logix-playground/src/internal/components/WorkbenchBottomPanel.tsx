import React from 'react'
import type { RuntimeWorkbenchProjectionIndex } from '@logixjs/core/repo-internal/workbench-api'
import { projectControlPlaneDiagnosticRows } from '../diagnostics/controlPlaneDiagnostics.js'
import {
  makePressureTraceRows,
  type VisualPressureFixture,
} from '../pressure/pressureFixture.js'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import type { ProgramSessionState } from '../session/programSession.js'
import type { PlaygroundWorkspace } from '../session/workspace.js'
import type { ProgramPanelControlPlaneState, RuntimeEvidenceState, ScenarioExecutionState, WorkbenchBottomTab } from '../state/workbenchTypes.js'
import { SessionConsolePanel } from './SessionConsolePanel.js'
import { EvidenceCoordinateView, evidenceCoordinateFromEnvelope, formatEvidenceCoordinate } from './evidenceCoordinateView.js'
import { ChevronDownIcon, TrashIcon } from './icons.js'

export interface WorkbenchBottomPanelProps {
  readonly activeTab: WorkbenchBottomTab
  readonly collapsed?: boolean
  readonly onSelectTab: (tab: WorkbenchBottomTab) => void
  readonly onCollapsedChange?: (collapsed: boolean) => void
  readonly workspace: PlaygroundWorkspace
  readonly snapshot: ProjectSnapshot
  readonly session: ProgramSessionState | undefined
  readonly checkState: ProgramPanelControlPlaneState
  readonly trialStartupState: ProgramPanelControlPlaneState
  readonly runtimeEvidence?: RuntimeEvidenceState
  readonly scenarioExecution: ScenarioExecutionState
  readonly projection?: RuntimeWorkbenchProjectionIndex
  readonly pressure?: VisualPressureFixture
}

const visibleBottomTabs: ReadonlyArray<WorkbenchBottomTab> = ['Console', 'Trace', 'Snapshot']
const hiddenEvidenceTabs: ReadonlyArray<WorkbenchBottomTab> = ['Diagnostics', 'Scenario']

const formatChangedFiles = (workspace: PlaygroundWorkspace): ReadonlyArray<string> =>
  Array.from(workspace.files.values())
    .filter((file) => file.content !== file.originalContent)
    .map((file) => file.path)

export function WorkbenchBottomPanel({
  activeTab,
  collapsed = false,
  onSelectTab,
  onCollapsedChange,
  workspace,
  snapshot,
  session,
  checkState,
  trialStartupState,
  runtimeEvidence,
  scenarioExecution,
  projection,
  pressure,
}: WorkbenchBottomPanelProps): React.ReactElement {
  const changedFiles = React.useMemo(() => formatChangedFiles(workspace), [workspace, snapshot.revision])
  const latestEvidence = latestRuntimeEvidence(runtimeEvidence)
  const latestCoordinate = formatEvidenceCoordinate(evidenceCoordinateFromEnvelope(latestEvidence))
  const contentKey = makeBottomTabContentKey({
    activeTab,
    workspace,
    snapshot,
    session,
    checkState,
    trialStartupState,
    runtimeEvidence,
    scenarioExecution,
    projection,
    pressure,
  })
  const [clearedContentKeys, setClearedContentKeys] = React.useState<ReadonlySet<string>>(() => new Set())
  const activeTabCleared = clearedContentKeys.has(contentKey)
  const clearActiveTab = React.useCallback(() => {
    setClearedContentKeys((current) => {
      const next = new Set(current)
      next.add(contentKey)
      return next
    })
  }, [contentKey])

  return (
    <section
      aria-label="Workbench bottom console"
      {...(latestCoordinate ? { 'data-playground-evidence-coordinate': latestCoordinate } : {})}
      data-bottom-collapsed={collapsed ? 'true' : 'false'}
      className="flex h-full min-h-0 flex-col border-t border-gray-200 bg-white text-gray-800"
    >
      <div className="relative flex h-9 shrink-0 items-center border-b border-gray-200 bg-gray-50 px-4 text-xs font-medium">
        <div className="flex min-w-0 gap-6">
        {visibleBottomTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            data-playground-tab={tab.toLowerCase()}
            aria-pressed={activeTab === tab}
            onClick={() => onSelectTab(tab)}
              className="relative top-px py-2 text-gray-500 hover:text-gray-700 aria-pressed:border-b-2 aria-pressed:border-blue-600 aria-pressed:text-blue-600"
          >
            {tab}
          </button>
        ))}
        {hiddenEvidenceTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            data-playground-tab={tab.toLowerCase()}
            aria-pressed={activeTab === tab}
            onClick={() => onSelectTab(tab)}
            className="sr-only"
          >
            {tab}
          </button>
        ))}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 text-gray-400">
          <button
            type="button"
            aria-label="Clear current bottom tab"
            title="Clear current tab"
            onClick={clearActiveTab}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={collapsed ? 'Expand bottom panel' : 'Collapse bottom panel'}
            title={collapsed ? 'Expand' : 'Collapse'}
            onClick={() => onCollapsedChange?.(!collapsed)}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      {collapsed ? null : (
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTabCleared ? (
          <ClearedBottomTabDetail tab={activeTab} />
        ) : activeTab === 'Console' ? (
          <div
            className="h-full min-h-0"
            {...(latestCoordinate ? { 'data-playground-evidence-coordinate': latestCoordinate } : {})}
          >
            <EvidenceCoordinateView evidence={latestEvidence} />
            <SessionConsolePanel session={session} />
          </div>
        ) : null}
        {!activeTabCleared && activeTab === 'Diagnostics' ? (
          <section
            aria-label="Diagnostics detail"
            {...(latestCoordinate ? { 'data-playground-evidence-coordinate': latestCoordinate } : {})}
            data-playground-section="diagnostics-summary"
            className="flex h-full min-h-0 flex-col overflow-hidden p-3 text-xs text-gray-500"
          >
            <EvidenceCoordinateView evidence={latestEvidence} />
            <div className="grid shrink-0 gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                <div className="text-[11px] uppercase">Check</div>
                <div className="mt-1 font-mono text-gray-800">
                  {snapshot.diagnostics.check ? checkState.status : 'unavailable'}
                </div>
              </div>
              <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                <div className="text-[11px] uppercase">Trial</div>
                <div className="mt-1 font-mono text-gray-800">
                  {snapshot.diagnostics.trialStartup ? trialStartupState.status : 'unavailable'}
                </div>
              </div>
              <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                <div className="text-[11px] uppercase">Session</div>
                <div className="mt-1 font-mono text-gray-800">{session?.status ?? 'unavailable'}</div>
              </div>
            </div>
            <div className="mt-3 grid shrink-0 gap-2 sm:grid-cols-2">
              <ControlPlaneDiagnosticCard label="Check" state={checkState} />
              <ControlPlaneDiagnosticCard label="Trial" state={trialStartupState} />
            </div>
            <ControlPlaneDiagnosticsTable checkState={checkState} trialStartupState={trialStartupState} />
            {session?.error ? (
              <p role="alert" className="mt-3 shrink-0 rounded-md border border-red-200 bg-red-50 p-2 text-red-700">
                {session.error.kind}: {session.error.message}
              </p>
            ) : (
              <p className="mt-3 shrink-0">No session errors.</p>
            )}
          </section>
        ) : null}
        {!activeTabCleared && activeTab === 'Trace' ? (
          <TraceDetail session={session} projection={projection} pressure={pressure} runtimeEvidence={runtimeEvidence} />
        ) : null}
        {!activeTabCleared && activeTab === 'Snapshot' ? (
          <div className="h-full overflow-auto p-3 font-mono text-xs leading-5 text-gray-600">
            <pre
              aria-label="Snapshot summary"
              {...(latestCoordinate ? { 'data-playground-evidence-coordinate': latestCoordinate } : {})}
              className="whitespace-pre-wrap"
            >
              <EvidenceCoordinateView evidence={latestEvidence} />
              {JSON.stringify({
                projectId: snapshot.projectId,
                revision: snapshot.revision,
                activeFile: workspace.activeFile,
                programEntry: snapshot.programEntry?.entry ?? null,
                previewEntry: snapshot.previewEntry?.entry ?? null,
                fileCount: snapshot.files.size,
                changedFiles,
                evidenceCoordinate: latestCoordinate ?? null,
                projectionSessions: projection?.sessions.length ?? 0,
                projectionGaps: Object.keys(projection?.indexes?.gapsById ?? {}).length,
              }, null, 2)}
            </pre>
          </div>
        ) : null}
        {!activeTabCleared && activeTab === 'Scenario' ? (
          <ScenarioDetail execution={scenarioExecution} pressure={pressure} />
        ) : null}
      </div>
      )}
    </section>
  )
}

function ClearedBottomTabDetail({ tab }: { readonly tab: WorkbenchBottomTab }): React.ReactElement {
  const label = `${tab} detail`
  return (
    <section aria-label={label} className="h-full overflow-auto bg-white p-3 font-mono text-xs text-gray-500">
      {tab} cleared.
    </section>
  )
}

function makeBottomTabContentKey(input: {
  readonly activeTab: WorkbenchBottomTab
  readonly workspace: PlaygroundWorkspace
  readonly snapshot: ProjectSnapshot
  readonly session: ProgramSessionState | undefined
  readonly checkState: ProgramPanelControlPlaneState
  readonly trialStartupState: ProgramPanelControlPlaneState
  readonly runtimeEvidence: RuntimeEvidenceState | undefined
  readonly scenarioExecution: ScenarioExecutionState
  readonly projection: RuntimeWorkbenchProjectionIndex | undefined
  readonly pressure: VisualPressureFixture | undefined
}): string {
  if (input.activeTab === 'Console') {
    const lastLog = input.session?.logs[input.session.logs.length - 1]
    return [
      input.activeTab,
      input.session?.sessionId ?? 'none',
      input.session?.operationSeq ?? 0,
      input.session?.logs.length ?? 0,
      lastLog?.message ?? 'none',
    ].join(':')
  }

  if (input.activeTab === 'Trace') {
    return [
      input.activeTab,
      input.session?.traces.length ?? 0,
      input.projection?.sessions.length ?? 0,
      Object.keys(input.projection?.indexes?.gapsById ?? {}).length,
      input.runtimeEvidence?.dispatch?.operationCoordinate.opSeq
        ?? input.runtimeEvidence?.run?.operationCoordinate.opSeq
        ?? 0,
      input.pressure?.dataProfile.traceEvents ?? 0,
    ].join(':')
  }

  if (input.activeTab === 'Snapshot') {
    return [
      input.activeTab,
      input.snapshot.projectId,
      input.snapshot.revision,
      input.workspace.activeFile ?? 'none',
      input.snapshot.files.size,
      input.projection?.sessions.length ?? 0,
      Object.keys(input.projection?.indexes?.gapsById ?? {}).length,
    ].join(':')
  }

  if (input.activeTab === 'Diagnostics') {
    return [
      input.activeTab,
      input.checkState.status,
      input.trialStartupState.status,
      input.session?.status ?? 'none',
      input.session?.error?.message ?? 'none',
    ].join(':')
  }

  return [
    input.activeTab,
    input.scenarioExecution.status,
    input.scenarioExecution.stepResults.length,
    'scenarioId' in input.scenarioExecution ? input.scenarioExecution.scenarioId : 'none',
    input.pressure?.dataProfile.scenarioSteps ?? 0,
  ].join(':')
}

function TraceDetail({
  session,
  projection,
  pressure,
  runtimeEvidence,
}: {
  readonly session: ProgramSessionState | undefined
  readonly projection: RuntimeWorkbenchProjectionIndex | undefined
  readonly pressure: VisualPressureFixture | undefined
  readonly runtimeEvidence: RuntimeEvidenceState | undefined
}): React.ReactElement {
  const gaps = Object.values(projection?.indexes?.gapsById ?? {})
  const pressureRows = React.useMemo(() => makePressureTraceRows(pressure), [pressure])
  const latestEvidence = latestRuntimeEvidence(runtimeEvidence)
  const latestCoordinate = formatEvidenceCoordinate(evidenceCoordinateFromEnvelope(latestEvidence))

  if (pressureRows.length > 0) {
    return (
      <section
        aria-label="Trace detail"
        {...(latestCoordinate ? { 'data-playground-evidence-coordinate': latestCoordinate } : {})}
        data-playground-section="trace-table"
        className="h-full overflow-auto p-3 font-mono text-xs text-muted-foreground"
      >
        <EvidenceCoordinateView evidence={latestEvidence} />
        <div className="mb-2 flex items-center gap-2 text-foreground">
          <span className="font-semibold">{pressureRows.length}</span>
          <span>events</span>
        </div>
        <div className="min-w-[900px]">
          <div className="sticky top-0 grid grid-cols-[70px_150px_110px_180px_180px_minmax(240px,1fr)] border-b border-border bg-card py-2 font-semibold text-foreground">
            <span>seq</span>
            <span>time</span>
            <span>op</span>
            <span>source</span>
            <span>event</span>
            <span>delta</span>
          </div>
          {pressureRows.map((row) => (
            <div key={row.seq} className="grid grid-cols-[70px_150px_110px_180px_180px_minmax(240px,1fr)] border-b border-border/70 py-1">
              <span>{row.seq}</span>
              <span>{row.time}</span>
              <span>{row.op}</span>
              <span className="truncate text-primary">{row.source}</span>
              <span>{row.event}</span>
              <span className="truncate">{row.delta}</span>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (session?.traces.length || projection?.sessions.length || gaps.length) {
    return (
      <section
        aria-label="Trace detail"
        {...(latestCoordinate ? { 'data-playground-evidence-coordinate': latestCoordinate } : {})}
        className="h-full overflow-auto p-3 font-mono text-xs text-muted-foreground"
      >
        <EvidenceCoordinateView evidence={latestEvidence} />
        <div className="space-y-2">
        {session?.traces.map((trace) => (
          <div key={trace.traceId}>
            {trace.traceId}: {trace.label}
          </div>
        ))}
        {projection?.sessions.map((item) => (
          <div key={item.id}>
            authority {item.authorityRef.kind} / {item.status} / {item.inputKind}
          </div>
        ))}
        {gaps.map((gap) => (
          <div key={gap.id}>
            evidence-gap {gap.code}: {gap.summary}
          </div>
        ))}
        </div>
      </section>
    )
  }

  return (
    <section
      aria-label="Trace detail"
      {...(latestCoordinate ? { 'data-playground-evidence-coordinate': latestCoordinate } : {})}
      className="h-full overflow-auto p-3 font-mono text-xs text-muted-foreground"
    >
      <EvidenceCoordinateView evidence={latestEvidence} />
      No trace events captured.
    </section>
  )
}

function latestRuntimeEvidence(
  runtimeEvidence: RuntimeEvidenceState | undefined,
): RuntimeEvidenceState[keyof RuntimeEvidenceState] | undefined {
  return runtimeEvidence?.trialStartup
    ?? runtimeEvidence?.check
    ?? runtimeEvidence?.dispatch
    ?? runtimeEvidence?.run
    ?? runtimeEvidence?.reflect
}

function ScenarioDetail({
  execution,
  pressure,
}: {
  readonly execution: ScenarioExecutionState
  readonly pressure: VisualPressureFixture | undefined
}): React.ReactElement {
  const pressureStepCount = pressure?.dataProfile.scenarioSteps ?? 0
  const pressureSteps = pressureStepCount > 0
    ? Array.from({ length: pressureStepCount }, (_, index) => ({
        id: `step-${index + 1}`,
        label: index % 4 === 0 ? 'Change country' : index % 4 === 1 ? 'Wait cities' : index % 4 === 2 ? 'Select city' : 'Expect success',
        status: index < 3 ? 'passed' : 'waiting',
      }))
    : []

  return (
    <section
      aria-label="Scenario detail"
      data-playground-section="scenario"
      className="h-full overflow-auto p-3 text-xs text-muted-foreground"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded border border-border px-2 py-0.5">{execution.status}</span>
        {'scenarioId' in execution ? (
          <span className="rounded border border-border px-2 py-0.5 font-mono">{execution.scenarioId}</span>
        ) : null}
        {'scenarioRunId' in execution ? (
          <span className="rounded border border-border px-2 py-0.5 font-mono">{execution.scenarioRunId}</span>
        ) : null}
      </div>
      {pressureSteps.length ? (
        <div className="mt-3 divide-y divide-border rounded-md border border-border bg-background">
          {pressureSteps.map((step, index) => (
            <div key={step.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[11px]">{index + 1}</span>
              <span className="truncate text-foreground">{step.label}</span>
              <span className="rounded border border-border px-2 py-0.5 text-[11px]">{step.status}</span>
            </div>
          ))}
        </div>
      ) : execution.stepResults.length ? (
        <div className="mt-3 space-y-2">
          {execution.stepResults.map((step) => (
            <div key={step.stepId} className="rounded-md border border-border bg-background p-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-foreground">{step.stepId}</span>
                <span>{step.kind} / {step.status} / {step.durationMs}ms</span>
              </div>
              {step.failure ? (
                <p role="alert" className="mt-1 text-destructive">
                  {step.failure.kind}: {step.failure.message}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3">No scenario steps captured.</p>
      )}
    </section>
  )
}

function ControlPlaneDiagnosticsTable({
  checkState,
  trialStartupState,
}: {
  readonly checkState: ProgramPanelControlPlaneState
  readonly trialStartupState: ProgramPanelControlPlaneState
}): React.ReactElement {
  const rows = React.useMemo(
    () => projectControlPlaneDiagnosticRows({ checkState, trialStartupState }),
    [checkState, trialStartupState],
  )

  return (
    <div data-playground-section="diagnostics-table" className="mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-border bg-background">
      <div className="min-w-[980px]">
      <div className="sticky top-0 grid grid-cols-[92px_150px_220px_minmax(260px,1fr)_170px_260px] border-b border-border bg-card px-3 py-2 font-semibold text-foreground">
        <span>severity</span>
        <span>code</span>
        <span>source</span>
        <span>message</span>
        <span>authority</span>
        <span>evidence</span>
      </div>
      {rows.length === 0 ? (
        <div className="px-3 py-4 text-muted-foreground">No Check/Trial diagnostics captured.</div>
      ) : rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[92px_150px_220px_minmax(260px,1fr)_170px_260px] border-b border-border/70 px-3 py-1.5">
          <span>{row.severity}</span>
          <span className="font-mono">{row.code}</span>
          <span className="truncate text-primary">{row.source}</span>
          <span className="truncate text-foreground">{row.message}</span>
          <span className="font-mono">{row.authority}</span>
          <span className="truncate">{row.evidence}</span>
        </div>
      ))}
      </div>
    </div>
  )
}

function ControlPlaneDiagnosticCard({
  label,
  state,
}: {
  readonly label: string
  readonly state: ProgramPanelControlPlaneState
}): React.ReactElement {
  if (state.status === 'passed') {
    return (
      <section className="rounded-md border border-border bg-background p-2">
        <div className="text-[11px] uppercase">{label}</div>
        <div className="mt-1 font-mono text-foreground">
          {state.report.stage}/{state.report.mode} {state.report.verdict}
        </div>
        <p className="mt-1 text-foreground">{state.report.summary}</p>
      </section>
    )
  }

  if (state.status === 'failed') {
    return (
      <section className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-destructive">
        <div className="text-[11px] uppercase">{label}</div>
        <p className="mt-1">{state.message}</p>
      </section>
    )
  }

  return (
    <section className="rounded-md border border-border bg-background p-2">
      <div className="text-[11px] uppercase">{label}</div>
      <p className="mt-1 text-foreground">{state.status}</p>
    </section>
  )
}
