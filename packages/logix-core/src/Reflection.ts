import { Context, Effect, Exit, Layer } from 'effect'
import type { AnyModuleShape, ModuleImpl } from './internal/module.js'
import type { AnyModule } from './Module.js'
import type { StaticIr } from './internal/state-trait/ir.js'
import type { ExtractManifestOptions, ModuleManifest } from './internal/reflection/manifest.js'
import * as Manifest from './internal/reflection/manifest.js'
import * as StaticIrExport from './internal/reflection/staticIr.js'
import type { DiffManifestOptions, ModuleManifestDiff } from './internal/reflection/diff.js'
import * as ManifestDiff from './internal/reflection/diff.js'
import type {
  KernelContractVerificationResult,
  VerifyKernelContractOptions,
} from './internal/reflection/kernelContract.js'
import { verifyKernelContract as verifyKernelContractInternal } from './internal/reflection/kernelContract.js'
import { trialRun } from './internal/observability/trialRun.js'
import type { RuntimeServicesOverrides } from './Kernel.js'
import * as Kernel from './Kernel.js'
import type * as Debug from './internal/runtime/core/DebugSink.js'

export type {
  ModuleManifest,
  ExtractManifestOptions,
  ModuleManifestDiff,
  DiffManifestOptions,
  KernelContractVerificationResult,
  VerifyKernelContractOptions,
}

type AnyModuleLike = { readonly impl: ModuleImpl<any, AnyModuleShape, any> }
type RootLike<Sh extends AnyModuleShape> = ModuleImpl<any, Sh, any> | AnyModuleLike

const resolveRootImpl = <Sh extends AnyModuleShape>(root: RootLike<Sh>): ModuleImpl<any, Sh, any> =>
  ((root as any)?._tag === 'ModuleImpl'
    ? (root as ModuleImpl<any, Sh, any>)
    : ((root as any)?.impl as ModuleImpl<any, Sh, any>)) satisfies ModuleImpl<any, Sh, any>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const stableJson = (value: unknown): string => JSON.stringify(value) ?? ''

const diffMetaKeys = (before: unknown, after: unknown): ReadonlyArray<string> => {
  const b = isRecord(before) ? before : {}
  const a = isRecord(after) ? after : {}
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).sort((x, y) => x.localeCompare(y))
  const changed: string[] = []
  for (const k of keys) {
    if (stableJson((b as any)[k]) !== stableJson((a as any)[k])) {
      changed.push(k)
    }
  }
  return changed
}

export interface KernelContractAllowedDiff {
  readonly metaKey: string
  readonly count: number
  readonly reason?: string
}

const tryAllowlistKernelContractDiff = (args: {
  readonly result: KernelContractVerificationResult
  readonly allowlist: ReadonlyArray<Kernel.KernelContractMetaAllowlistItem>
}): { readonly verdict: 'PASS' | 'FAIL'; readonly allowedDiffs: ReadonlyArray<KernelContractAllowedDiff> } => {
  if (args.allowlist.length === 0) {
    return { verdict: args.result.verdict, allowedDiffs: [] }
  }

  const allow = new Map<string, string | undefined>()
  for (const item of args.allowlist) {
    allow.set(item.metaKey, item.reason)
  }

  const allowedCounts = new Map<string, number>()

  for (const change of args.result.changes) {
    if (change.code !== 'op.changed') {
      return { verdict: 'FAIL', allowedDiffs: [] }
    }

    const before = change.before as any
    const after = change.after as any
    if (!isRecord(before) || !isRecord(after)) {
      return { verdict: 'FAIL', allowedDiffs: [] }
    }

    const anchorBefore = before.anchor
    const anchorAfter = after.anchor
    if (stableJson(anchorBefore) !== stableJson(anchorAfter)) {
      return { verdict: 'FAIL', allowedDiffs: [] }
    }
    if (stableJson(before.moduleId) !== stableJson(after.moduleId)) {
      return { verdict: 'FAIL', allowedDiffs: [] }
    }
    if (stableJson(before.kind) !== stableJson(after.kind)) {
      return { verdict: 'FAIL', allowedDiffs: [] }
    }
    if (stableJson(before.name) !== stableJson(after.name)) {
      return { verdict: 'FAIL', allowedDiffs: [] }
    }

    const changed = diffMetaKeys(before.meta, after.meta)
    for (const metaKey of changed) {
      if (!allow.has(metaKey)) {
        return { verdict: 'FAIL', allowedDiffs: [] }
      }
      allowedCounts.set(metaKey, (allowedCounts.get(metaKey) ?? 0) + 1)
    }
  }

  const allowedDiffs = Array.from(allowedCounts.entries())
    .map(([metaKey, count]) => ({
      metaKey,
      count,
      ...(allow.get(metaKey) ? { reason: allow.get(metaKey) } : {}),
    }))
    .sort((a, b) => a.metaKey.localeCompare(b.metaKey))

  return { verdict: 'PASS', allowedDiffs }
}

export interface FullCutoverGateTrialRunOptions<Sh extends AnyModuleShape> {
  readonly runId?: string
  readonly layer?: Layer.Layer<any, any, any>
  readonly runtimeServicesInstanceOverrides?: RuntimeServicesOverrides
  readonly interaction?: (runtime: any) => Effect.Effect<void, any, any>
}

