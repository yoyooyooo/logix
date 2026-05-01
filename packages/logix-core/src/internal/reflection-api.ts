// Repo-internal reflection expert/export helpers.
// Shared run/evidence/session primitives and the proof kernel live under internal/verification.
// Generic serializable protocol contracts live under internal/protocol.

import type { AnyModuleShape, ProgramRuntimeBlueprint } from './module.js'
import type { AnyProgram } from './program.js'
import type { StaticIr } from './field-kernel/ir.js'
import type { ExtractManifestOptions, ModuleManifest } from './reflection/manifest.js'
import * as Manifest from './reflection/manifest.js'
import type {
  ExtractMinimumProgramActionManifestOptions,
  ExtractRuntimeReflectionManifestOptions,
  MinimumProgramActionManifest,
  ReflectedActionDescriptor,
  RuntimeReflectionBudget,
  RuntimeReflectionManifest,
  RuntimeReflectionManifestDiff,
  RuntimeReflectionManifestDiffChange,
  RuntimeReflectionSourceRef,
} from './reflection/programManifest.js'
import * as ProgramManifest from './reflection/programManifest.js'
import type {
  PayloadSchemaSummary,
  PayloadSchemaSummaryKind,
  PayloadSummaryOptions,
} from './reflection/payloadSummary.js'
import * as PayloadSummary from './reflection/payloadSummary.js'
import type {
  PayloadValidationIssue,
  PayloadValidationResult,
} from './reflection/payloadValidation.js'
import * as PayloadValidation from './reflection/payloadValidation.js'
import type {
  RuntimeOperationAttachmentRef,
  RuntimeOperationCoordinate,
  RuntimeOperationEvent,
  RuntimeOperationEventBase,
  RuntimeOperationEventInput,
  RuntimeOperationEventName,
  RuntimeOperationEvidenceGapInput,
  RuntimeOperationFailedEventInput,
  RuntimeOperationFailure,
  RuntimeOperationKind,
  RuntimeDebugRefOperationProjectionOptions,
} from './reflection/runtimeOperationEvents.js'
import * as RuntimeOperationEvents from './reflection/runtimeOperationEvents.js'
import type { WorkbenchReflectionBridgeInput } from './reflection/workbenchBridge.js'
import * as WorkbenchBridge from './reflection/workbenchBridge.js'
import type {
  CrossToolConsumptionBase,
  CrossToolConsumptionClass,
  CrossToolConsumptionFact,
  MinimumProgramActionManifestAuthority,
  ProductDeclarationContextRef,
  ProductExpectationDebugEvidence,
  ReflectionEvidenceGap,
  UiLayoutHostViewState,
} from './reflection/consumptionContract.js'
import * as ConsumptionContract from './reflection/consumptionContract.js'
import * as StaticIrExport from './reflection/staticIr.js'
import type {
  ExportControlSurfaceOptions,
  ExportControlSurfaceResult,
  ExportedWorkflowSurface,
} from './reflection/controlSurface.js'
import * as ControlSurfaceExport from './reflection/controlSurface.js'
import type { DiffManifestOptions, ModuleManifestDiff } from './reflection/diff.js'
import * as ManifestDiff from './reflection/diff.js'
import type {
  KernelContractVerificationResult,
  VerifyKernelContractOptions,
} from './reflection/kernelContract.js'
import { verifyKernelContract as verifyKernelContractInternal } from './reflection/kernelContract.js'
import type {
  FullCutoverGateTrialRunOptions,
  VerifyFullCutoverGateOptions,
  FullCutoverGateVerificationResult,
  KernelContractAllowedDiff,
} from './reflection/fullCutoverGate.js'
import { verifyFullCutoverGate as verifyFullCutoverGateInternal } from './reflection/fullCutoverGate.js'

