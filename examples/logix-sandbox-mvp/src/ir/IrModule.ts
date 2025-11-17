import { Schema } from 'effect'
import * as Logix from '@logix/core'
import { IR_PRESETS } from './IrPresets'
import { sandboxKernelRegistry } from '../sandboxClientConfig'

export const IrActiveTabSchema = Schema.Union(
  Schema.Literal('manifest'),
  Schema.Literal('diff'),
  Schema.Literal('staticIr'),
  Schema.Literal('artifacts'),
  Schema.Literal('trialRun'),
  Schema.Literal('controlPlane'),
  Schema.Literal('timeline'),
)

export type IrActiveTab = Schema.Schema.Type<typeof IrActiveTabSchema>

export const IrDiagnosticsLevelSchema = Schema.Union(
  Schema.Literal('off'),
  Schema.Literal('light'),
  Schema.Literal('full'),
)

export type IrDiagnosticsLevel = Schema.Schema.Type<typeof IrDiagnosticsLevelSchema>

export const KernelVariantSchema = Schema.Struct({
  kernelId: Schema.String,
  label: Schema.optional(Schema.String),
  kernelUrl: Schema.String,
})

export type KernelVariantState = Schema.Schema.Type<typeof KernelVariantSchema>

export const IrRunSummarySchema = Schema.Struct({
  runId: Schema.String,
  duration: Schema.Number,
  requestedKernelId: Schema.optional(Schema.String),
  effectiveKernelId: Schema.optional(Schema.String),
  fallbackReason: Schema.optional(Schema.String),
  kernelImplementationRef: Schema.optional(Schema.Any),
})

export type IrRunSummary = Schema.Schema.Type<typeof IrRunSummarySchema>

export const IrBundleSchema = Schema.Struct({
  manifest: Schema.optional(Schema.Any),
  staticIr: Schema.optional(Schema.Any),
  diff: Schema.optional(Schema.Any),
  trialRunReport: Schema.optional(Schema.Any),
  evidence: Schema.optional(Schema.Any),
})

export type IrBundle = Schema.Schema.Type<typeof IrBundleSchema>

export const IrStateSchema = Schema.Struct({
  activeTab: IrActiveTabSchema,
  bundle: IrBundleSchema,
  activePresetId: Schema.String,
  moduleCode: Schema.String,
  moduleExport: Schema.String,
  mockManifestText: Schema.String,
  runError: Schema.NullOr(Schema.String),

  runId: Schema.String,
  diagnosticsLevel: IrDiagnosticsLevelSchema,
  maxEvents: Schema.Number,
  trialRunTimeoutMs: Schema.Number,
  closeScopeTimeout: Schema.Number,
  maxBytes: Schema.Number,
  isRunning: Schema.Boolean,

  // Kernel selection (058)
  kernelId: Schema.String,
  strict: Schema.Boolean,
  allowFallback: Schema.Boolean,
  kernels: Schema.Array(KernelVariantSchema),
  defaultKernelId: Schema.optional(Schema.String),
  runSummary: Schema.NullOr(IrRunSummarySchema),

  // UI-only helpers
  artifactsFilter: Schema.String,
  copiedArtifactKey: Schema.NullOr(Schema.String),
  staticIrSelectedNodeId: Schema.NullOr(Schema.String),
  timelineTypeFilter: Schema.String,
})

export type IrState = Schema.Schema.Type<typeof IrStateSchema>

