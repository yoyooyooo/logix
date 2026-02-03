import { Effect, Layer } from 'effect'

import type { AnyModuleShape, ModuleImpl } from '../../runtime/core/module.js'
import { trialRunModule, type TrialRunModuleOptions, type TrialRunReport } from '../trialRunModule.js'
import { diffDeclaredVsUsed } from './diffDeclaredVsUsed.js'
import { makeSpyCollector, SpyCollectorTag } from './SpyCollector.js'
import { exportSpyEvidenceReport, type SpyEvidenceReportV1, type SpyEvidenceViolationEntry } from './exportSpyEvidenceReport.js'

type RootLike<Sh extends AnyModuleShape> = ModuleImpl<any, Sh, any> | { readonly impl: ModuleImpl<any, Sh, any> }

export interface SpyHarnessBudgets {
  readonly maxUsedServices?: number
  readonly maxRawMode?: number
}

export interface SpyHarnessOptions {
  readonly runId: string
  readonly budgets?: SpyHarnessBudgets
  readonly trialRun?: Pick<
    TrialRunModuleOptions,
    'buildEnv' | 'trialRunTimeoutMs' | 'closeScopeTimeout' | 'diagnosticsLevel' | 'maxEvents' | 'layer'
  >
}

const toViolationsFromTrialRun = (report: TrialRunReport): ReadonlyArray<SpyEvidenceViolationEntry> => {
  const violations: SpyEvidenceViolationEntry[] = []

  if (report.ok !== true) {
    if (report.error) {
      violations.push({
        code: report.error.code ?? 'trialRun.failed',
        message: report.error.message ?? 'trialRun failed',
        details: report.error as any,
      })
    } else {
      violations.push({ code: 'trialRun.failed', message: 'trialRun failed' })
    }
  }

  const missing = report.environment?.missingServices ?? []
  if (missing.length > 0) {
    violations.push({
      code: 'trialRun.missingServices',
      message: `missing services: ${missing.join(', ')}`,
      details: { missingServices: missing } as any,
    })
  }

  return violations
}

export const runLoaderSpy = <Sh extends AnyModuleShape>(
  root: RootLike<Sh>,
  options: SpyHarnessOptions,
): Effect.Effect<SpyEvidenceReportV1, never, never> =>
  Effect.gen(function* () {
    const collector = makeSpyCollector()
    const spyLayer = Layer.succeed(SpyCollectorTag, collector)

    const mergedLayer = options.trialRun?.layer ? Layer.mergeAll(options.trialRun.layer, spyLayer) : spyLayer

    const report = yield* trialRunModule(root as any, {
      runId: options.runId,
      diagnosticsLevel: options.trialRun?.diagnosticsLevel ?? 'off',
      maxEvents: options.trialRun?.maxEvents ?? 0,
      buildEnv: options.trialRun?.buildEnv,
      trialRunTimeoutMs: options.trialRun?.trialRunTimeoutMs ?? 2_000,
      closeScopeTimeout: options.trialRun?.closeScopeTimeout,
      layer: mergedLayer as any,
    })

    const snapshot = collector.snapshot()

    const violations: SpyEvidenceViolationEntry[] = [...toViolationsFromTrialRun(report)]

    const maxUsed = options.budgets?.maxUsedServices
    const maxRaw = options.budgets?.maxRawMode

    const usedServices =
      typeof maxUsed === 'number' && Number.isFinite(maxUsed) && maxUsed > 0
        ? snapshot.usedServices.slice(0, maxUsed)
        : snapshot.usedServices

    if (usedServices.length !== snapshot.usedServices.length) {
      violations.push({
        code: 'spy.budget.usedServicesTruncated',
        message: `usedServices truncated: ${usedServices.length}/${snapshot.usedServices.length}`,
        details: { maxUsedServices: maxUsed } as any,
      })
    }

    const rawMode =
      typeof maxRaw === 'number' && Number.isFinite(maxRaw) && maxRaw > 0 ? snapshot.rawMode.slice(0, maxRaw) : snapshot.rawMode

    if (rawMode.length !== snapshot.rawMode.length) {
      violations.push({
        code: 'spy.budget.rawModeTruncated',
        message: `rawMode truncated: ${rawMode.length}/${snapshot.rawMode.length}`,
        details: { maxRawMode: maxRaw } as any,
      })
    }

    const diff = diffDeclaredVsUsed({
      usedServices,
      declaredManifest: report.manifest,
    })

    const limitations: string[] = [
      'best-effort: 仅代表当前采集窗口内的执行路径（不穷尽分支）',
      'loader: 默认不提供业务 Service；缺失服务可能导致提前失败（见 violations）',
      '证据 ≠ 权威：最终依赖关系必须回写到源码（services/servicePorts），宁可漏不乱补',
    ]

    return exportSpyEvidenceReport({
      runId: options.runId,
      snapshot: { usedServices, rawMode },
      diff,
      coverage: { limitations },
      violations,
    })
  })

