import type { ConvergeAuditFinding, ConvergeTxnRow } from './model.js'
import { makeTraitConvergeOverrideSnippets } from './snippets.js'
import { parseConvergeDecisionEvidence } from './evidence.js'
import { makeConvergeTxnKey } from './compute.js'

const firstModuleId = (rows: ReadonlyArray<ConvergeTxnRow>): string | undefined => {
  const moduleId = rows[0]?.moduleId
  return typeof moduleId === 'string' && moduleId.length > 0 ? moduleId : undefined
}

const makeFinding = (finding: ConvergeAuditFinding): ConvergeAuditFinding => ({
  ...finding,
  recommendations: finding.recommendations.length > 0 ? finding.recommendations : ['无'],
})

const auditBudgetCutoff = (rows: ReadonlyArray<ConvergeTxnRow>): ConvergeAuditFinding | undefined => {
  const moduleId = firstModuleId(rows)
  if (!moduleId) return undefined

  const parsed = rows.map((r) => parseConvergeDecisionEvidence(r.evidence))
  const budgetCutoffs = parsed.filter((p) => p.outcome === 'Degraded' && (p.reasons ?? []).includes('budget_cutoff'))
  if (budgetCutoffs.length === 0) return undefined

  const maxDuration = Math.max(...budgetCutoffs.map((p) => p.executionDurationMs ?? 0))
  const budget = Math.max(...budgetCutoffs.map((p) => p.executionBudgetMs ?? 0))
  if (!(budget > 0) || !(maxDuration > 0)) {
    return makeFinding({
      id: 'CNV-001',
      severity: 'error',
      summary: '检测到 converge 预算止损（Degraded）',
      explanation: '存在 Degraded 且 reasons 包含 budget_cutoff，但缺少可用的预算/耗时数值，无法给出止血配置建议。',
      requires: { status: 'insufficient_evidence', missingFields: ['executionBudgetMs', 'executionDurationMs'] },
      recommendations: ['提高 DiagnosticsLevel 或导入更完整的证据包后重试。'],
      snippets: [],
    })
  }

  const nextBudget = Math.max(budget, Math.ceil(maxDuration * 1.5))

  return makeFinding({
    id: 'CNV-001',
    severity: 'error',
    summary: `检测到 converge 预算止损（${budgetCutoffs.length} 次）`,
    explanation: `窗口内出现 budget_cutoff，导致 converge 软降级（状态派生被冻结以避免半成品提交）。maxDurationMs=${maxDuration} budgetMs=${budget}。`,
    requires: { status: 'ok' },
    recommendations: [
      '止血优先：先把该模块的 converge budget 小幅上调，避免频繁降级。',
      '长期：减少总 steps / 降低写入扇出，或排查为何频繁触发 budget_cutoff。',
    ],
    snippets: makeTraitConvergeOverrideSnippets({
      moduleId,
      patch: { traitConvergeBudgetMs: nextBudget },
    }),
  })
}

const auditNearBudget = (rows: ReadonlyArray<ConvergeTxnRow>): ConvergeAuditFinding | undefined => {
  const moduleId = firstModuleId(rows)
  if (!moduleId) return undefined

  const parsed = rows.map((r) => parseConvergeDecisionEvidence(r.evidence))
  const ratios = parsed
    .map((p) => {
      const budget = p.executionBudgetMs
      const duration = p.executionDurationMs
      if (budget == null || duration == null || budget <= 0) return undefined
      return { budget, duration, ratio: duration / budget }
    })
    .filter((v): v is NonNullable<typeof v> => v != null)

  const max = ratios.reduce<{ budget: number; duration: number; ratio: number } | undefined>(
    (acc, v) => (!acc || v.ratio > acc.ratio ? v : acc),
    undefined,
  )

  if (!max || max.ratio < 0.8) return undefined

  const nextBudget = Math.max(max.budget, Math.ceil(max.duration * 1.25))

  return makeFinding({
    id: 'CNV-002',
    severity: 'warning',
    summary: 'converge 接近预算上限（高风险）',
    explanation: `窗口内 converge 执行耗时接近预算上限：maxDurationMs=${max.duration} budgetMs=${max.budget} ratio=${max.ratio.toFixed(
      2,
    )}。`,
    requires: { status: 'ok' },
    recommendations: [
      '止血：给 converge 留出稳定余量（避免偶发抖动触发 budget_cutoff）。',
      '长期：减少 steps 或降低写入影响面（dirty roots / affectedSteps）。',
    ],
    snippets: makeTraitConvergeOverrideSnippets({
      moduleId,
      patch: { traitConvergeBudgetMs: nextBudget },
    }),
  })
}