export type {
  ModuleManifest,
  ExtractManifestOptions,
  MinimumProgramActionManifest,
  ExtractMinimumProgramActionManifestOptions,
  RuntimeReflectionSourceRef,
  ReflectedActionDescriptor,
  RuntimeReflectionBudget,
  RuntimeReflectionManifest,
  ExtractRuntimeReflectionManifestOptions,
  RuntimeReflectionManifestDiffChange,
  RuntimeReflectionManifestDiff,
  PayloadSchemaSummary,
  PayloadSchemaSummaryKind,
  PayloadSummaryOptions,
  PayloadValidationIssue,
  PayloadValidationResult,
  RuntimeOperationEventName,
  RuntimeOperationKind,
  RuntimeOperationCoordinate,
  RuntimeOperationAttachmentRef,
  RuntimeOperationFailure,
  RuntimeOperationEventBase,
  RuntimeOperationEvent,
  RuntimeOperationEventInput,
  RuntimeOperationFailedEventInput,
  RuntimeOperationEvidenceGapInput,
  RuntimeDebugRefOperationProjectionOptions,
  WorkbenchReflectionBridgeInput,
  CrossToolConsumptionBase,
  CrossToolConsumptionClass,
  CrossToolConsumptionFact,
  MinimumProgramActionManifestAuthority,
  ProductDeclarationContextRef,
  ProductExpectationDebugEvidence,
  ReflectionEvidenceGap,
  UiLayoutHostViewState,
  ModuleManifestDiff,
  DiffManifestOptions,
  KernelContractVerificationResult,
  VerifyKernelContractOptions,
  FullCutoverGateTrialRunOptions,
  VerifyFullCutoverGateOptions,
  FullCutoverGateVerificationResult,
  KernelContractAllowedDiff,
  ExportControlSurfaceOptions,
  ExportControlSurfaceResult,
  ExportedWorkflowSurface,
}

/**
 * Reflection.extractManifest
 *
 * Extracts a platform-consumable Manifest IR (JSON, diffable) from the final program object (`AnyProgram` / `ProgramRuntimeBlueprint`).
 */
export const extractManifest = (
  module: ProgramRuntimeBlueprint<any, AnyModuleShape, any> | AnyProgram,
  options?: ExtractManifestOptions,
): ModuleManifest => Manifest.extractManifest(module, options)

/**
 * Reflection.extractMinimumProgramActionManifest
 *
 * Projects the 167A minimum Program action manifest slice for repo-internal consumers.
 */
export const extractMinimumProgramActionManifest = (
  module: ProgramRuntimeBlueprint<any, AnyModuleShape, any> | AnyProgram,
  options?: ExtractMinimumProgramActionManifestOptions,
): MinimumProgramActionManifest => ProgramManifest.extractMinimumProgramActionManifest(module, options)

/**
 * Reflection.extractRuntimeReflectionManifest
 *
 * Projects the 167B full Program reflection DTO for Playground, CLI, Devtools and workbench reuse.
 */
export const extractRuntimeReflectionManifest = (
  module: ProgramRuntimeBlueprint<any, AnyModuleShape, any> | AnyProgram,
  options?: ExtractRuntimeReflectionManifestOptions,
): RuntimeReflectionManifest => ProgramManifest.extractRuntimeReflectionManifest(module, options)

export const diffRuntimeReflectionManifest = (
  before: RuntimeReflectionManifest,
  after: RuntimeReflectionManifest,
): RuntimeReflectionManifestDiff => ProgramManifest.diffRuntimeReflectionManifest(before, after)

/**
 * Reflection.summarizePayloadSchema
 *
 * Projects an Effect Schema payload contract into a bounded deterministic DTO for tool consumption.
 */
export const summarizePayloadSchema = (
  schema: unknown,
  options?: PayloadSummaryOptions,
): PayloadSchemaSummary => PayloadSummary.summarizePayloadSchema(schema, options)

/**
 * Reflection.validateJsonPayload
 *
 * Validates a JSON-decoded payload value against a reflected schema and returns stable issue DTOs.
 */
export const validateJsonPayload = (
  schema: unknown,
  value: unknown,
): PayloadValidationResult => PayloadValidation.validateJsonPayload(schema, value)

export const RUNTIME_OPERATION_EVENT_NAMES = RuntimeOperationEvents.RUNTIME_OPERATION_EVENT_NAMES
export const RUNTIME_OPERATION_KINDS = RuntimeOperationEvents.RUNTIME_OPERATION_KINDS

export const runtimeOperationEventId = (
  coordinate: RuntimeOperationCoordinate,
  name: RuntimeOperationEventName,
): string => RuntimeOperationEvents.runtimeOperationEventId(coordinate, name)

export const createOperationAcceptedEvent = (
  input: RuntimeOperationEventInput,
): Extract<RuntimeOperationEvent, { readonly name: 'operation.accepted' }> =>
  RuntimeOperationEvents.createOperationAcceptedEvent(input)

export const createOperationCompletedEvent = (
  input: RuntimeOperationEventInput,
): Extract<RuntimeOperationEvent, { readonly name: 'operation.completed' }> =>
  RuntimeOperationEvents.createOperationCompletedEvent(input)

export const createOperationFailedEvent = (
  input: RuntimeOperationFailedEventInput,
): Extract<RuntimeOperationEvent, { readonly name: 'operation.failed' }> =>
  RuntimeOperationEvents.createOperationFailedEvent(input)

