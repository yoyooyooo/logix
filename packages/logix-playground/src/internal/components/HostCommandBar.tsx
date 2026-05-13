import React from 'react'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import type { ProgramSessionState } from '../session/programSession.js'
import type {
  ProgramPanelControlPlaneState,
  ProgramPanelRunState,
} from '../state/workbenchTypes.js'
import {
  BeakerIcon,
  CheckCircleIcon,
  CircleIcon,
  GitBranchIcon,
  PlayIcon,
  RotateCcwIcon,
} from './icons.js'

export interface HostCommandBarProps {
  readonly snapshot: ProjectSnapshot
  readonly projectSwitcher?: React.ReactNode
  readonly runState: ProgramPanelRunState
  readonly checkState: ProgramPanelControlPlaneState
  readonly trialStartupState: ProgramPanelControlPlaneState
  readonly session: ProgramSessionState | undefined
  readonly onRun: () => void
  readonly onCheck: () => void
  readonly onTrialStartup: () => void
  readonly onReset: () => void
  readonly backHref?: string
  readonly backLabel?: string
}

export function HostCommandBar({
  snapshot,
  projectSwitcher,
  runState,
  checkState,
  trialStartupState,
  session,
  onRun,
  onCheck,
  onTrialStartup,
  onReset,
  backHref,
  backLabel = 'Back',
}: HostCommandBarProps): React.ReactElement {
  const runAvailable = Boolean(snapshot.programEntry)
  const sessionReady = session?.status === 'ready'

  return (
    <div
      aria-label="Workbench command bar"
      className="flex h-12 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 text-gray-800"
    >
      <div className="flex min-w-0 items-center gap-4">
        {backHref ? (
          <a
            href={backHref}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            {backLabel}
          </a>
        ) : null}
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white">
            L
          </span>
          <span className="font-semibold text-gray-900">Logix Playground</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 text-xs">
          {projectSwitcher ?? (
            <div className="relative flex min-w-0 items-center rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-gray-600 transition-colors hover:bg-gray-200">
              <GitBranchIcon className="mr-1 h-3 w-3 shrink-0" />
              <span className="truncate font-mono">{snapshot.projectId}</span>
            </div>
          )}
          <div className="flex cursor-pointer items-center rounded-md border border-gray-200 px-2 py-1 font-mono text-gray-600 transition-colors hover:bg-gray-50">
            r{snapshot.revision}
          </div>
          <div className="flex cursor-pointer items-center rounded-md border border-green-200 bg-green-50 px-2 py-1 text-green-700">
            <CircleIcon className="mr-1.5 h-2 w-2 fill-green-500 text-green-500" />
            {sessionReady ? 'session ready' : session?.status ?? 'session unavailable'}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs font-medium">
        <button
          type="button"
          disabled={!runAvailable || runState.status === 'running'}
          onClick={onRun}
          className="flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          title={!runAvailable ? 'Program entry is unavailable' : undefined}
        >
          <PlayIcon className="mr-1.5 h-3.5 w-3.5 fill-current" />
          {runState.status === 'running' ? 'Running' : 'Run'}
        </button>
        <button
          type="button"
          disabled={!snapshot.diagnostics.check || checkState.status === 'running'}
          onClick={onCheck}
          className="flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          title={!snapshot.diagnostics.check ? 'Runtime.check is unavailable for this project' : undefined}
        >
          <CheckCircleIcon className="mr-1.5 h-3.5 w-3.5" />
          {checkState.status === 'running' ? 'Checking' : 'Check'}
        </button>
        <button
          type="button"
          disabled={!snapshot.diagnostics.trialStartup || trialStartupState.status === 'running'}
          onClick={onTrialStartup}
          className="flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-green-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          title={!snapshot.diagnostics.trialStartup ? 'Startup trial is unavailable for this project' : undefined}
        >
          <BeakerIcon className="mr-1.5 h-3.5 w-3.5" />
          {trialStartupState.status === 'running' ? 'Trialing' : 'Trial'}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-50"
        >
          <RotateCcwIcon className="mr-1.5 h-3.5 w-3.5" />
          Reset
        </button>
      </div>
    </div>
  )
}
