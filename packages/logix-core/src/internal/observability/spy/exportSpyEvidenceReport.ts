import type { JsonValue } from '../jsonValue.js'
import type { RawModeEntry, ServiceUseEvidence, SpyCollectorSnapshot } from './SpyCollector.js'

export interface SpyEvidenceReportDiff {
  readonly usedButNotDeclared: ReadonlyArray<string>
  readonly declaredButNotUsed: ReadonlyArray<string>
}

export interface SpyEvidenceCoverageMarker {
  readonly stage: 'loader'
  readonly completeness: 'best-effort'
  readonly limitations: ReadonlyArray<string>
}

export interface SpyEvidenceViolationEntry {
  readonly code: string
  readonly message: string
  readonly details?: JsonValue
}

export interface SpyEvidenceSummary {
  readonly usedServicesTotal: number
  readonly rawModeTotal: number
  readonly violationsTotal: number
}

export interface SpyEvidenceReportV1 {
  readonly schemaVersion: 1
  readonly kind: 'SpyEvidenceReport'
  readonly mode: 'loader'
  readonly runId: string
  readonly usedServices: ReadonlyArray<ServiceUseEvidence>
  readonly rawMode: ReadonlyArray<RawModeEntry>
  readonly diff?: SpyEvidenceReportDiff
  readonly coverage: SpyEvidenceCoverageMarker
  readonly violations: ReadonlyArray<SpyEvidenceViolationEntry>
  readonly summary: SpyEvidenceSummary
}

const uniqSorted = (input: ReadonlyArray<string>): ReadonlyArray<string> => {
  const out = Array.from(new Set(input.filter((s) => typeof s === 'string' && s.length > 0)))
  out.sort()
  return out
}

const normalizeViolations = (violations: ReadonlyArray<SpyEvidenceViolationEntry>): ReadonlyArray<SpyEvidenceViolationEntry> => {
  const out = violations
    .filter((v) => v && typeof v === 'object' && typeof (v as any).code === 'string' && typeof (v as any).message === 'string')
    .map((v) => ({
      code: String((v as any).code),
      message: String((v as any).message),
      details: (v as any).details as JsonValue | undefined,
    }))

  out.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : a.message < b.message ? -1 : a.message > b.message ? 1 : 0))
  return out
}

export const exportSpyEvidenceReport = (params: {
  readonly runId: string
  readonly snapshot: SpyCollectorSnapshot
  readonly diff?: SpyEvidenceReportDiff
  readonly coverage?: { readonly limitations?: ReadonlyArray<string> }
  readonly violations?: ReadonlyArray<SpyEvidenceViolationEntry>
}): SpyEvidenceReportV1 => {
  const usedServices = (params.snapshot.usedServices ?? []).slice()
  usedServices.sort((a, b) => {
    if (a.serviceId !== b.serviceId) return a.serviceId < b.serviceId ? -1 : 1
    const am = a.moduleId ?? ''
    const bm = b.moduleId ?? ''
    if (am !== bm) return am < bm ? -1 : 1
    const al = a.logicKey ?? ''
    const bl = b.logicKey ?? ''
    if (al !== bl) return al < bl ? -1 : 1
    return 0
  })

  const rawMode = (params.snapshot.rawMode ?? []).slice()
  rawMode.sort((a, b) => {
    const am = a.moduleId ?? ''
    const bm = b.moduleId ?? ''
    if (am !== bm) return am < bm ? -1 : 1
    const at = a.tagName ?? ''
    const bt = b.tagName ?? ''
    if (at !== bt) return at < bt ? -1 : 1
    const ar = a.reasonCodes.join(',')
    const br = b.reasonCodes.join(',')
    if (ar !== br) return ar < br ? -1 : 1
    return 0
  })

  const diff = params.diff
    ? {
        usedButNotDeclared: uniqSorted(params.diff.usedButNotDeclared),
        declaredButNotUsed: uniqSorted(params.diff.declaredButNotUsed),
      }
    : undefined

  const limitations = uniqSorted(
    params.coverage?.limitations && params.coverage.limitations.length > 0
      ? params.coverage.limitations
      : [
          'best-effort: 仅代表当前采集窗口内的执行路径（不穷尽分支）',
          'loader: 若缺失服务导致提前失败，可能只得到前缀证据（见 violations）',
          '绕过 Tag 的依赖访问无法保证被捕获（证据 ≠ 权威）',
        ],
  )

  const violations = normalizeViolations(params.violations ?? [])

  const summary: SpyEvidenceSummary = {
    usedServicesTotal: usedServices.length,
    rawModeTotal: rawMode.length,
    violationsTotal: violations.length,
  }

  return {
    schemaVersion: 1,
    kind: 'SpyEvidenceReport',
    mode: 'loader',
    runId: params.runId,
    usedServices,
    rawMode,
    ...(diff ? { diff } : null),
    coverage: {
      stage: 'loader',
      completeness: 'best-effort',
      limitations,
    },
    violations,
    summary,
  }
}

