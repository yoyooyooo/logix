import type {
  EntryRef,
  CliArgvSnapshot,
  DiagnosticsLevel,
  EvidenceInputRef,
  ScenarioInputRef,
  SelectionManifestRef,
  TrialMode,
} from './args.js'

export type CommandName = 'check' | 'trial' | 'compare' | 'unknown' | 'test.evidence-fixture'

export interface CommandInputCoordinate {
  readonly command: CommandName | string
  readonly argvSnapshot?: CliArgvSnapshot
  readonly entry?: EntryRef
  readonly evidence?: EvidenceInputRef
  readonly selection?: SelectionManifestRef
  readonly trialMode?: TrialMode
  readonly diagnosticsLevel?: DiagnosticsLevel
  readonly includeTrace?: boolean
  readonly maxEvents?: number
  readonly timeoutMs?: number
  readonly config?: Record<string, string | number | boolean>
  readonly scenario?: ScenarioInputRef
  readonly beforeReport?: string
  readonly afterReport?: string
  readonly beforeEvidence?: EvidenceInputRef
  readonly afterEvidence?: EvidenceInputRef
}

export const makeInputCoordinate = (input: CommandInputCoordinate): CommandInputCoordinate => ({
  command: input.command,
  ...(input.argvSnapshot ? { argvSnapshot: input.argvSnapshot } : null),
  ...(input.entry ? { entry: input.entry } : null),
  ...(input.evidence ? { evidence: input.evidence } : null),
  ...(input.selection ? { selection: input.selection } : null),
  ...(input.trialMode ? { trialMode: input.trialMode } : null),
  ...(input.diagnosticsLevel ? { diagnosticsLevel: input.diagnosticsLevel } : null),
  ...(typeof input.includeTrace === 'boolean' ? { includeTrace: input.includeTrace } : null),
  ...(typeof input.maxEvents === 'number' ? { maxEvents: input.maxEvents } : null),
  ...(typeof input.timeoutMs === 'number' ? { timeoutMs: input.timeoutMs } : null),
  ...(input.config ? { config: input.config } : null),
  ...(input.scenario ? { scenario: input.scenario } : null),
  ...(input.beforeReport ? { beforeReport: input.beforeReport } : null),
  ...(input.afterReport ? { afterReport: input.afterReport } : null),
  ...(input.beforeEvidence ? { beforeEvidence: input.beforeEvidence } : null),
  ...(input.afterEvidence ? { afterEvidence: input.afterEvidence } : null),
})
