import * as Logix from '@logixjs/core'
import { Schema } from 'effect'
import type { ProgramSessionAction, ProgramSessionState } from '../session/programSession.js'
import type {
  DriverExecutionState,
  EditorHostState,
  ProgramPanelControlPlaneState,
  ProgramPanelRunState,
  RuntimeEvidenceLane,
  RuntimeEvidenceState,
  ScenarioExecutionState,
  WorkbenchBottomTab,
  WorkbenchInspectorState,
  WorkbenchInspectorTab,
  WorkbenchLayoutState,
} from './workbenchTypes.js'
import type { PlaygroundRuntimeEvidenceEnvelope } from '../runner/runtimeEvidence.js'

const WorkbenchLayoutStateSchema = Schema.Struct({
  filesWidth: Schema.Number,
  inspectorWidth: Schema.Number,
  bottomHeight: Schema.Number,
  filesCollapsed: Schema.Boolean,
  bottomCollapsed: Schema.Boolean,
}) as Schema.Schema<WorkbenchLayoutState>
const EditorHostDiagnosticSchema = Schema.Struct({
  path: Schema.String,
  message: Schema.String,
  severity: Schema.Literals(['info', 'warning', 'error']),
})
const EditorHostStateSchema = Schema.Struct({
  engine: Schema.Literals(['monaco', 'textarea']),
  activeModelUri: Schema.optional(Schema.String),
  languageServiceStatus: Schema.Literals(['idle', 'loading', 'ready', 'error']),
  typeBundleStatus: Schema.Literals(['idle', 'loading', 'ready', 'stale', 'error']),
  fallbackReason: Schema.optional(Schema.String),
  loadedTypePackages: Schema.Array(Schema.String),
  diagnostics: Schema.Array(EditorHostDiagnosticSchema),
}) as Schema.Schema<EditorHostState>
const WorkbenchInspectorTabSchema = Schema.Literals([
  'actions',
  'drivers',
  'result',
  'diagnostics',
  'scenario',
]) as Schema.Schema<WorkbenchInspectorTab>
const WorkbenchInspectorStateSchema = Schema.Struct({
  activeInspectorTab: WorkbenchInspectorTabSchema,
  advancedDispatchExpanded: Schema.Boolean,
  selectedDriverId: Schema.optional(Schema.String),
  selectedScenarioId: Schema.optional(Schema.String),
  driverExecution: Schema.Unknown as Schema.Schema<DriverExecutionState>,
  scenarioExecution: Schema.Unknown as Schema.Schema<ScenarioExecutionState>,
}) as Schema.Schema<WorkbenchInspectorState>
const ProgramPanelRunStateSchema = Schema.Unknown as Schema.Schema<ProgramPanelRunState>
const ProgramPanelControlPlaneStateSchema = Schema.Unknown as Schema.Schema<ProgramPanelControlPlaneState>
const RuntimeEvidenceStateSchema = Schema.Unknown as Schema.Schema<RuntimeEvidenceState>
const ProgramSessionStateSchema = Schema.UndefinedOr(Schema.Unknown) as Schema.Schema<ProgramSessionState | undefined>
const ProgramSessionActionsSchema = Schema.Array(Schema.Unknown) as Schema.Schema<ReadonlyArray<ProgramSessionAction>>
const BottomTabSchema = Schema.Literals(['Console', 'Diagnostics', 'Trace', 'Snapshot', 'Scenario']) as Schema.Schema<WorkbenchBottomTab>
const idleRunState: ProgramPanelRunState = { status: 'idle' }
const idleControlPlaneState: ProgramPanelControlPlaneState = { status: 'idle' }
const idleScenarioExecution: ScenarioExecutionState = { status: 'idle', stepResults: [] }

