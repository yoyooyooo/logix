import { Effect, FiberRef, Option } from 'effect'
import type { StateTxnContext } from './StateTransaction.js'
import * as Debug from './DebugSink.js'
import * as EffectOpCore from './EffectOpCore.js'
import * as EffectOp from '../../effect-op.js'
import { RunSessionTag } from '../../observability/runSession.js'

export const getMiddlewareStack = (): Effect.Effect<EffectOp.MiddlewareStack, never, never> =>
  Effect.serviceOption(EffectOpCore.EffectOpMiddlewareTag).pipe(
    Effect.map((maybe) => (Option.isSome(maybe) ? maybe.value.stack : [])),
  )

export type RunOperation = <A, E, R>(
  kind: EffectOp.EffectOp['kind'],
  name: string,
  params: {
    readonly payload?: unknown
    readonly meta?: EffectOp.EffectOp['meta']
  },
  eff: Effect.Effect<A, E, R>,
) => Effect.Effect<A, E, R>

export const makeRunOperation = (args: {
  readonly optionsModuleId: string | undefined
  readonly instanceId: string
  readonly txnContext: StateTxnContext<any>
}): RunOperation => {
  const { optionsModuleId, instanceId, txnContext } = args

  const runOperation: RunOperation = <A2, E2, R2>(
    kind: EffectOp.EffectOp['kind'],
    name: string,
    params: {
      readonly payload?: unknown
      readonly meta?: EffectOp.EffectOp['meta']
    },
    eff: Effect.Effect<A2, E2, R2>,
  ): Effect.Effect<A2, E2, R2> =>
    Effect.gen(function* () {
      const stack = yield* getMiddlewareStack()

      const currentTxnId = txnContext.current?.txnId
      const existingLinkId = yield* FiberRef.get(EffectOpCore.currentLinkId)

      const runtimeLabel = yield* FiberRef.get(Debug.currentRuntimeLabel)

      // NOTE: linkId is generated/propagated by the Runtime:
      // - Boundary entrypoints create a new linkId.
      // - Nested operations reuse the current FiberRef.linkId.
      // - Never default to randomness/time to avoid non-replayable implicit identifiers.
      const { linkId: _ignoredLinkId, ...restMeta } = (params.meta ?? {}) as any

      const baseMeta: EffectOp.EffectOp['meta'] = {
        ...restMeta,
        // Filled by the runtime.
        moduleId: (params.meta as any)?.moduleId ?? optionsModuleId,
        instanceId: (params.meta as any)?.instanceId ?? instanceId,
        runtimeLabel: (params.meta as any)?.runtimeLabel ?? runtimeLabel,
        txnSeq: (params.meta as any)?.txnSeq ?? txnContext.current?.txnSeq,
        txnId: (params.meta as any)?.txnId ?? currentTxnId,
      }

      const baseMetaAny = baseMeta as any
      if (!(typeof baseMetaAny.opSeq === 'number' && Number.isFinite(baseMetaAny.opSeq))) {
        const sessionOpt = yield* Effect.serviceOption(RunSessionTag)
        if (Option.isSome(sessionOpt)) {
          const key = baseMetaAny.instanceId ?? 'global'
          baseMetaAny.opSeq = sessionOpt.value.local.nextSeq('opSeq', key)
        }
      }

      const op0 = EffectOp.make<A2, E2, R2>({
        kind,
        name,
        payload: params.payload,
        effect: eff,
        meta: baseMeta,
      })

      const linkId = existingLinkId ?? op0.id
      const op =
        (op0.meta as any)?.linkId === linkId
          ? op0
          : ({
              ...op0,
              meta: {
                ...(op0.meta ?? {}),
                linkId,
              },
            } as typeof op0)

      const program = stack.length ? EffectOp.run(op, stack) : op.effect

      // linkId: created at the boundary, reused for nested ops (shared across modules via a FiberRef).
      const opSeq =
        typeof baseMetaAny.opSeq === 'number' && Number.isFinite(baseMetaAny.opSeq)
          ? Math.floor(baseMetaAny.opSeq)
          : undefined
      return yield* Effect.locally(
        EffectOpCore.currentLinkId,
        linkId,
      )(Effect.locally(Debug.currentOpSeq, opSeq)(program))
    })

  return runOperation
}
