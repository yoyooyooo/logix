// Observability Protocol (@logixjs/core/Observability).

import * as Evidence from './internal/observability/evidence.js'
import * as Aggregate from './internal/observability/aggregate.js'
import * as Aggregator from './internal/observability/aggregator.js'
import * as Control from './internal/observability/control.js'
import * as Envelope from './internal/observability/envelope.js'
import * as SpyHarness from './internal/observability/spy/spyHarness.js'
export * from './internal/observability/trialRun.js'

export type { JsonValue } from './internal/observability/jsonValue.js'
export type { DowngradeReason } from './internal/observability/jsonValue.js'
export type { ArtifactEnvelope, ArtifactKey, TrialRunArtifacts } from './internal/observability/artifacts/model.js'
export type {
  TrialRunArtifactExporter,
  TrialRunArtifactInspectionContext,
} from './internal/observability/artifacts/exporter.js'
export { registerTrialRunArtifactExporter } from './internal/observability/artifacts/registry.js'
export type { SpyEvidenceReportV1 } from './internal/observability/spy/exportSpyEvidenceReport.js'

export const protocolVersion = Evidence.OBSERVABILITY_PROTOCOL_VERSION

export interface ObservationEnvelope extends Evidence.ObservationEnvelope {}
export interface EvidencePackageSource extends Evidence.EvidencePackageSource {}
export interface EvidencePackage extends Evidence.EvidencePackage {}
export interface ControlCommand extends Control.ControlCommand {}
export interface ControlAck extends Control.ControlAck {}
export interface AggregatedSnapshot extends Aggregate.AggregatedSnapshot {}
export interface AggregatedTimelineEntry extends Aggregate.AggregatedTimelineEntry {}
export interface AggregatedDiagnosticEntry extends Aggregate.AggregatedDiagnosticEntry {}

export const parseControlCommand = Control.parseControlCommand
export const makeControlAck = Control.makeControlAck
export const parseObservationEnvelope = Envelope.parseObservationEnvelope
export const sortObservationEnvelopes = Envelope.sortObservationEnvelopes

export const exportEvidencePackage = Evidence.exportEvidencePackage
export const importEvidencePackage = Evidence.importEvidencePackage

export const aggregateEvidencePackage = Aggregate.aggregateEvidencePackage
export const aggregateObservationEnvelopes = Aggregate.aggregateObservationEnvelopes
export const makeObservationAggregator = Aggregator.makeObservationAggregator

// 084 (Node-only): loader spy evidence (report-only; evidence ≠ authority)
export const runLoaderSpy = SpyHarness.runLoaderSpy
