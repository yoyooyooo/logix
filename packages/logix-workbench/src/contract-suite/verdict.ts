import type { ContractSuiteReason, ContractSuiteVerdict } from './model.js'
import { CONTRACT_SUITE_PROTOCOL_VERSION, REASON_SEVERITY_ORDER } from './model.js'
import type { ContractSuiteNormalizedFacts } from './normalize.js'
import { PORT_SPEC_ARTIFACT_KEY, RULES_MANIFEST_ARTIFACT_KEY, TYPE_IR_ARTIFACT_KEY } from './normalize.js'

export type ContractSuitePolicy = {
  readonly requireRulesManifest?: boolean
  readonly requirePortSpec?: boolean
  /**
   * Missing TypeIR is a downgrade by default (WARN), not a hard FAIL.
   */
  readonly requireTypeIr?: boolean
}

const defaultPolicy: Required<ContractSuitePolicy> = {
  requireRulesManifest: false,
  requirePortSpec: true,
  requireTypeIr: false,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

const severityRank = (s: ContractSuiteReason['severity']): number => {
  const idx = REASON_SEVERITY_ORDER.indexOf(s)
  return idx >= 0 ? idx : 999
}

const sortReasons = (reasons: ReadonlyArray<ContractSuiteReason>): ReadonlyArray<ContractSuiteReason> =>
  Array.from(reasons).sort((a, b) => {
    const sa = severityRank(a.severity)
    const sb = severityRank(b.severity)
    if (sa !== sb) return sa - sb
    if (a.code !== b.code) return a.code < b.code ? -1 : 1
    const am = a.message ?? ''
    const bm = b.message ?? ''
    if (am !== bm) return am < bm ? -1 : 1
    const ap = a.pointer ?? ''
    const bp = b.pointer ?? ''
    if (ap !== bp) return ap < bp ? -1 : 1
    const aa = a.artifactKey ?? ''
    const ba = b.artifactKey ?? ''
    if (aa !== ba) return aa < ba ? -1 : 1
    return 0
  })

const computeVerdict = (reasons: ReadonlyArray<ContractSuiteReason>): ContractSuiteVerdict['verdict'] => {
  if (reasons.some((r) => r.severity === 'BREAKING')) return 'FAIL'
  if (reasons.some((r) => r.severity === 'RISKY')) return 'WARN'
  return 'PASS'
}

const computeSummary = (
  reasons: ReadonlyArray<ContractSuiteReason>,
): { readonly breaking: number; readonly risky: number; readonly info: number } => ({
  breaking: reasons.filter((r) => r.severity === 'BREAKING').length,
  risky: reasons.filter((r) => r.severity === 'RISKY').length,
  info: reasons.filter((r) => r.severity === 'INFO').length,
})

export const computeContractSuiteVerdict = (
  facts: ContractSuiteNormalizedFacts,
  policy?: ContractSuitePolicy,
): ContractSuiteVerdict => {
  const p: Required<ContractSuitePolicy> = { ...defaultPolicy, ...(policy ?? {}) }

  const reasons: ContractSuiteReason[] = []
  const usedArtifacts = new Set<string>()

  const markUsed = (artifactKey: string | undefined) => {
    if (!artifactKey) return
    usedArtifacts.add(artifactKey)
  }

  if (!facts.trialRunReport) {
    reasons.push({
      severity: 'BREAKING',
      code: 'contract_suite::missing_trial_run_report',
      message: 'TrialRunReport missing',
    })
  } else if (!facts.trialRunOk) {
    const code = facts.trialRunErrorCode ?? 'RuntimeFailure'
    if (code === 'MissingDependency') {
      reasons.push({
        severity: 'RISKY',
        code: 'trialrun::missing_dependency',
        message: 'TrialRun failed due to missing dependency (service/config).',
        details: facts.trialRunError,
      })
    } else if (code === 'Oversized') {
      reasons.push({
        severity: 'RISKY',
        code: 'trialrun::oversized',
        message: 'TrialRunReport exceeded budgets.maxBytes and was truncated.',
        details: facts.trialRunError,
      })
    } else if (code === 'TrialRunTimeout') {
      reasons.push({
        severity: 'BREAKING',
        code: 'trialrun::timeout',
        message: 'Trial run timed out.',
        details: facts.trialRunError,
      })
    } else if (code === 'DisposeTimeout') {
      reasons.push({
        severity: 'BREAKING',
        code: 'trialrun::dispose_timeout',
        message: 'Dispose timed out; likely leaked resources or unclosed fibers.',
        details: facts.trialRunError,
      })
    } else {
      reasons.push({
        severity: 'BREAKING',
        code: 'trialrun::runtime_failure',
        message: 'TrialRun failed due to runtime failure.',
        details: facts.trialRunError,
      })
    }
  }

  const portSpec = facts.artifactsByKey.get(PORT_SPEC_ARTIFACT_KEY)
  if (p.requirePortSpec && (!portSpec || portSpec.status === 'MISSING' || portSpec.status === 'FAILED')) {
    markUsed(PORT_SPEC_ARTIFACT_KEY)
    reasons.push({
      severity: 'BREAKING',
      code: 'artifact::portspec_unavailable',
      artifactKey: PORT_SPEC_ARTIFACT_KEY,
      message: 'ModulePortSpec is required but missing/failed.',
    })
  }

  const rules = facts.artifactsByKey.get(RULES_MANIFEST_ARTIFACT_KEY)
  if (p.requireRulesManifest && (!rules || rules.status === 'MISSING' || rules.status === 'FAILED')) {
    markUsed(RULES_MANIFEST_ARTIFACT_KEY)
    reasons.push({
      severity: 'BREAKING',
      code: 'artifact::rules_manifest_unavailable',
      artifactKey: RULES_MANIFEST_ARTIFACT_KEY,
      message: 'RulesManifest is required but missing/failed.',
    })
  }

  const typeIr = facts.artifactsByKey.get(TYPE_IR_ARTIFACT_KEY)
  if (p.requireTypeIr && (!typeIr || typeIr.status === 'MISSING' || typeIr.status === 'FAILED')) {
    markUsed(TYPE_IR_ARTIFACT_KEY)
    reasons.push({
      severity: 'BREAKING',
      code: 'artifact::typeir_unavailable',
      artifactKey: TYPE_IR_ARTIFACT_KEY,
      message: 'TypeIR is required but missing/failed.',
    })
  } else if (!p.requireTypeIr && (!typeIr || typeIr.status === 'MISSING' || typeIr.status === 'FAILED')) {
    markUsed(TYPE_IR_ARTIFACT_KEY)
    reasons.push({
      severity: 'RISKY',
      code: 'artifact::typeir_unavailable',
      artifactKey: TYPE_IR_ARTIFACT_KEY,
      message: 'TypeIR unavailable; falling back to key-level checks.',
    })
  }

  for (const artifact of facts.artifacts) {
    if (artifact.status === 'TRUNCATED') {
      markUsed(artifact.artifactKey)
      reasons.push({
        severity: 'RISKY',
        code: artifact.artifactKey === TYPE_IR_ARTIFACT_KEY ? 'artifact::typeir_truncated' : 'artifact::truncated',
        artifactKey: artifact.artifactKey,
        message: `${artifact.artifactKey} truncated by budgets.`,
      })
    }
  }

  const manifestDiff = facts.manifestDiff
  if (isRecord(manifestDiff) && Array.isArray((manifestDiff as any).changes)) {
    for (const change of (manifestDiff as any).changes as ReadonlyArray<unknown>) {
      if (!isRecord(change)) continue
      const severity = asNonEmptyString((change as any).severity)
      const code = asNonEmptyString((change as any).code)
      const message = asNonEmptyString((change as any).message)
      if (!severity || !code) continue
      if (severity !== 'BREAKING' && severity !== 'RISKY' && severity !== 'INFO') continue
      reasons.push({
        severity,
        code,
        message: message ?? undefined,
        pointer: asNonEmptyString((change as any).pointer),
        details: (change as any).details,
      })
    }
  }

  const rsDiff = facts.referenceSpace?.diff
  if (rsDiff?.portSpec) {
    for (const c of rsDiff.portSpec.changes) {
      const isBreaking = c.code.includes('removed_') || c.code.includes('module_id_changed')
      reasons.push({
        severity: isBreaking ? 'BREAKING' : 'RISKY',
        code: c.code,
        message: c.message,
        artifactKey: PORT_SPEC_ARTIFACT_KEY,
      })
      markUsed(PORT_SPEC_ARTIFACT_KEY)
    }
  }

  if (rsDiff?.typeIr) {
    for (const c of rsDiff.typeIr.changes) {
      const isBreaking = c.code === 'typeir::removed_type' || c.code === 'typeir::kind_changed'
      reasons.push({
        severity: isBreaking ? 'BREAKING' : 'RISKY',
        code: c.code,
        message: c.message,
        artifactKey: TYPE_IR_ARTIFACT_KEY,
      })
      markUsed(TYPE_IR_ARTIFACT_KEY)
    }
  }

  const sortedReasons = sortReasons(reasons)
  const verdict = computeVerdict(sortedReasons)
  const summary = computeSummary(sortedReasons)

  const artifacts = facts.artifacts
    .map((a) => ({
      artifactKey: a.artifactKey,
      status: a.status,
      ...(usedArtifacts.has(a.artifactKey) ? { usedByVerdict: true } : null),
      ...(a.notes !== undefined ? { summary: a.notes } : null),
    }))
    .sort((a, b) => (a.artifactKey < b.artifactKey ? -1 : a.artifactKey > b.artifactKey ? 1 : 0))

  return {
    protocolVersion: CONTRACT_SUITE_PROTOCOL_VERSION,
    ...(facts.moduleId ? { moduleId: facts.moduleId } : null),
    runId: facts.runId,
    verdict,
    summary,
    reasons: sortedReasons,
    artifacts,
  }
}
