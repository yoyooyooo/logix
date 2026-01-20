import { Context, Effect, Exit, Layer } from 'effect'
import type { ModuleImpl, AnyModuleShape } from '../runtime/core/module.js'
import type { ModuleRuntime } from '../runtime/core/module.js'
import { trialRun } from '../observability/trialRun.js'
import type { EvidencePackage } from '../observability/evidence.js'
import type { JsonValue } from '../observability/jsonValue.js'
import { fnv1a32, stableStringify } from '../digest.js'
import type { Middleware } from '../effect-op.js'
import * as Debug from '../runtime/core/DebugSink.js'
import * as EffectOpCore from '../runtime/core/EffectOpCore.js'
import * as KernelRef from '../runtime/core/KernelRef.js'
import type * as RuntimeKernel from '../runtime/core/RuntimeKernel.js'

type AnyModuleLike = { readonly impl: ModuleImpl<any, AnyModuleShape, any> }

type RootLike<Sh extends AnyModuleShape> = ModuleImpl<any, Sh, any> | AnyModuleLike

const resolveRootImpl = <Sh extends AnyModuleShape>(root: RootLike<Sh>): ModuleImpl<any, Sh, any> =>
  ((root as any)?._tag === 'ModuleImpl'
    ? (root as ModuleImpl<any, Sh, any>)
    : ((root as any)?.impl as ModuleImpl<any, Sh, any>)) satisfies ModuleImpl<any, Sh, any>

export type KernelContractVerdict = 'PASS' | 'FAIL'

export interface KernelContractAnchor {
  readonly instanceId: string
  readonly txnSeq: number
  readonly opSeq: number
}

export interface KernelContractTraceOp {
  readonly anchor: KernelContractAnchor
  readonly moduleId: string
  readonly kind: string
  readonly name: string
  readonly meta?: JsonValue
}

export interface KernelContractRunSummary {
  readonly ok: boolean
  readonly kernelImplementationRef: KernelRef.KernelImplementationRef
  readonly runtimeServicesEvidence?: JsonValue
  readonly trace: {
    readonly digest: string
    readonly opCount: number
  }
  readonly error?: {
    readonly name: string
    readonly message: string
  }
}

export type KernelContractDiffChangeCode = 'op.added' | 'op.removed' | 'op.changed' | 'run.failure'

export interface KernelContractDiffChange {
  readonly code: KernelContractDiffChangeCode
  readonly anchor?: KernelContractAnchor
  readonly before?: JsonValue
  readonly after?: JsonValue
}

export interface KernelContractVerificationResult {
  readonly version: string
  readonly verdict: KernelContractVerdict
  readonly before: KernelContractRunSummary
  readonly after: KernelContractRunSummary
  readonly changes: ReadonlyArray<KernelContractDiffChange>
  readonly summary: {
    readonly added: number
    readonly removed: number
    readonly changed: number
  }
}

export interface KernelContractRunOptions<Sh extends AnyModuleShape> {
  readonly runId?: string
  readonly layer?: Layer.Layer<any, any, any>
  readonly runtimeServicesInstanceOverrides?: RuntimeKernel.RuntimeServicesOverrides
  readonly interaction?: (runtime: ModuleRuntime<any, any>) => Effect.Effect<void, any, any>
}