const auditAutoAlwaysFull = (rows: ReadonlyArray<ConvergeTxnRow>): ConvergeAuditFinding | undefined => {
  const moduleId = firstModuleId(rows)
  if (!moduleId) return undefined

  const parsed = rows.map((r) => parseConvergeDecisionEvidence(r.evidence))
  const auto = parsed.filter((p) => p.requestedMode === 'auto')
  if (auto.length < 5) return undefined

  const fullCount = auto.filter((p) => p.executedMode === 'full').length
  const ratio = fullCount / auto.length
  if (ratio < 0.95) return undefined

  return makeFinding({
    id: 'CNV-003',
    severity: 'info',
    summary: 'auto 基本总是走 full（可以考虑显式固定）',
    explanation: `窗口内 requestedMode=auto 的 converge 事务里，executedMode=full 占比 ${Math.round(
      ratio * 100,
    )}%（${fullCount}/${auto.length}）。`,
    requires: { status: 'ok' },
    recommendations: [
      '如果你的目标是稳定与可复现（而不是追求 dirty 最小执行），可以先显式固定为 full，减少 auto 决策与 cache 相关开销。',
    ],
    snippets: makeTraitConvergeOverrideSnippets({
      moduleId,
      patch: { traitConvergeMode: 'full' },
    }),
  })
}

const auditDirtyNearFull = (rows: ReadonlyArray<ConvergeTxnRow>): ConvergeAuditFinding | undefined => {
  const moduleId = firstModuleId(rows)
  if (!moduleId) return undefined

  const parsed = rows.map((r) => parseConvergeDecisionEvidence(r.evidence))
  const dirty = parsed.filter(
    (p) => p.executedMode === 'dirty' && p.stepStats?.totalSteps && p.stepStats?.executedSteps,
  )
  if (dirty.length === 0) return undefined

  const maxRatio = dirty.reduce((acc, p) => {
    const total = p.stepStats?.totalSteps ?? 0
    const executed = p.stepStats?.executedSteps ?? 0
    if (!(total > 0)) return acc
    return Math.max(acc, executed / total)
  }, 0)

  if (maxRatio < 0.9) return undefined

  return makeFinding({
    id: 'CNV-004',
    severity: 'warning',
    summary: 'dirty 执行覆盖接近 full（dirty 优势很弱）',
    explanation: `存在 executedMode=dirty 的事务，但 executedSteps/totalSteps 最高达到 ${maxRatio.toFixed(2)}，说明 dirty 调度未显著减少执行量。`,
    requires: { status: 'ok' },
    recommendations: [
      '止血：可以考虑先固定为 full，避免 dirty 规划/缓存开销带来额外噪声。',
      '长期：排查 dirty roots 是否过宽、deps 是否准确、以及写入是否影响过多字段。',
    ],
    snippets: makeTraitConvergeOverrideSnippets({
      moduleId,
      patch: { traitConvergeMode: 'full' },
    }),
  })
}

const auditUnknownWrite = (rows: ReadonlyArray<ConvergeTxnRow>): ConvergeAuditFinding | undefined => {
  const moduleId = firstModuleId(rows)
  if (!moduleId) return undefined

  const parsed = rows.map((r) => parseConvergeDecisionEvidence(r.evidence))
  const hits = parsed.filter((p) => (p.reasons ?? []).some((r) => r === 'unknown_write' || r === 'dirty_all'))
  if (hits.length === 0) return undefined

  return makeFinding({
    id: 'CNV-005',
    severity: 'warning',
    summary: '写入影响面不可判定（unknown_write / dirty_all）',
    explanation:
      '窗口内出现 unknown_write/dirty_all，表示事务窗口内写入影响面无法收敛到稳定 roots（会导致 auto 回退 full 或 dirty 计划不可用）。',
    requires: { status: 'ok' },
    recommendations: [
      '优先排查事务窗口内是否存在“整棵 state 直接替换”或无法归因到具体路径的写入。',
      '止血：如果短期无法收敛写入影响面，可先固定为 full 保持行为可预测。',
    ],
    snippets: makeTraitConvergeOverrideSnippets({
      moduleId,
      patch: { traitConvergeMode: 'full' },
    }),
  })
}

