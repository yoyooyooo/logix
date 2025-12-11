import { Schema } from 'effect'
import * as Logix from '@logix/core'
import type { LogEntry, TraceSpan, SandboxErrorInfo } from '@logix/sandbox'

// ============================================================================
// Data Schemas
// ============================================================================

export const SpecStepSchema = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  intentScript: Schema.optional(Schema.String),
  expectations: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
})

export const SpecScenarioSchema = Schema.Struct({
  id: Schema.String,
  storyId: Schema.String,
  title: Schema.String,
  description: Schema.optional(Schema.String),
  steps: Schema.Array(SpecStepSchema),
})

export const SpecStorySchema = Schema.Struct({
  id: Schema.String,
  featureId: Schema.String,
  title: Schema.String,
  userStory: Schema.String,
  scenarios: Schema.Array(SpecScenarioSchema),
})

export const SpecFeatureSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  stories: Schema.Array(SpecStorySchema),
})

// ============================================================================
// State Schema
// ============================================================================

export const SandboxStatusSchema = Schema.Union(
  Schema.Literal('idle'),
  Schema.Literal('initializing'),
  Schema.Literal('ready'),
  Schema.Literal('running'),
  Schema.Literal('completed'),
  Schema.Literal('error'),
)

export type SandboxStatus = Schema.Schema.Type<typeof SandboxStatusSchema>

// ============================================================================
// Runtime-related Schemas (aligned with @logix/sandbox types)
// ============================================================================

const LogLevelSchema = Schema.Union(
  Schema.Literal('debug'),
  Schema.Literal('info'),
  Schema.Literal('warn'),
  Schema.Literal('error'),
)

const LogSourceSchema = Schema.Union(Schema.Literal('console'), Schema.Literal('effect'), Schema.Literal('logix'))

export const LogEntrySchema = Schema.Struct({
  level: LogLevelSchema,
  args: Schema.Array(Schema.Any),
  timestamp: Schema.Number,
  source: Schema.optional(LogSourceSchema),
})

export type LogEntryState = Schema.Schema.Type<typeof LogEntrySchema>
// 确保与 @logix/sandbox 中的 LogEntry 形状兼容
type _LogEntryCompat = LogEntry extends LogEntryState ? true : never

export const TraceSpanSchema = Schema.Struct({
  spanId: Schema.String,
  parentSpanId: Schema.optional(Schema.String),
  name: Schema.String,
  startTime: Schema.Number,
  endTime: Schema.optional(Schema.Number),
  status: Schema.Union(
    Schema.Literal('running'),
    Schema.Literal('success'),
    Schema.Literal('error'),
    Schema.Literal('cancelled'),
  ),
  attributes: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Any,
    }),
  ),
  intentId: Schema.optional(Schema.String),
  stepId: Schema.optional(Schema.String),
})

export type TraceSpanState = Schema.Schema.Type<typeof TraceSpanSchema>
type _TraceSpanCompat = TraceSpan extends TraceSpanState ? true : never

const SandboxErrorCodeSchema = Schema.Union(
  Schema.Literal('INIT_FAILED'),
  Schema.Literal('RUNTIME_ERROR'),
  Schema.Literal('TIMEOUT'),
  Schema.Literal('WORKER_TERMINATED'),
)

export const SandboxErrorInfoSchema = Schema.Struct({
  code: SandboxErrorCodeSchema,
  message: Schema.String,
  stack: Schema.optional(Schema.String),
})

export type SandboxErrorInfoState = Schema.Schema.Type<typeof SandboxErrorInfoSchema>
type _SandboxErrorInfoCompat = SandboxErrorInfo extends SandboxErrorInfoState ? true : never

export const SandboxState = Schema.Struct({
  // Runtime State
  status: SandboxStatusSchema,
  logs: Schema.Array(LogEntrySchema),
  traces: Schema.Array(TraceSpanSchema),
  error: Schema.NullOr(SandboxErrorInfoSchema),
  runResult: Schema.NullOr(Schema.Any),
  uiIntents: Schema.Array(Schema.Any),
  scenarioId: Schema.String,
  scenarioSteps: Schema.Array(
    Schema.Struct({
      stepId: Schema.String,
      label: Schema.String,
    }),
  ),
  mockManifestSource: Schema.String,
  semanticWidgets: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      type: Schema.Union(Schema.Literal('select'), Schema.Literal('button')),
      label: Schema.String,
      field: Schema.String,
      stepId: Schema.String,
      optionsJson: Schema.String,
    }),
  ),
  intentScript: Schema.String,

  // UI State
  activeTab: Schema.Union(
    Schema.Literal('console'),
    Schema.Literal('result'),
    Schema.Literal('traces'),
    Schema.Literal('ui'),
    Schema.Literal('http'),
  ),
  code: Schema.String,
  isRunning: Schema.Boolean, // Added missing field seen in previous view? Or maybe I can remove it if unused. I'll keep it to be safe or remove if not in schema. Previous view had it at line 72.

  // Spec Navigation State
  specFeatures: Schema.Array(SpecFeatureSchema),
  selectedFeatureId: Schema.NullOr(Schema.String),
  selectedStoryId: Schema.NullOr(Schema.String),
  selectedStepId: Schema.NullOr(Schema.String),
})

