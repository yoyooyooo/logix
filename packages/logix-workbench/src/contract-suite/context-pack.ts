import type {
  ArtifactStatus,
  ContractSuiteContextPack,
  ContractSuiteFactsInputs,
  ContractSuiteTarget,
  ContractSuiteVerdict,
} from './model.js'
import { CONTRACT_SUITE_PROTOCOL_VERSION } from './model.js'
import type { ContractSuiteNormalizedFacts, NormalizedArtifact } from './normalize.js'
import { SCHEMA_REGISTRY_ARTIFACT_KEY } from './normalize.js'

export type ContractSuiteContextPackOptions = {
  readonly suiteId?: string
  readonly target?: ContractSuiteTarget
  readonly constraints?: unknown
  readonly includeUiKitRegistry?: boolean
  readonly includeVerdict?: boolean
  readonly includeManifestDiff?: boolean
  readonly includeArtifacts?: boolean
  /**
   * By default, artifact values are only included when used by the verdict. This option allows
   * whitelisting additional artifact keys to include their values in the pack (subject to maxBytes).
   */
  readonly includeArtifactValuesFor?: ReadonlyArray<string>
  /**
   * When present, enforces an upper bound on the JSON-serialized bytes of the pack.
   * The pack will deterministically drop optional fields until the budget is met.
   */
  readonly maxBytes?: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

const toBytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length

const sanitizeInputs = (
  inputs: ContractSuiteFactsInputs | undefined,
  options: ContractSuiteContextPackOptions,
): ContractSuiteFactsInputs | undefined => {
  if (!inputs) return undefined
  const includeUiKitRegistry = options.includeUiKitRegistry === true
  if (includeUiKitRegistry) return inputs
  const { uiKitRegistry: _uiKitRegistry, ...rest } = inputs as any
  return Object.keys(rest).length > 0 ? (rest as any) : undefined
}

const sanitizeTrialRunReportForContract = (args: {
  readonly report: unknown
  readonly runId: string
  readonly ok: boolean
}): unknown => {
  const report = args.report
  if (!isRecord(report)) return report
  const any: any = report as any
  return {
    runId: asNonEmptyString(any.runId) ?? args.runId,
    ok: typeof any.ok === 'boolean' ? any.ok : args.ok,
    ...(any.manifest !== undefined ? { manifest: any.manifest } : null),
    ...(any.staticIr !== undefined ? { staticIr: any.staticIr } : null),
    ...(any.environment !== undefined ? { environment: any.environment } : null),
    ...(any.evidence !== undefined ? { evidence: any.evidence } : null),
    ...(any.summary !== undefined ? { summary: any.summary } : null),
    ...(any.error !== undefined ? { error: any.error } : null),
  }
}

const toArtifactFacts = (args: {
  readonly normalized: ReadonlyArray<NormalizedArtifact>
  readonly verdict?: ContractSuiteVerdict
  readonly includeValues: boolean
  readonly includeValuesFor?: ReadonlyArray<string>
}): ReadonlyArray<{ readonly artifactKey: string; readonly status: ArtifactStatus; readonly value?: unknown; readonly notes?: string }> => {
  const used = new Set<string>(
    args.verdict?.artifacts.filter((a) => a.usedByVerdict === true).map((a) => a.artifactKey) ?? [],
  )
  for (const key of args.includeValuesFor ?? []) {
    const normalized = asNonEmptyString(key)
    if (normalized) used.add(normalized)
  }

  return args.normalized
    .map((a) => {
      const shouldIncludeValue = args.includeValues && used.has(a.artifactKey) && a.value !== undefined
      return {
        artifactKey: a.artifactKey,
        status: a.status,
        ...(shouldIncludeValue ? { value: a.value } : null),
      }
    })
    .sort((a, b) => (a.artifactKey < b.artifactKey ? -1 : a.artifactKey > b.artifactKey ? 1 : 0))
}

export const makeContractSuiteContextPack = (args: {
  readonly facts: ContractSuiteNormalizedFacts
  readonly verdict?: ContractSuiteVerdict
  readonly options?: ContractSuiteContextPackOptions
}): ContractSuiteContextPack => {
  const options: ContractSuiteContextPackOptions = {
    includeUiKitRegistry: false,
    includeVerdict: true,
    includeManifestDiff: true,
    includeArtifacts: true,
    includeArtifactValuesFor: [SCHEMA_REGISTRY_ARTIFACT_KEY],
    ...(args.options ?? {}),
  }

  const inputs = sanitizeInputs(args.facts.inputs, options)

  const pack: ContractSuiteContextPack = {
    protocolVersion: CONTRACT_SUITE_PROTOCOL_VERSION,
    ...(options.suiteId ? { suiteId: options.suiteId } : null),
    target: options.target ?? { kind: 'investigate' },
    constraints: options.constraints ?? {},
    facts: {
      ...(inputs ? { inputs } : null),
      trialRunReport: sanitizeTrialRunReportForContract({
        report: args.facts.trialRunReport,
        runId: args.facts.runId,
        ok: args.facts.trialRunOk,
      }),
      ...(options.includeManifestDiff !== false && args.facts.manifestDiff !== undefined ? { manifestDiff: args.facts.manifestDiff } : null),
      ...(options.includeArtifacts !== false
        ? {
            artifacts: toArtifactFacts({
              normalized: args.facts.artifacts,
              verdict: args.verdict,
              includeValues: true,
              includeValuesFor: options.includeArtifactValuesFor,
            }),
          }
        : null),
    },
    ...(options.includeVerdict !== false && args.verdict ? { verdict: args.verdict } : null),
  }

  const maxBytes = options.maxBytes
  if (typeof maxBytes !== 'number' || !Number.isFinite(maxBytes) || maxBytes <= 0) return pack

  const originalBytes = toBytes(pack)
  if (originalBytes <= maxBytes) return pack

  const dropped: string[] = []

  const tryDropArtifactsValues = (p: ContractSuiteContextPack): ContractSuiteContextPack => {
    if (!p.facts.artifacts) return p
    const stripped = p.facts.artifacts.map((a: any) => ({ artifactKey: a.artifactKey, status: a.status }))
    dropped.push('facts.artifacts[].value')
    return { ...p, facts: { ...p.facts, artifacts: stripped } as any }
  }

  const tryDropField = (p: ContractSuiteContextPack, path: string): ContractSuiteContextPack => {
    if (path === 'facts.artifacts' && p.facts.artifacts) {
      dropped.push('facts.artifacts')
      const { artifacts: _artifacts, ...restFacts } = p.facts as any
      return { ...p, facts: restFacts }
    }
    if (path === 'verdict' && (p as any).verdict) {
      dropped.push('verdict')
      const { verdict: _verdict, ...rest } = p as any
      return rest
    }
    if (path === 'facts.inputs' && p.facts.inputs) {
      dropped.push('facts.inputs')
      const { inputs: _inputs, ...restFacts } = p.facts as any
      return { ...p, facts: restFacts }
    }
    if (path === 'facts.manifestDiff' && (p.facts as any).manifestDiff !== undefined) {
      dropped.push('facts.manifestDiff')
      const { manifestDiff: _manifestDiff, ...restFacts } = p.facts as any
      return { ...p, facts: restFacts }
    }
    return p
  }

  const sanitizeTrialRunField = (p: ContractSuiteContextPack, field: string): ContractSuiteContextPack => {
    const tr = p.facts.trialRunReport
    if (!isRecord(tr)) return p
    if (!(field in tr)) return p
    dropped.push(`facts.trialRunReport.${field}`)
    const { [field]: _dropped, ...rest } = tr as any
    return { ...p, facts: { ...p.facts, trialRunReport: rest } }
  }

  let next = pack
  next = tryDropArtifactsValues(next)
  if (toBytes(next) > maxBytes) next = tryDropField(next, 'facts.artifacts')
  if (toBytes(next) > maxBytes) next = tryDropField(next, 'verdict')
  if (toBytes(next) > maxBytes) next = tryDropField(next, 'facts.inputs')
  if (toBytes(next) > maxBytes) next = tryDropField(next, 'facts.manifestDiff')

  if (toBytes(next) > maxBytes) next = sanitizeTrialRunField(next, 'evidence')
  if (toBytes(next) > maxBytes) next = sanitizeTrialRunField(next, 'staticIr')
  if (toBytes(next) > maxBytes) next = sanitizeTrialRunField(next, 'environment')
  if (toBytes(next) > maxBytes) next = sanitizeTrialRunField(next, 'summary')
  if (toBytes(next) > maxBytes) next = sanitizeTrialRunField(next, 'manifest')

  if (toBytes(next) > maxBytes && isRecord(next.constraints)) {
    dropped.push('constraints')
    next = { ...next, constraints: {} }
  }

  const finalBytes = toBytes(next)

  return {
    ...next,
    notes: {
      __logix: {
        truncated: true,
        maxBytes,
        originalBytes,
        finalBytes,
        dropped,
      },
    },
  }
}