export interface VerifyKernelContractOptions<Sh extends AnyModuleShape> {
  readonly before?: KernelContractRunOptions<Sh>
  readonly after?: KernelContractRunOptions<Sh>
  readonly diagnosticsLevel?: Debug.DiagnosticsLevel
  readonly maxEvents?: number
}

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const asNonNegInt = (value: unknown, fallback = 0): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const n = Math.floor(value)
  return n >= 0 ? n : fallback
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const makeTraceEffectOpObserver = (): Middleware => {
  return <A, E, R>(op: import('../effect-op.js').EffectOp<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.gen(function* () {
      // Observation-only capability: can be locally disabled by policy.
      if ((op.meta as any)?.policy?.disableObservers) {
        return yield* op.effect
      }

      const meta: any = op.meta ?? {}
      const slimOp = {
        id: op.id,
        kind: op.kind,
        name: op.name,
        payload: op.payload,
        meta: op.meta,
      }

      yield* Debug.record({
        type: 'trace:effectop',
        moduleId: typeof meta.moduleId === 'string' ? meta.moduleId : undefined,
        instanceId: typeof meta.instanceId === 'string' ? meta.instanceId : undefined,
        runtimeLabel: typeof meta.runtimeLabel === 'string' ? meta.runtimeLabel : undefined,
        txnSeq: typeof meta.txnSeq === 'number' && Number.isFinite(meta.txnSeq) ? Math.floor(meta.txnSeq) : undefined,
        data: slimOp,
      } as any)

      return yield* op.effect
    })
}

const extractRuntimeSummary = (
  evidence: EvidencePackage,
): {
  readonly kernelImplementationRef: KernelRef.KernelImplementationRef
  readonly runtimeServicesEvidence?: JsonValue
} => {
  const summary: any = evidence.summary
  const runtime: any = summary?.runtime
  const kernelImplementationRefRaw = runtime?.kernelImplementationRef
  const kernelImplementationRef = KernelRef.normalizeKernelImplementationRef(kernelImplementationRefRaw)
  const services = runtime?.services as JsonValue | undefined
  return {
    kernelImplementationRef,
    runtimeServicesEvidence: services,
  }
}

const canonicalizeOpMeta = (opMetaRaw: unknown): JsonValue | undefined => {
  if (!isRecord(opMetaRaw)) return undefined

  const out: Record<string, JsonValue> = {}
  for (const [k, v] of Object.entries(opMetaRaw)) {
    // volatile / non-contract anchors
    if (k === 'instanceId' || k === 'txnId' || k === 'runtimeLabel' || k === 'linkId') continue

    if ((k === 'deps' || k === 'trace' || k === 'tags') && Array.isArray(v) && v.every((x) => typeof x === 'string')) {
      out[k] = (v as ReadonlyArray<string>).slice().sort() as unknown as JsonValue
      continue
    }

    out[k] = v as JsonValue
  }

  return out as JsonValue
}

const extractKernelContractTraceOps = (evidence: EvidencePackage): ReadonlyArray<KernelContractTraceOp> => {
  const instanceMap = new Map<string, string>()
  let nextInstanceIndex = 0

  const mapInstanceId = (raw: string): string => {
    if (raw === 'unknown') return 'unknown'
    const existing = instanceMap.get(raw)
    if (existing) return existing
    nextInstanceIndex += 1
    const next = `i${nextInstanceIndex}`
    instanceMap.set(raw, next)
    return next
  }

  const ops: KernelContractTraceOp[] = []

  for (const e of evidence.events) {
    if (e.type !== 'debug:event') continue
    const payload: any = e.payload
    if (!isRecord(payload)) continue

    const meta: any = payload.meta
    const opMeta: any = meta?.meta
    const opSeq = asNonNegInt(opMeta?.opSeq, -1)
    if (opSeq < 0) continue

    const instanceIdRaw = asNonEmptyString(payload.instanceId) ?? 'unknown'
    const instanceId = mapInstanceId(instanceIdRaw)
    const txnSeq = asNonNegInt(payload.txnSeq, 0)

    const moduleId = asNonEmptyString(payload.moduleId) ?? 'unknown'
    const kind = asNonEmptyString(meta?.kind) ?? asNonEmptyString(payload.kind) ?? 'unknown'
    const name = asNonEmptyString(meta?.name) ?? asNonEmptyString(payload.label) ?? 'effectop'

    ops.push({
      anchor: { instanceId, txnSeq, opSeq },
      moduleId,
      kind,
      name,
      meta: canonicalizeOpMeta(opMeta),
    })
  }

  ops.sort((a, b) => {
    if (a.anchor.instanceId !== b.anchor.instanceId) return a.anchor.instanceId < b.anchor.instanceId ? -1 : 1
    if (a.anchor.txnSeq !== b.anchor.txnSeq) return a.anchor.txnSeq - b.anchor.txnSeq
    return a.anchor.opSeq - b.anchor.opSeq
  })

  return ops
}

const anchorKey = (a: KernelContractAnchor): string => `${a.instanceId}::t${a.txnSeq}::o${a.opSeq}`

const diffKernelContractTraceOps = (
  before: ReadonlyArray<KernelContractTraceOp>,
  after: ReadonlyArray<KernelContractTraceOp>,
): {
  readonly changes: ReadonlyArray<KernelContractDiffChange>
  readonly summary: KernelContractVerificationResult['summary']
} => {
  const changes: KernelContractDiffChange[] = []

  const beforeByKey = new Map<string, KernelContractTraceOp>()
  const afterByKey = new Map<string, KernelContractTraceOp>()

  for (const op of before) {
    beforeByKey.set(anchorKey(op.anchor), op)
  }
  for (const op of after) {
    afterByKey.set(anchorKey(op.anchor), op)
  }

  const allKeys = Array.from(new Set([...beforeByKey.keys(), ...afterByKey.keys()])).sort()

  for (const key of allKeys) {
    const b = beforeByKey.get(key)
    const a = afterByKey.get(key)

    if (!b && a) {
      changes.push({
        code: 'op.added',
        anchor: a.anchor,
        after: a as unknown as JsonValue,
      })
      continue
    }
    if (b && !a) {
      changes.push({
        code: 'op.removed',
        anchor: b.anchor,
        before: b as unknown as JsonValue,
      })
      continue
    }
    if (!b || !a) continue

    const bJson = stableStringify(b)
    const aJson = stableStringify(a)
    if (bJson !== aJson) {
      changes.push({
        code: 'op.changed',
        anchor: b.anchor,
        before: b as unknown as JsonValue,
        after: a as unknown as JsonValue,
      })
    }
  }

  const summary = {
    added: changes.filter((c) => c.code === 'op.added').length,
    removed: changes.filter((c) => c.code === 'op.removed').length,
    changed: changes.filter((c) => c.code === 'op.changed').length,
  } as const satisfies KernelContractVerificationResult['summary']

  return { changes, summary }
}

const VERSION = 'v1'

const runOnce = <Sh extends AnyModuleShape>(
  rootImpl: ModuleImpl<any, Sh, any>,
  run: KernelContractRunOptions<Sh> | undefined,
  options: Pick<VerifyKernelContractOptions<Sh>, 'diagnosticsLevel' | 'maxEvents'>,
): Effect.Effect<
  {
    readonly summary: KernelContractRunSummary
    readonly traceOps: ReadonlyArray<KernelContractTraceOp>
  },
  never,
  any
> =>
  Effect.gen(function* () {
    const interaction = run?.interaction
    const program = Effect.gen(function* () {
      const ctx = yield* rootImpl.layer.pipe(Layer.build)
      const runtime = Context.get(ctx, rootImpl.module)
      if (interaction) {
        yield* interaction(runtime)
      }
      return runtime.instanceId
    }) as Effect.Effect<string, any, any>

    const traceLayer = Layer.succeed(EffectOpCore.EffectOpMiddlewareTag, {
      stack: [makeTraceEffectOpObserver()],
    }) as unknown as Layer.Layer<any, never, never>

    const extraLayer = run?.layer ? (Layer.mergeAll(traceLayer, run.layer) as Layer.Layer<any, any, any>) : traceLayer

    const result = yield* trialRun(program as any, {
      runId: run?.runId,
      diagnosticsLevel: options.diagnosticsLevel ?? 'light',
      maxEvents: options.maxEvents,
      layer: extraLayer,
      runtimeServicesInstanceOverrides: run?.runtimeServicesInstanceOverrides,
    })

    const ok = Exit.isSuccess(result.exit)
    const error =
      Exit.isFailure(result.exit) && result.exit.cause != null
        ? (() => {
            const failure = Exit.isFailure(result.exit) ? result.exit.cause : undefined
            const err = (failure as any)?._tag === 'Die' ? (failure as any).defect : (failure as any)
            if (err instanceof Error) {
              return { name: err.name, message: err.message }
            }
            return { name: 'UnknownError', message: String(err ?? 'unknown') }
          })()
        : undefined

    const runtimeSummary = extractRuntimeSummary(result.evidence)
    const traceOps = extractKernelContractTraceOps(result.evidence)
    const traceDigest = fnv1a32(stableStringify(traceOps))

    return {
      summary: {
        ok,
        kernelImplementationRef: runtimeSummary.kernelImplementationRef,
        runtimeServicesEvidence: runtimeSummary.runtimeServicesEvidence,
        trace: { digest: traceDigest, opCount: traceOps.length },
        ...(error ? { error } : {}),
      },
      traceOps,
    }
  })

export const verifyKernelContract = <Sh extends AnyModuleShape>(
  root: RootLike<Sh>,
  options?: VerifyKernelContractOptions<Sh>,
): Effect.Effect<KernelContractVerificationResult, never, any> =>
  Effect.gen(function* () {
    const rootImpl = resolveRootImpl(root)

    const beforeRun = yield* runOnce(rootImpl, options?.before, {
      diagnosticsLevel: options?.diagnosticsLevel,
      maxEvents: options?.maxEvents,
    })

    const afterRun = yield* runOnce(rootImpl, options?.after, {
      diagnosticsLevel: options?.diagnosticsLevel,
      maxEvents: options?.maxEvents,
    })

    const hasRunFailure = !beforeRun.summary.ok || !afterRun.summary.ok
    const diff = hasRunFailure
      ? { changes: [{ code: 'run.failure' as const }], summary: { added: 0, removed: 0, changed: 0 } }
      : diffKernelContractTraceOps(beforeRun.traceOps, afterRun.traceOps)

    const verdict: KernelContractVerdict = hasRunFailure || diff.changes.length > 0 ? 'FAIL' : 'PASS'

    return {
      version: VERSION,
      verdict,
      before: beforeRun.summary,
      after: afterRun.summary,
      changes: diff.changes,
      summary: diff.summary,
    }
  })
