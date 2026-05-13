import React from 'react'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import type {
  ProgramPanelControlPlaneState,
  ProgramPanelRunState,
  RuntimeEvidenceState,
} from '../state/workbenchTypes.js'
import { EvidenceCoordinateView, formatEvidenceCoordinate, evidenceCoordinateFromEnvelope } from './evidenceCoordinateView.js'

export interface ProgramPanelProps {
  readonly snapshot: ProjectSnapshot
  readonly runState: ProgramPanelRunState
  readonly checkState: ProgramPanelControlPlaneState
  readonly trialStartupState: ProgramPanelControlPlaneState
  readonly runtimeEvidence?: RuntimeEvidenceState
  readonly checkExpanded: boolean
  readonly trialExpanded: boolean
}

export function ProgramPanel({
  snapshot,
  runState,
  checkState,
  trialStartupState,
  runtimeEvidence,
  checkExpanded,
  trialExpanded,
}: ProgramPanelProps): React.ReactElement {
  const runAvailable = Boolean(snapshot.programEntry)
  const runCoordinate = formatEvidenceCoordinate(evidenceCoordinateFromEnvelope(runtimeEvidence?.run))
  const checkCoordinate = formatEvidenceCoordinate(evidenceCoordinateFromEnvelope(runtimeEvidence?.check))
  const trialStartupCoordinate = formatEvidenceCoordinate(evidenceCoordinateFromEnvelope(runtimeEvidence?.trialStartup))
  const runValuePreview = runState.status === 'passed'
    ? {
        runId: runState.runId,
        value: runState.value,
        ...(runState.valueKind ? { valueKind: runState.valueKind } : null),
        ...(runState.lossy !== undefined ? { lossy: runState.lossy } : null),
        ...(runState.lossReasons ? { lossReasons: runState.lossReasons } : null),
      }
    : undefined

  return (
    <section
      aria-label="Program result"
      data-playground-section="run-result"
      className="rounded-md border border-gray-200 bg-white text-gray-800 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-2">
        <h2 className="text-xs font-medium">Program</h2>
        <span className="rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500">
          {runState.status}
        </span>
      </div>
      <div className="p-3">
        {!runAvailable && <p className="text-sm text-gray-500">Program unavailable</p>}
        {runState.status === 'running' && (
          <p className="text-sm text-gray-500">Running the current Program snapshot.</p>
        )}
        {runState.status === 'passed' && (
          <pre
            aria-label="Run result"
            {...(runCoordinate ? { 'data-playground-evidence-coordinate': runCoordinate } : {})}
            className="overflow-auto rounded-md bg-[#fafafa] p-3 font-mono text-xs leading-5 text-gray-800"
          >
            <EvidenceCoordinateView evidence={runtimeEvidence?.run} />
            {JSON.stringify(runValuePreview, null, 2)}
          </pre>
        )}
        {runState.status === 'failed' && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {runState.runId}: {runState.message}
          </p>
        )}
        {checkExpanded && (
          <section
            aria-label="Check report"
            {...(checkCoordinate ? { 'data-playground-evidence-coordinate': checkCoordinate } : {})}
            className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3"
          >
            <h3 className="text-sm font-medium">Check report</h3>
            <EvidenceCoordinateView evidence={runtimeEvidence?.check} />
            <ControlPlaneReportView state={checkState} />
          </section>
        )}
        {trialExpanded && (
          <section
            aria-label="Trial report"
            {...(trialStartupCoordinate ? { 'data-playground-evidence-coordinate': trialStartupCoordinate } : {})}
            className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3"
          >
            <h3 className="text-sm font-medium">Trial report</h3>
            <EvidenceCoordinateView evidence={runtimeEvidence?.trialStartup} />
            <ControlPlaneReportView state={trialStartupState} />
          </section>
        )}
        {runState.status === 'idle' && runAvailable && (
          <p className="text-sm text-gray-500">Run Result idle for revision r{snapshot.revision}.</p>
        )}
      </div>
    </section>
  )
}

function ControlPlaneReportView({
  state,
}: {
  readonly state: ProgramPanelControlPlaneState
}): React.ReactElement {
  if (state.status === 'idle') {
    return <p className="mt-2 text-sm text-gray-500">No report captured.</p>
  }

  if (state.status === 'running') {
    return <p className="mt-2 text-sm text-gray-500">Running verification command.</p>
  }

  if (state.status === 'failed') {
    return (
      <p
        role="alert"
        className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700"
      >
        {state.message}
      </p>
    )
  }

  return (
    <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
      <div className="rounded border border-gray-200 bg-white p-2">
        <dt className="text-gray-500">Stage</dt>
        <dd className="font-mono text-gray-800">{state.report.stage}</dd>
      </div>
      <div className="rounded border border-gray-200 bg-white p-2">
        <dt className="text-gray-500">Mode</dt>
        <dd className="font-mono text-gray-800">{state.report.mode}</dd>
      </div>
      <div className="rounded border border-gray-200 bg-white p-2">
        <dt className="text-gray-500">Verdict</dt>
        <dd className="font-mono text-gray-800">{state.report.verdict}</dd>
      </div>
      <div className="rounded border border-gray-200 bg-white p-2">
        <dt className="text-gray-500">Next</dt>
        <dd className="font-mono text-gray-800">{state.report.nextRecommendedStage ?? 'done'}</dd>
      </div>
      <div className="col-span-2 rounded border border-gray-200 bg-white p-2">
        <dt className="text-gray-500">Summary</dt>
        <dd className="text-gray-800">{state.report.summary}</dd>
      </div>
    </dl>
  )
}
