import { Effect, Exit, Layer, ServiceMap } from 'effect'
import type { AnyModuleShape, ProgramRuntimeBlueprint } from '../runtime/core/module.js'
import { getProgramRuntimeBlueprint, isProgram, type AnyProgram } from '../program.js'
import type { VerifyKernelContractOptions, KernelContractVerificationResult } from './kernelContract.js'
import { verifyKernelContract as verifyKernelContractInternal } from './kernelContract.js'
import type { RuntimeServicesOverrides } from '../kernel-api.js'
import * as Kernel from '../kernel-api.js'
import type * as Debug from '../runtime/core/DebugSink.js'
import { runProofKernel } from '../verification/proofKernel.js'

type RootLike<Sh extends AnyModuleShape> = ProgramRuntimeBlueprint<any, Sh, any> | AnyProgram

const resolveRootBlueprint = <Sh extends AnyModuleShape>(root: RootLike<Sh>): ProgramRuntimeBlueprint<any, Sh, any> =>
  (isProgram(root)
    ? getProgramRuntimeBlueprint<Sh>(root)
    : (root as any)?._tag === 'ProgramRuntimeBlueprint'
    ? (root as ProgramRuntimeBlueprint<any, Sh, any>)
    : (() => {
        throw new Error('[Logix] Full cutover verification expected a Program.')
      })()) satisfies ProgramRuntimeBlueprint<any, Sh, any>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const stableJson = (value: unknown): string => JSON.stringify(value) ?? ''

const diffMetaKeys = (before: unknown, after: unknown): ReadonlyArray<string> => {
  const b = isRecord(before) ? before : {}
  const a = isRecord(after) ? after : {}
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).sort()
  const changed: string[] = []
  for (const k of keys) {
    if (stableJson(b[k]) !== stableJson(a[k])) {
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

    if (stableJson(before.anchor) !== stableJson(after.anchor)) {
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
    .sort((a, b) => (a.metaKey < b.metaKey ? -1 : a.metaKey > b.metaKey ? 1 : 0))

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
  readonly gateDiagnosticsLevel?: Debug.DiagnosticsLevel
  readonly enableContractMetaAllowlist?: boolean
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

export const verifyFullCutoverGate = <Sh extends AnyModuleShape>(
  root: RootLike<Sh>,
  options?: VerifyFullCutoverGateOptions<Sh>,
): Effect.Effect<FullCutoverGateVerificationResult, never, any> =>
  Effect.gen(function* () {
    const rootBlueprint = resolveRootBlueprint(root)

    const contractDiagnosticsLevel: Debug.DiagnosticsLevel =
      (options?.diagnosticsLevel as any) === 'off' ? 'light' : ((options?.diagnosticsLevel as any) ?? 'light')

    const contract = yield* verifyKernelContractInternal(root, {
      ...(options as any),
      diagnosticsLevel: contractDiagnosticsLevel,
    })

    const allowlistEnabled = options?.enableContractMetaAllowlist === true
    const allowlist = allowlistEnabled ? Kernel.KernelContractMetaAllowlist : []
    const contractAllowed = tryAllowlistKernelContractDiff({ result: contract, allowlist })
    const contractVerdict: 'PASS' | 'FAIL' = allowlistEnabled ? contractAllowed.verdict : contract.verdict

    const gateRun = (options?.gateAfter ?? options?.after) as FullCutoverGateTrialRunOptions<Sh> | undefined

    const gateProgram = Effect.gen(function* () {
      const ctx = yield* rootBlueprint.layer.pipe(Layer.build)
      const runtime: any = ServiceMap.get(ctx, rootBlueprint.module as any)
      if (gateRun?.interaction) {
        yield* gateRun.interaction(runtime)
      }
      return {
        kernelImplementationRef: Kernel.getKernelImplementationRef(runtime),
        runtimeServicesEvidence: Kernel.getRuntimeServicesEvidence(runtime),
      } as const
    })

    const gateLayer = gateRun?.layer
      ? (Layer.mergeAll(gateRun.layer, Kernel.fullCutoverGateModeLayer('trial')) as Layer.Layer<any, any, any>)
      : (Kernel.fullCutoverGateModeLayer('trial') as Layer.Layer<any, any, any>)

    const gateResult = yield* runProofKernel(gateProgram, {
      runId: gateRun?.runId,
      diagnosticsLevel: options?.gateDiagnosticsLevel ?? 'off',
      layer: gateLayer,
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