const WorkbenchStateSchema = Schema.Struct({
  workspaceRevision: Schema.Number,
  activeFile: Schema.optional(Schema.String),
  layout: WorkbenchLayoutStateSchema,
  editor: EditorHostStateSchema,
  inspector: WorkbenchInspectorStateSchema,
  checkExpanded: Schema.Boolean,
  trialExpanded: Schema.Boolean,
  runState: ProgramPanelRunStateSchema,
  checkState: ProgramPanelControlPlaneStateSchema,
  trialStartupState: ProgramPanelControlPlaneStateSchema,
  runtimeEvidence: RuntimeEvidenceStateSchema,
  programSession: ProgramSessionStateSchema,
  sessionSeq: Schema.Number,
  sessionActions: ProgramSessionActionsSchema,
  bottomTab: BottomTabSchema,
})

export { WorkbenchStateSchema }

export type PlaygroundWorkbenchState = Schema.Schema.Type<typeof WorkbenchStateSchema>

export type PlaygroundWorkbenchAction =
  | { readonly _tag: 'workspaceSynced'; readonly payload: { readonly revision: number } }
  | { readonly _tag: 'workspaceRestartedSession'; readonly payload: ProgramSessionState }
  | { readonly _tag: 'selectFile'; readonly payload: string }
  | { readonly _tag: 'resizeWorkbenchLayout'; readonly payload: Partial<Pick<WorkbenchLayoutState, 'filesWidth' | 'inspectorWidth' | 'bottomHeight'>> }
  | { readonly _tag: 'setWorkbenchCollapsed'; readonly payload: Partial<Pick<WorkbenchLayoutState, 'filesCollapsed' | 'bottomCollapsed'>> }
  | { readonly _tag: 'setEditorHostState'; readonly payload: EditorHostState }
  | { readonly _tag: 'selectInspectorTab'; readonly payload: WorkbenchInspectorTab }
  | { readonly _tag: 'setAdvancedDispatchExpanded'; readonly payload: boolean }
  | { readonly _tag: 'selectDriver'; readonly payload?: string | undefined }
  | { readonly _tag: 'setDriverExecution'; readonly payload: DriverExecutionState }
  | { readonly _tag: 'selectScenario'; readonly payload?: string | undefined }
  | { readonly _tag: 'setScenarioExecution'; readonly payload: ScenarioExecutionState }
  | { readonly _tag: 'expandCheck'; readonly payload?: undefined }
  | { readonly _tag: 'expandTrial'; readonly payload?: undefined }
  | { readonly _tag: 'setRunState'; readonly payload: ProgramPanelRunState }
  | { readonly _tag: 'setCheckState'; readonly payload: ProgramPanelControlPlaneState }
  | { readonly _tag: 'setTrialStartupState'; readonly payload: ProgramPanelControlPlaneState }
  | {
      readonly _tag: 'recordRuntimeEvidence'
      readonly payload: {
        readonly lane: RuntimeEvidenceLane
        readonly evidence: PlaygroundRuntimeEvidenceEnvelope
      }
    }
  | { readonly _tag: 'setProgramSession'; readonly payload: ProgramSessionState | undefined }
  | { readonly _tag: 'startSession'; readonly payload: ProgramSessionState }
  | { readonly _tag: 'closeSession'; readonly payload?: undefined }
  | {
      readonly _tag: 'recordDispatchAccepted'
      readonly payload: {
        readonly session: ProgramSessionState
        readonly actions: ReadonlyArray<ProgramSessionAction>
      }
    }
  | {
      readonly _tag: 'recordDispatchSettled'
      readonly payload: {
        readonly session: ProgramSessionState
        readonly actions: ReadonlyArray<ProgramSessionAction>
      }
    }
  | { readonly _tag: 'selectBottomTab'; readonly payload: WorkbenchBottomTab }