export type SandboxState = Schema.Schema.Type<typeof SandboxState>

// ============================================================================
// Module Definition
// ============================================================================

export const SandboxModule = Logix.Module.make('SandboxModule', {
  state: SandboxState,
  actions: {
    init: Schema.Void,
    setCode: Schema.String,
    setTab: Schema.Union(
      Schema.Literal('console'),
      Schema.Literal('result'),
      Schema.Literal('traces'),
      Schema.Literal('ui'),
      Schema.Literal('http'),
    ),
    run: Schema.Void,

    // Internal Actions
    setStatus: SandboxStatusSchema,
    addLog: Schema.Any,
    addTrace: Schema.Any,
    addUiIntent: Schema.Any,
    uiCallbackFromMockUi: Schema.Any,
    setResult: Schema.Any,
    setError: Schema.Any,
    resetOutput: Schema.Void,
    setScenarioId: Schema.String,
    setScenarioSteps: Schema.Array(
      Schema.Struct({
        stepId: Schema.String,
        label: Schema.String,
      }),
    ),
    setMockManifestSource: Schema.String,
    setSemanticWidgets: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        type: Schema.Union(Schema.Literal('select'), Schema.Literal('button')),
        label: Schema.String,
        field: Schema.String,
        stepId: Schema.String,
        optionsJson: Schema.String,
      }),
    ),
    setIntentScript: Schema.String,

    // Spec Actions
    setSpecSelection: Schema.Struct({
      featureId: Schema.NullOr(Schema.String),
      storyId: Schema.NullOr(Schema.String),
      scenarioId: Schema.NullOr(Schema.String),
      stepId: Schema.NullOr(Schema.String),
    }),
    updateStepIntentScript: Schema.Struct({
      stepId: Schema.String,
      intentScript: Schema.String,
    }),
  },
  // Reducers for synchronous state updates
  reducers: {
    init: (state) => state, // No-op for init usually
    setStatus: (state, action) => ({ ...state, status: action.payload }),
    setCode: (state, action) => ({ ...state, code: action.payload }),
    setTab: (state, action) => ({ ...state, activeTab: action.payload }),
    setResult: (state, action) => ({ ...state, runResult: action.payload }),
    setError: (state, action) => ({ ...state, error: action.payload }),
    addLog: (state, action) => ({ ...state, logs: [...state.logs, action.payload] }),
    addTrace: (state, action) => ({ ...state, traces: [...state.traces, action.payload] }),
    addUiIntent: (state, action) => ({ ...state, uiIntents: [...state.uiIntents, action.payload] }),
    uiCallbackFromMockUi: (state) => state, // Handled in logic
    run: (state) => ({ ...state, isRunning: true, status: 'initializing' as const }),
    resetOutput: (state) => ({
      ...state,
      logs: [],
      traces: [],
      runResult: null,
      error: null,
      status: 'ready' as const,
      uiIntents: [],
      isRunning: false,
    }),
    setScenarioId: (state, action) => ({ ...state, scenarioId: action.payload }),
    setScenarioSteps: (state, action) => ({ ...state, scenarioSteps: action.payload }),
    setMockManifestSource: (state, action) => ({ ...state, mockManifestSource: action.payload }),
    setSemanticWidgets: (state, action) => ({ ...state, semanticWidgets: action.payload }),
    setIntentScript: (state, action) => ({ ...state, intentScript: action.payload }),
    setSpecSelection: (state, action) => ({
      ...state,
      selectedFeatureId: action.payload.featureId,
      selectedStoryId: action.payload.storyId,
      selectedStepId: action.payload.stepId,
      scenarioId: action.payload.scenarioId || state.scenarioId,
    }),
    updateStepIntentScript: (state, action) => {
      const { stepId, intentScript } = action.payload
      // Deep update specFeatures
      const newFeatures = state.specFeatures.map((feature: any) => ({
        ...feature,
        stories: feature.stories.map((story: any) => ({
          ...story,
          scenarios: story.scenarios.map((scenario: any) => ({
            ...scenario,
            steps: scenario.steps.map((step: any) => (step.id === stepId ? { ...step, intentScript } : step)),
          })),
        })),
      }))
      return { ...state, specFeatures: newFeatures }
    },
  },
})