const auditLowCacheHitRate = (rows: ReadonlyArray<ConvergeTxnRow>): ConvergeAuditFinding | undefined => {
  const moduleId = firstModuleId(rows)
  if (!moduleId) return undefined

  const parsed = rows.map((r) => parseConvergeDecisionEvidence(r.evidence))

  const withCache = parsed.filter((p) => {
    const c = p.cache
    const cap = c?.capacity ?? 0
    const hits = c?.hits ?? 0
    const misses = c?.misses ?? 0
    return cap > 0 || hits + misses > 0
  })

  if (withCache.length < 5) return undefined

  const hitCount = withCache.filter((p) => p.cache?.hit === true).length
  const hitRate = hitCount / withCache.length
  if (hitRate >= 0.2) return undefined

  return makeFinding({
    id: 'CNV-006',
    severity: 'warning',
    summary: 'plan cache 命中率过低（可能在做无效规划）',
    explanation: `窗口内 cache.hit 命中率约 ${Math.round(hitRate * 100)}%（${hitCount}/${withCache.length}）。命中率过低时，auto/dirty 可能在做重复规划但收益很小。`,
    requires: { status: 'ok' },
    recommendations: [
      '止血：可以先固定为 full，避免在低命中率下持续付出规划成本。',
      '长期：让 dirty roots 更稳定（减少 roots 组合抖动），或排查 generation 频繁变化导致的 cache 失效。',
    ],
    snippets: makeTraitConvergeOverrideSnippets({
      moduleId,
      patch: { traitConvergeMode: 'full' },
    }),
  })
}

const auditDirtyRootsTooWide = (rows: ReadonlyArray<ConvergeTxnRow>): ConvergeAuditFinding | undefined => {
  const moduleId = firstModuleId(rows)
  if (!moduleId) return undefined

  const parsed = rows.map((r) => parseConvergeDecisionEvidence(r.evidence))
  const candidates = parsed.filter((p) => p.executedMode === 'dirty' && p.dirty?.dirtyAll === false)
  if (candidates.length === 0) return undefined

  const missing = candidates.filter((p) => p.dirty?.rootCount == null)
  if (missing.length > 0) {
    return makeFinding({
      id: 'CNV-007',
      severity: 'info',
      summary: '无法评估 dirty roots 宽度（证据不足）',
      explanation:
        '存在 executedMode=dirty 的事务，但 dirty.rootCount 在当前证据中缺失（常见于 DiagnosticsLevel=light 的裁剪）。',
      requires: { status: 'insufficient_evidence', missingFields: ['dirty.rootCount'] },
      recommendations: ['提升 DiagnosticsLevel=full 或导入完整证据包后重试。'],
      snippets: [],
    })
  }

  const maxRootCount = Math.max(...candidates.map((p) => p.dirty?.rootCount ?? 0))
  const hasTruncated = candidates.some((p) => p.dirty?.rootIdsTruncated === true)

  if (maxRootCount <= 50 && !hasTruncated) return undefined

  return makeFinding({
    id: 'CNV-007',
    severity: 'warning',
    summary: 'dirty roots 过宽（dirty 可能退化为 full）',
    explanation: `dirty.rootCount 最大值为 ${maxRootCount}，且 rootIdsTruncated=${hasTruncated}。roots 过宽会导致 affectedSteps 接近 totalSteps，dirty 优势变弱。`,
    requires: { status: 'ok' },
    recommendations: [
      '长期：减少事务窗口写入影响面（roots），或收敛写入路径以提升 dirty 精度。',
      '止血：若短期无法收敛 roots，可先固定为 full 保持行为可预测。',
    ],
    snippets: makeTraitConvergeOverrideSnippets({
      moduleId,
      patch: { traitConvergeMode: 'full' },
    }),
  })
}

