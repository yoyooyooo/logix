import { Effect, Option } from 'effect'
import * as EffectOp from '../effect-op.js'
import * as EffectOpCore from '../runtime/core/EffectOpCore.js'
import * as Debug from '../runtime/core/DebugSink.js'
import { isDevEnv } from '../runtime/core/env.js'
import { RunSessionTag } from '../observability/runSession.js'
import type { PatchReason } from '../runtime/core/StateTransaction.js'
import type { FieldPath } from '../field-path.js'
import { emitDepsMismatch, onceInRunSession } from './converge-diagnostics.js'
import type { ConvergeContext } from './converge.types.js'
import type { ConvergeExecIr } from './converge-exec-ir.js'
import * as DepsTrace from './deps-trace.js'
import type { StateTraitEntry } from './model.js'

export const getMiddlewareStack = (): Effect.Effect<EffectOp.MiddlewareStack> =>
  Effect.serviceOption(EffectOpCore.EffectOpMiddlewareTag).pipe(
    Effect.map((maybe) => (Option.isSome(maybe) ? maybe.value.stack : [])),
  )

type WriterKind = 'computed' | 'link'

const getWriterKind = (entry: StateTraitEntry<any, string>): WriterKind | undefined =>
  entry.kind === 'computed' ? 'computed' : entry.kind === 'link' ? 'link' : undefined

const getWriterDeps = (entry: StateTraitEntry<any, string>): ReadonlyArray<string> => {
  if (entry.kind === 'computed') {
    return ((entry.meta as any)?.deps ?? []) as ReadonlyArray<string>
  }
  if (entry.kind === 'link') {
    return [entry.meta.from as string]
  }
  return []
}

const shouldSkip = (entry: StateTraitEntry<any, string>, prev: unknown, next: unknown): boolean => {
  if (entry.kind === 'computed') {
    const equals = (entry.meta as any)?.equals as ((a: unknown, b: unknown) => boolean) | undefined
    return equals ? equals(prev, next) : Object.is(prev, next)
  }
  return Object.is(prev, next)
}

export const runWriterStepOffFast = <S extends object>(
  ctx: ConvergeContext<S>,
  execIr: ConvergeExecIr,
  draft: {
    readonly getRoot: () => S
    readonly getAt: (path: FieldPath) => unknown
    readonly setAt: (path: FieldPath, value: unknown, prev?: unknown) => void
  },
  stepId: number,
  entry: StateTraitEntry<any, string>,
): boolean => {
  const kind = getWriterKind(entry)
  if (!kind) return false

  const reason: PatchReason = kind === 'computed' ? 'trait-computed' : 'trait-link'
  const from = kind === 'link' ? (entry.meta as any).from : undefined
  const outPathId = execIr.stepOutFieldPathIdByStepId[stepId]
  const outPath = execIr.fieldPathsById[outPathId]!
  const fromPathId = execIr.stepFromFieldPathIdByStepId[stepId]
  const fromPath = fromPathId >= 0 ? execIr.fieldPathsById[fromPathId] : undefined

  const current = draft.getRoot() as any
  const prev = draft.getAt(outPath)

  let next: unknown
  if (kind === 'computed') {
    const derive = (entry.meta as any).derive as (s: any) => unknown
    next = derive(current)
  } else {
    if (!fromPath) {
      throw new Error(`[StateTrait.converge] Missing link.from FieldPathId: from="${String(from)}"`)
    }
    next = draft.getAt(fromPath)
  }

  const changed = !shouldSkip(entry, prev, next)
  if (!changed) return false

  draft.setAt(outPath, next, prev)
  ctx.setDraft(draft.getRoot())
  ctx.recordPatch(outPathId, reason, prev, next)
  return true
}