export const createRuntimeOperationEvidenceGap = (
  input: RuntimeOperationEvidenceGapInput,
): Extract<RuntimeOperationEvent, { readonly name: 'evidence.gap' }> =>
  RuntimeOperationEvents.createRuntimeOperationEvidenceGap(input)

export const projectRuntimeDebugRefToOperationEvents = (
  ref: unknown,
  options: RuntimeDebugRefOperationProjectionOptions,
): ReadonlyArray<RuntimeOperationEvent> =>
  RuntimeOperationEvents.projectRuntimeDebugRefToOperationEvents(ref, options)

export const createWorkbenchReflectionBridgeBundle = (
  input: WorkbenchReflectionBridgeInput,
): import('./workbench/authority.js').RuntimeWorkbenchAuthorityBundle =>
  WorkbenchBridge.createWorkbenchReflectionBridgeBundle(input)

/**
 * Reflection.classifyCrossToolConsumption
 *
 * Classifies repo-internal facts by the 167A Cross-tool Consumption Law.
 */
export const classifyCrossToolConsumption = (
  fact: CrossToolConsumptionFact,
): CrossToolConsumptionClass => ConsumptionContract.classifyCrossToolConsumption(fact)

export const createMinimumActionManifestAuthority = (
  manifest: MinimumProgramActionManifest,
): MinimumProgramActionManifestAuthority => ConsumptionContract.createMinimumActionManifestAuthority(manifest)

export const createFallbackSourceRegexEvidenceGap = (
  input: Parameters<typeof ConsumptionContract.createFallbackSourceRegexEvidenceGap>[0],
): ReflectionEvidenceGap => ConsumptionContract.createFallbackSourceRegexEvidenceGap(input)

export const createProductDeclarationContextRef = (
  input: Parameters<typeof ConsumptionContract.createProductDeclarationContextRef>[0],
): ProductDeclarationContextRef => ConsumptionContract.createProductDeclarationContextRef(input)

export const createProductExpectationDebugEvidence = (
  input: Parameters<typeof ConsumptionContract.createProductExpectationDebugEvidence>[0],
): ProductExpectationDebugEvidence => ConsumptionContract.createProductExpectationDebugEvidence(input)

export const createUiLayoutHostViewState = (
  input: Parameters<typeof ConsumptionContract.createUiLayoutHostViewState>[0],
): UiLayoutHostViewState => ConsumptionContract.createUiLayoutHostViewState(input)

/**
 * Reflection.diffManifest
 *
 * Diffs two Manifests and produces a stable, machine-readable summary (CI contract guard / UI reuse).
 */
export const diffManifest = (
  before: ModuleManifest,
  after: ModuleManifest,
  options?: DiffManifestOptions,
): ModuleManifestDiff => ManifestDiff.diffManifest(before, after, options)

/**
 * Reflection.exportStaticIr
 *
 * If the module contains a compiled field program, exports canonical StaticIR with the same shape and digest as the internal field IR export.
 */
export const exportStaticIr = (module: ProgramRuntimeBlueprint<any, AnyModuleShape, any> | AnyProgram): StaticIr | undefined =>
  StaticIrExport.exportStaticIr(module)

/**
 * Reflection.exportControlSurface
 *
 * Exports the ControlSurfaceManifest (Root IR) and slice attachments (e.g. controlProgramSurface) from configured modules.
 *
 * Note: currently requires `AnyProgram` (the configured program object returned by `Program.make(...)`).
 */
export const exportControlSurface = (
  modules: ReadonlyArray<AnyProgram>,
  options?: ExportControlSurfaceOptions,
): ExportControlSurfaceResult => ControlSurfaceExport.exportControlSurface(modules, options)

/**
 * Repo-only expert verification helper.
 *
 * Runs two trial-runs (with optional different Layers/overrides) and exports a stable, machine-readable kernel contract diff report.
 */
export const verifyKernelContract = <Sh extends AnyModuleShape>(
  module: ProgramRuntimeBlueprint<any, Sh, any> | AnyProgram,
  options?: VerifyKernelContractOptions<Sh>,
): import('effect').Effect.Effect<KernelContractVerificationResult, never, any> =>
  verifyKernelContractInternal(module as any, options as any)

/**
 * Repo-only expert full-cutover gate helper.
 */
export const verifyFullCutoverGate = <Sh extends AnyModuleShape>(
  module: ProgramRuntimeBlueprint<any, Sh, any> | AnyProgram,
  options?: VerifyFullCutoverGateOptions<Sh>,
): import('effect').Effect.Effect<FullCutoverGateVerificationResult, never, any> =>
  verifyFullCutoverGateInternal(module as any, options as any)