const WorkbenchActions = {
  workspaceSynced: Schema.Struct({ revision: Schema.Number }),
  workspaceRestartedSession: ProgramSessionStateSchema,
  selectFile: Schema.String,
  resizeWorkbenchLayout: Schema.Struct({
    filesWidth: Schema.optional(Schema.Number),
    inspectorWidth: Schema.optional(Schema.Number),
    bottomHeight: Schema.optional(Schema.Number),
  }),
  setWorkbenchCollapsed: Schema.Struct({
    filesCollapsed: Schema.optional(Schema.Boolean),
    bottomCollapsed: Schema.optional(Schema.Boolean),
  }),
  setEditorHostState: EditorHostStateSchema,
  selectInspectorTab: WorkbenchInspectorTabSchema,
  setAdvancedDispatchExpanded: Schema.Boolean,
  selectDriver: Schema.optional(Schema.String),
  setDriverExecution: Schema.Unknown as Schema.Schema<DriverExecutionState>,
  selectScenario: Schema.optional(Schema.String),
  setScenarioExecution: Schema.Unknown as Schema.Schema<ScenarioExecutionState>,
  expandCheck: Schema.Void,
  expandTrial: Schema.Void,
  setRunState: ProgramPanelRunStateSchema,
  setCheckState: ProgramPanelControlPlaneStateSchema,
  setTrialStartupState: ProgramPanelControlPlaneStateSchema,
  recordRuntimeEvidence: Schema.Struct({
    lane: Schema.Literals(['reflect', 'run', 'dispatch', 'check', 'trialStartup']) as Schema.Schema<RuntimeEvidenceLane>,
    evidence: Schema.Unknown as Schema.Schema<PlaygroundRuntimeEvidenceEnvelope>,
  }),
  setProgramSession: ProgramSessionStateSchema,
  startSession: ProgramSessionStateSchema,
  closeSession: Schema.Void,
  recordDispatchAccepted: Schema.Struct({
    session: ProgramSessionStateSchema,
    actions: ProgramSessionActionsSchema,
  }),
  recordDispatchSettled: Schema.Struct({
    session: ProgramSessionStateSchema,
    actions: ProgramSessionActionsSchema,
  }),
  selectBottomTab: BottomTabSchema,
}

export const initialPlaygroundWorkbenchState: PlaygroundWorkbenchState = {
  workspaceRevision: 0,
  activeFile: undefined,
  layout: {
    filesWidth: 256,
    inspectorWidth: 340,
    bottomHeight: 192,
    filesCollapsed: false,
    bottomCollapsed: false,
  },
  editor: {
    engine: 'textarea',
    activeModelUri: undefined,
    languageServiceStatus: 'idle',
    typeBundleStatus: 'idle',
    fallbackReason: undefined,
    loadedTypePackages: [],
    diagnostics: [],
  },
  inspector: {
    activeInspectorTab: 'actions',
    advancedDispatchExpanded: false,
    selectedDriverId: undefined,
    selectedScenarioId: undefined,
    driverExecution: { status: 'idle' },
    scenarioExecution: idleScenarioExecution,
  },
  checkExpanded: false,
  trialExpanded: false,
  runState: idleRunState,
  checkState: idleControlPlaneState,
  trialStartupState: idleControlPlaneState,
  runtimeEvidence: {},
  programSession: undefined,
  sessionSeq: 0,
  sessionActions: [],
  bottomTab: 'Console',
}