const auditMultipleStaticIrDigest = (rows: ReadonlyArray<ConvergeTxnRow>): ConvergeAuditFinding | undefined => {
  const parsed = rows.map((r) => parseConvergeDecisionEvidence(r.evidence))
  const digests = parsed.map((p) => p.staticIrDigest).filter((d): d is string => typeof d === 'string' && d.length > 0)
  const uniq = Array.from(new Set(digests))
  if (uniq.length <= 1) return undefined

  const shown = uniq.slice(0, 3)
  const truncated = uniq.length > shown.length

  return makeFinding({
    id: 'CNV-008',
    severity: 'warning',
    summary: '窗口内出现多个 staticIrDigest（可能存在 generation 变化）',
    explanation: `检测到多个 staticIrDigest：${shown.join(', ')}${truncated ? ' …' : ''}。这通常意味着 trait program generation 发生变化，会影响 cache 复用与结果可比性。`,
    requires: { status: 'ok' },
    recommendations: [
      '排查是否存在 logic install/uninstall、imports 变化等导致的 generation 变化；尽量在稳定窗口内做性能对比。',
    ],
    snippets: [],
  })
}

export const computeConvergeAudits = (rows: ReadonlyArray<ConvergeTxnRow>): ReadonlyArray<ConvergeAuditFinding> => {
  if (rows.length === 0) return []

  const audits: Array<ConvergeAuditFinding | undefined> = [
    auditBudgetCutoff(rows),
    auditNearBudget(rows),
    auditAutoAlwaysFull(rows),
    auditDirtyNearFull(rows),
    auditUnknownWrite(rows),
    auditLowCacheHitRate(rows),
    auditDirtyRootsTooWide(rows),
    auditMultipleStaticIrDigest(rows),
  ]

  return audits.filter((a): a is ConvergeAuditFinding => a != null)
}

export const computeConvergeAuditMatchTxnKeys = (
  rows: ReadonlyArray<ConvergeTxnRow>,
): Record<string, ReadonlyArray<string>> => {
  const match = new Map<string, Array<{ key: string; txnSeq: number }>>()

  const push = (auditId: string, row: ConvergeTxnRow) => {
    const key = makeConvergeTxnKey(row)
    const list = match.get(auditId) ?? []
    list.push({ key, txnSeq: row.txnSeq })
    match.set(auditId, list)
  }

  const allParsed = rows.map((row) => ({ row, p: parseConvergeDecisionEvidence(row.evidence) }))

  const staticIrDigests = allParsed
    .map(({ p }) => p.staticIrDigest)
    .filter((d): d is string => typeof d === 'string' && d.length > 0)
  const firstDigest = staticIrDigests[0]
  const hasMultipleDigests = new Set(staticIrDigests).size > 1

  for (const { row, p } of allParsed) {
    const reasons = p.reasons ?? []

    if (p.outcome === 'Degraded' && reasons.includes('budget_cutoff')) {
      push('CNV-001', row)
    }

    if (p.executionBudgetMs && p.executionDurationMs && p.executionBudgetMs > 0) {
      const ratio = p.executionDurationMs / p.executionBudgetMs
      if (ratio >= 0.8) {
        push('CNV-002', row)
      }
    }

    if (p.requestedMode === 'auto' && p.executedMode === 'full') {
      push('CNV-003', row)
    }

    if (p.executedMode === 'dirty') {
      const total = p.stepStats?.totalSteps ?? 0
      const executed = p.stepStats?.executedSteps ?? 0
      if (total > 0 && executed / total >= 0.9) {
        push('CNV-004', row)
      }
    }

    if (reasons.some((r) => r === 'unknown_write' || r === 'dirty_all')) {
      push('CNV-005', row)
    }

    const cache = p.cache
    if (cache && ((cache.capacity ?? 0) > 0 || (cache.hits ?? 0) + (cache.misses ?? 0) > 0)) {
      if (cache.hit === false) {
        push('CNV-006', row)
      }
    }

    if (p.executedMode === 'dirty' && p.dirty?.dirtyAll === false) {
      const rootCount = p.dirty.rootCount
      const truncated = p.dirty.rootIdsTruncated === true
      if (rootCount == null || rootCount > 50 || truncated) {
        push('CNV-007', row)
      }
    }

    if (hasMultipleDigests && firstDigest && p.staticIrDigest && p.staticIrDigest !== firstDigest) {
      push('CNV-008', row)
    }
  }

  const result: Record<string, ReadonlyArray<string>> = {}
  for (const [id, list] of match) {
    const uniq = new Map<string, number>()
    for (const item of list) {
      const prev = uniq.get(item.key)
      if (prev == null || item.txnSeq < prev) {
        uniq.set(item.key, item.txnSeq)
      }
    }
    result[id] = Array.from(uniq.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([key]) => key)
  }

  return result
}