export const runWriterStep = <S extends object>(
  ctx: ConvergeContext<S>,
  execIr: ConvergeExecIr,
  draft: {
    readonly getRoot: () => S
    readonly getAt: (path: FieldPath) => unknown
    readonly setAt: (path: FieldPath, value: unknown, prev?: unknown) => void
  },
  stepId: number,
  entry: StateTraitEntry<any, string>,
  shouldCollectDecision: boolean,
  diagnosticsLevel: Debug.DiagnosticsLevel,
  stack: EffectOp.MiddlewareStack,
): Effect.Effect<boolean> => {
  const moduleId = ctx.moduleId
  const instanceId = ctx.instanceId
  const fieldPath = entry.fieldPath

  const kind = getWriterKind(entry)
  if (!kind) return Effect.succeed(false)

  const reason: PatchReason = kind === 'computed' ? 'trait-computed' : 'trait-link'
  const opKind: EffectOp.EffectOp<any, any, any>['kind'] = kind === 'computed' ? 'trait-computed' : 'trait-link'
  const opName = kind === 'computed' ? 'computed:update' : 'link:propagate'

  const deps = getWriterDeps(entry)
  const from = kind === 'link' ? (entry.meta as any).from : undefined
  const outPathId = execIr.stepOutFieldPathIdByStepId[stepId]
  const outPath = execIr.fieldPathsById[outPathId]!
  const fromPathId = execIr.stepFromFieldPathIdByStepId[stepId]
  const fromPath = fromPathId >= 0 ? execIr.fieldPathsById[fromPathId] : undefined

  return Effect.gen(function* () {
    const stepLabel = diagnosticsLevel === 'off' ? undefined : (execIr.stepLabelByStepId[stepId] ?? String(stepId))

    let shouldTraceDeps = false
    if (kind === 'computed' && shouldCollectDecision && isDevEnv()) {
      const traceKey = `${moduleId ?? 'unknown'}::${instanceId ?? 'unknown'}::computed::${fieldPath}`
      shouldTraceDeps = yield* onceInRunSession(`deps_trace:settled:${traceKey}`)
    }

    const body: Effect.Effect<boolean> = Effect.sync(() => {
      const current = draft.getRoot() as any

      const prev = draft.getAt(outPath)

      let next: unknown
      let depsDiff: DepsTrace.DepsDiff | undefined

      if (kind === 'computed') {
        const derive = (entry.meta as any).derive as (s: any) => unknown
        if (shouldTraceDeps) {
          const traced = DepsTrace.trace((s) => derive(s), current)
          next = traced.value
          depsDiff = DepsTrace.diffDeps(((entry.meta as any).deps ?? []) as ReadonlyArray<string>, traced.reads)
        } else {
          next = derive(current)
        }
      } else {
        if (!fromPath) {
          throw new Error(`[StateTrait.converge] Missing link.from FieldPathId: from="${String(from)}"`)
        }
        next = draft.getAt(fromPath)
      }

      const changed = !shouldSkip(entry, prev, next)
      if (!changed) {
        return { changed: false, depsDiff }
      }

      draft.setAt(outPath, next, prev)
      ctx.setDraft(draft.getRoot())
      ctx.recordPatch(outPathId, reason, prev, next, undefined, stepId)
      return { changed: true, depsDiff }
    }).pipe(
      Effect.flatMap(({ changed, depsDiff }) =>
        depsDiff && kind === 'computed'
          ? emitDepsMismatch({
              moduleId,
              instanceId,
              kind: 'computed',
              fieldPath,
              diff: depsDiff,
            }).pipe(Effect.as(changed))
          : Effect.succeed(changed),
      ),
    )

    const meta: any = {
      moduleId,
      instanceId,
      txnSeq: ctx.txnSeq,
      txnId: ctx.txnId,
      fieldPath,
      deps,
      ...(kind === 'link'
        ? {
            from,
            to: fieldPath,
          }
        : null),
      ...(stepLabel ? { stepId: stepLabel } : null),
    }

    if (!(typeof meta.opSeq === 'number' && Number.isFinite(meta.opSeq))) {
      const sessionOpt = yield* Effect.serviceOption(RunSessionTag)
      if (Option.isSome(sessionOpt)) {
        const key = instanceId ?? 'global'
        meta.opSeq = sessionOpt.value.local.nextSeq('opSeq', key)
      }
    }

    const op = EffectOp.make<boolean, never, never>({
      kind: opKind,
      name: opName,
      effect: body,
      meta,
    })

    if (stack.length === 0) {
      return yield* body
    }

    return yield* EffectOp.run(op, stack)
  })
}