export const PlaygroundWorkbench = Logix.Module.make('PlaygroundWorkbench', {
  state: WorkbenchStateSchema,
  actions: WorkbenchActions,
  reducers: {
    workspaceSynced: (state, action, sink) => {
      sink?.('workspaceRevision')
      const revision = action.payload.revision
      return { ...state, workspaceRevision: revision }
    },
    workspaceRestartedSession: (state, action, sink) => {
      sink?.('programSession')
      sink?.('sessionSeq')
      sink?.('sessionActions')
      sink?.('runState')
      sink?.('checkState')
      sink?.('trialStartupState')
      sink?.('runtimeEvidence')
      if (!action.payload) return state
      const nextRevision = action.payload.revision
      const reflectEvidence = state.runtimeEvidence.reflect
      const runtimeEvidence =
        reflectEvidence?.sourceRevision === nextRevision
          ? { reflect: reflectEvidence }
          : {}
      return {
        ...state,
        sessionSeq: state.sessionSeq + 1,
        sessionActions: [],
        programSession: action.payload,
        runState: idleRunState,
        checkState: idleControlPlaneState,
        trialStartupState: idleControlPlaneState,
        runtimeEvidence,
      }
    },
    selectFile: (state, action, sink) => {
      sink?.('activeFile')
      return { ...state, activeFile: action.payload }
    },
    resizeWorkbenchLayout: (state, action, sink) => {
      sink?.('layout')
      return {
        ...state,
        layout: {
          ...state.layout,
          ...action.payload,
        },
      }
    },
    setWorkbenchCollapsed: (state, action, sink) => {
      sink?.('layout')
      return {
        ...state,
        layout: {
          ...state.layout,
          ...action.payload,
        },
      }
    },
    setEditorHostState: (state, action, sink) => {
      sink?.('editor')
      return { ...state, editor: action.payload }
    },
    selectInspectorTab: (state, action, sink) => {
      sink?.('inspector.activeInspectorTab')
      return { ...state, inspector: { ...state.inspector, activeInspectorTab: action.payload } }
    },
    setAdvancedDispatchExpanded: (state, action, sink) => {
      sink?.('inspector.advancedDispatchExpanded')
      return { ...state, inspector: { ...state.inspector, advancedDispatchExpanded: action.payload } }
    },
    selectDriver: (state, action, sink) => {
      sink?.('inspector.selectedDriverId')
      return { ...state, inspector: { ...state.inspector, selectedDriverId: action.payload } }
    },
    setDriverExecution: (state, action, sink) => {
      sink?.('inspector.driverExecution')
      return { ...state, inspector: { ...state.inspector, driverExecution: action.payload } }
    },
    selectScenario: (state, action, sink) => {
      sink?.('inspector.selectedScenarioId')
      return { ...state, inspector: { ...state.inspector, selectedScenarioId: action.payload } }
    },
    setScenarioExecution: (state, action, sink) => {
      sink?.('inspector.scenarioExecution')
      return { ...state, inspector: { ...state.inspector, scenarioExecution: action.payload } }
    },
    expandCheck: (state, _action, sink) => {
      sink?.('checkExpanded')
      return { ...state, checkExpanded: true }
    },
    expandTrial: (state, _action, sink) => {
      sink?.('trialExpanded')
      return { ...state, trialExpanded: true }
    },
    setRunState: (state, action, sink) => {
      sink?.('runState')
      return { ...state, runState: action.payload }
    },
    setCheckState: (state, action, sink) => {
      sink?.('checkState')
      sink?.('checkExpanded')
      return { ...state, checkExpanded: true, checkState: action.payload }
    },
    setTrialStartupState: (state, action, sink) => {
      sink?.('trialStartupState')
      sink?.('trialExpanded')
      return { ...state, trialExpanded: true, trialStartupState: action.payload }
    },
    recordRuntimeEvidence: (state, action, sink) => {
      sink?.(`runtimeEvidence.${action.payload.lane}`)
      return {
        ...state,
        runtimeEvidence: {
          ...state.runtimeEvidence,
          [action.payload.lane]: action.payload.evidence,
        },
      }
    },
    setProgramSession: (state, action, sink) => {
      sink?.('programSession')
      return { ...state, programSession: action.payload }
    },
    startSession: (state, action, sink) => {
      sink?.('sessionSeq')
      sink?.('sessionActions')
      sink?.('programSession')
      return {
        ...state,
        sessionSeq: state.sessionSeq + 1,
        sessionActions: [],
        programSession: action.payload,
      }
    },
    closeSession: (state, _action, sink) => {
      sink?.('programSession')
      sink?.('sessionActions')
      return {
        ...state,
        programSession: undefined,
        sessionActions: [],
      }
    },
    recordDispatchAccepted: (state, action, sink) => {
      sink?.('programSession')
      sink?.('sessionActions')
      return {
        ...state,
        programSession: action.payload.session,
        sessionActions: action.payload.actions,
      }
    },
    recordDispatchSettled: (state, action, sink) => {
      sink?.('programSession')
      sink?.('sessionActions')
      return {
        ...state,
        programSession: action.payload.session,
        sessionActions: action.payload.actions,
      }
    },
    selectBottomTab: (state, action, sink) => {
      sink?.('bottomTab')
      return { ...state, bottomTab: action.payload }
    },
  },
})

export const PlaygroundWorkbenchProgram = Logix.Program.make(PlaygroundWorkbench, {
  initial: initialPlaygroundWorkbenchState,
  logics: [],
})