export const IrDef = Logix.Module.make('IrModule', {
  state: IrStateSchema,
  actions: {
    init: Schema.Void,
    run: Schema.Void,

    // UI actions
    setActiveTab: IrActiveTabSchema,
    applyPreset: Schema.String,
    setModuleCode: Schema.String,
    setModuleExport: Schema.String,
    setMockManifestText: Schema.String,
    setRunId: Schema.String,
    setDiagnosticsLevel: IrDiagnosticsLevelSchema,
    setMaxEvents: Schema.Number,
    setTrialRunTimeoutMs: Schema.Number,
    setCloseScopeTimeout: Schema.Number,
    setMaxBytes: Schema.Number,

    setKernelId: Schema.String,
    setKernelStrict: Schema.Boolean,
    setKernelAllowFallback: Schema.Boolean,
    setKernelCatalog: Schema.Struct({
      kernels: Schema.Array(KernelVariantSchema),
      defaultKernelId: Schema.optional(Schema.String),
    }),

    setArtifactsFilter: Schema.String,
    markCopiedArtifact: Schema.String,
    clearCopiedArtifact: Schema.Void,
    setStaticIrSelectedNodeId: Schema.NullOr(Schema.String),
    setTimelineTypeFilter: Schema.String,

    // internal actions
    setIsRunning: Schema.Boolean,
    setRunError: Schema.NullOr(Schema.String),
    setBundle: IrBundleSchema,
    setRunSummary: Schema.NullOr(IrRunSummarySchema),
  },
  reducers: {
    init: (state) => state,

    run: (state) => ({
      ...state,
      isRunning: true,
      runError: null,
      runSummary: null,
      bundle: {},
      activeTab: 'manifest' as const,
    }),

    setActiveTab: (state, action) => ({ ...state, activeTab: action.payload }),

    applyPreset: (state, action) => {
      const preset = IR_PRESETS.find((p) => p.id === action.payload)
      if (!preset) return state
      return {
        ...state,
        activePresetId: preset.id,
        moduleCode: preset.moduleCode,
        moduleExport: preset.moduleExport,
        bundle: {},
        runError: null,
        runSummary: null,
        activeTab: 'manifest' as const,
        staticIrSelectedNodeId: null,
      }
    },

    setModuleCode: (state, action) => ({ ...state, moduleCode: action.payload }),
    setModuleExport: (state, action) => ({ ...state, moduleExport: action.payload }),
    setMockManifestText: (state, action) => ({ ...state, mockManifestText: action.payload }),

    setRunId: (state, action) => ({ ...state, runId: action.payload }),
    setDiagnosticsLevel: (state, action) => ({ ...state, diagnosticsLevel: action.payload }),
    setMaxEvents: (state, action) => ({ ...state, maxEvents: action.payload }),
    setTrialRunTimeoutMs: (state, action) => ({ ...state, trialRunTimeoutMs: action.payload }),
    setCloseScopeTimeout: (state, action) => ({ ...state, closeScopeTimeout: action.payload }),
    setMaxBytes: (state, action) => ({ ...state, maxBytes: action.payload }),

    setKernelId: (state, action) => ({ ...state, kernelId: action.payload }),
    setKernelStrict: (state, action) => ({
      ...state,
      strict: action.payload,
      allowFallback: action.payload ? false : state.allowFallback,
    }),
    setKernelAllowFallback: (state, action) => ({
      ...state,
      allowFallback: state.strict ? false : action.payload,
    }),
    setKernelCatalog: (state, action) => ({
      ...state,
      kernels: action.payload.kernels,
      defaultKernelId: action.payload.defaultKernelId,
    }),

    setArtifactsFilter: (state, action) => ({ ...state, artifactsFilter: action.payload }),
    markCopiedArtifact: (state, action) => ({ ...state, copiedArtifactKey: action.payload }),
    clearCopiedArtifact: (state) => ({ ...state, copiedArtifactKey: null }),
    setStaticIrSelectedNodeId: (state, action) => ({ ...state, staticIrSelectedNodeId: action.payload }),
    setTimelineTypeFilter: (state, action) => ({ ...state, timelineTypeFilter: action.payload }),

    setIsRunning: (state, action) => ({ ...state, isRunning: action.payload }),
    setRunError: (state, action) => ({ ...state, runError: action.payload }),
    setBundle: (state, action) => ({ ...state, bundle: action.payload }),
    setRunSummary: (state, action) => ({ ...state, runSummary: action.payload }),
  },
})

export const IrInitialState: IrState = {
  activeTab: 'manifest',
  bundle: {},
  activePresetId: IR_PRESETS[0]?.id ?? 'p0',
  moduleCode: IR_PRESETS[0]?.moduleCode ?? '',
  moduleExport: IR_PRESETS[0]?.moduleExport ?? 'AppRoot',
  mockManifestText: '',
  runError: null,
  runId: 'run:browser:ir-demo',
  diagnosticsLevel: 'light',
  maxEvents: 200,
  trialRunTimeoutMs: 1000,
  closeScopeTimeout: 500,
  maxBytes: 500_000,
  isRunning: false,
  kernelId: sandboxKernelRegistry.defaultKernelId ?? 'core',
  strict: true,
  allowFallback: false,
  kernels: sandboxKernelRegistry.kernels,
  defaultKernelId: sandboxKernelRegistry.defaultKernelId,
  runSummary: null,
  artifactsFilter: '',
  copiedArtifactKey: null,
  staticIrSelectedNodeId: null,
  timelineTypeFilter: '',
}