export interface VerifyFullCutoverGateOptions<Sh extends AnyModuleShape> extends VerifyKernelContractOptions<Sh> {
  readonly mode?: Kernel.FullCutoverGateMode
  /**
   * Evidence trimming level for gate evaluation:
   * - `off`: minimal summary (must still be runnable)
   * - `light` / `full`: add explainable details
   */
  readonly gateDiagnosticsLevel?: Debug.DiagnosticsLevel
  /**
   * Contract diff allowlist (disabled by default).
   * - Only allows specific op meta keys (by metaKey); the SSoT is code (KernelContractMetaAllowlist).
   */
  readonly enableContractMetaAllowlist?: boolean
  /**
   * After-run options used for gate evaluation; defaults to `options.after`.
   *
   * Only used to read runtimeServicesEvidence/kernelRef; does not rely on debug logs.
   */
  readonly gateAfter?: FullCutoverGateTrialRunOptions<Sh>
}

export interface FullCutoverGateVerificationResult {
  readonly version: 'v1'
  readonly verdict: 'PASS' | 'FAIL'
  readonly gate: Kernel.FullCutoverGateResult
  readonly contract: KernelContractVerificationResult
  readonly contractVerdict: 'PASS' | 'FAIL'
  readonly allowedDiffs?: ReadonlyArray<KernelContractAllowedDiff>
}

/**
 * Reflection.extractManifest
 *
 * Extracts a platform-consumable Manifest IR (JSON, diffable) from the final module object (`AnyModule` / `ModuleImpl`).
 */
export const extractManifest = (
  module: ModuleImpl<any, AnyModuleShape, any> | AnyModule,
  options?: ExtractManifestOptions,
): ModuleManifest => Manifest.extractManifest(module, options)

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
 * If the module contains a StateTrait program, exports canonical StaticIR (same shape and digest as StateTrait.exportStaticIr).
 */
export const exportStaticIr = (module: ModuleImpl<any, AnyModuleShape, any> | AnyModule): StaticIr | undefined =>
  StaticIrExport.exportStaticIr(module)

/**
 * Reflection.verifyKernelContract
 *
 * Runs two trial-runs (with optional different Layers/overrides) and exports a stable, machine-readable kernel contract diff report.
 */
export const verifyKernelContract = <Sh extends AnyModuleShape>(
  module: ModuleImpl<any, Sh, any> | AnyModule,
  options?: VerifyKernelContractOptions<Sh>,
): import('effect').Effect.Effect<KernelContractVerificationResult, never, any> =>
  verifyKernelContractInternal(module as any, options as any)

export const verifyFullCutoverGate = <Sh extends AnyModuleShape>(
  module: ModuleImpl<any, Sh, any> | AnyModule,
  options?: VerifyFullCutoverGateOptions<Sh>,
): Effect.Effect<FullCutoverGateVerificationResult, never, any> =>
  Effect.gen(function* () {
    const rootImpl = resolveRootImpl(module as any)

    const contractDiagnosticsLevel: Debug.DiagnosticsLevel =
      (options?.diagnosticsLevel as any) === 'off' ? 'light' : ((options?.diagnosticsLevel as any) ?? 'light')

    const contract = yield* verifyKernelContractInternal(module as any, {
      ...(options as any),
      diagnosticsLevel: contractDiagnosticsLevel,
    })

    const allowlistEnabled = options?.enableContractMetaAllowlist === true
    const allowlist = allowlistEnabled ? Kernel.KernelContractMetaAllowlist : []
    const contractAllowed = tryAllowlistKernelContractDiff({ result: contract, allowlist })
    const contractVerdict: 'PASS' | 'FAIL' = allowlistEnabled ? contractAllowed.verdict : contract.verdict

    const gateRun = (options?.gateAfter ?? options?.after) as FullCutoverGateTrialRunOptions<Sh> | undefined

    const gateProgram = Effect.gen(function* () {
      const ctx = yield* rootImpl.layer.pipe(Layer.build)
      const runtime: any = Context.get(ctx, rootImpl.module as any)
      if (gateRun?.interaction) {
        yield* gateRun.interaction(runtime)
      }
      return {
        kernelImplementationRef: Kernel.getKernelImplementationRef(runtime),
        runtimeServicesEvidence: Kernel.getRuntimeServicesEvidence(runtime),
      } as const
    })

    const gateResult = yield* trialRun(gateProgram, {
      runId: gateRun?.runId,
      diagnosticsLevel: options?.gateDiagnosticsLevel ?? 'off',
      layer: gateRun?.layer,
      runtimeServicesInstanceOverrides: gateRun?.runtimeServicesInstanceOverrides,
    })

    const gateValue = Exit.isSuccess(gateResult.exit)
      ? gateResult.exit.value
      : (() => {
          const msg = Exit.isFailure(gateResult.exit)
            ? String((gateResult.exit as any).cause ?? 'trial-run failed')
            : 'trial-run failed'
          throw new Error(msg)
        })()

    const gate = Kernel.evaluateFullCutoverGate({
      mode: options?.mode ?? 'fullCutover',
      requestedKernelId: gateValue.kernelImplementationRef.kernelId,
      runtimeServicesEvidence: gateValue.runtimeServicesEvidence,
      diagnosticsLevel: options?.gateDiagnosticsLevel ?? 'off',
    })

    const verdict: 'PASS' | 'FAIL' = gate.verdict === 'PASS' && contractVerdict === 'PASS' ? 'PASS' : 'FAIL'

    return {
      version: 'v1',
      verdict,
      gate,
      contract,
      contractVerdict,
      ...(allowlistEnabled ? { allowedDiffs: contractAllowed.allowedDiffs } : {}),
    }
  })
