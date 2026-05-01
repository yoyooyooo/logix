import type { VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import type {
  PlaygroundRuntimeEvidenceEnvelope,
  PlaygroundRuntimeOperationKind,
} from '../runner/runtimeEvidence.js'
import type { ScenarioExecutionState } from '../scenario/scenarioModel.js'

export type WorkbenchBottomTab = 'Console' | 'Diagnostics' | 'Trace' | 'Snapshot' | 'Scenario'

export type WorkbenchInspectorTab = 'actions' | 'drivers' | 'result' | 'diagnostics' | 'scenario'

export type EditorHostEngine = 'monaco' | 'textarea'

export type EditorHostStatus = 'idle' | 'loading' | 'ready' | 'error'

export type EditorTypeBundleStatus = 'idle' | 'loading' | 'ready' | 'stale' | 'error'

export interface WorkbenchLayoutState {
  readonly filesWidth: number
  readonly inspectorWidth: number
  readonly bottomHeight: number
  readonly filesCollapsed: boolean
  readonly bottomCollapsed: boolean
}

export interface EditorHostDiagnostic {
  readonly path: string
  readonly message: string
  readonly severity: 'info' | 'warning' | 'error'
}

export interface EditorHostState {
  readonly engine: EditorHostEngine
  readonly activeModelUri?: string
  readonly languageServiceStatus: EditorHostStatus
  readonly typeBundleStatus: EditorTypeBundleStatus
  readonly fallbackReason?: string
  readonly loadedTypePackages: ReadonlyArray<string>
  readonly diagnostics: ReadonlyArray<EditorHostDiagnostic>
}

export interface WorkbenchInspectorState {
  readonly activeInspectorTab: WorkbenchInspectorTab
  readonly advancedDispatchExpanded: boolean
  readonly selectedDriverId?: string
  readonly selectedScenarioId?: string
  readonly driverExecution: DriverExecutionState
  readonly scenarioExecution: ScenarioExecutionState
}

export interface RuntimeEvidenceState {
  readonly reflect?: PlaygroundRuntimeEvidenceEnvelope
  readonly run?: PlaygroundRuntimeEvidenceEnvelope
  readonly dispatch?: PlaygroundRuntimeEvidenceEnvelope
  readonly check?: PlaygroundRuntimeEvidenceEnvelope
  readonly trialStartup?: PlaygroundRuntimeEvidenceEnvelope
}

export type RuntimeEvidenceLane = PlaygroundRuntimeOperationKind

export type DriverExecutionState =
  | { readonly status: 'idle' }
  | { readonly status: 'running'; readonly driverId: string }
  | { readonly status: 'passed'; readonly driverId: string }
  | { readonly status: 'failed'; readonly driverId: string; readonly message: string }

export type { ScenarioExecutionState }

export type ProgramPanelRunState =
  | { readonly status: 'idle' }
  | { readonly status: 'running' }
  | {
      readonly status: 'passed'
      readonly runId: string
      readonly value: unknown
      readonly valueKind?: 'json' | 'null' | 'undefined' | 'void' | 'stringified' | 'truncated'
      readonly lossy?: boolean
      readonly lossReasons?: ReadonlyArray<string>
    }
  | { readonly status: 'failed'; readonly runId: string; readonly message: string }

export type ProgramPanelControlPlaneState =
  | { readonly status: 'idle' }
  | { readonly status: 'running' }
  | { readonly status: 'passed'; readonly report: VerificationControlPlaneReport }
  | { readonly status: 'failed'; readonly message: string }
