import { Effect, Option } from 'effect'
import type { StateTxnContext } from './StateTransaction.js'
import * as Debug from './DebugSink.js'
import * as EffectOpCore from './EffectOpCore.js'
import * as EffectOp from '../../effect-op.js'
import type { RunSession } from '../../observability/runSession.js'
import { RunSessionTag } from '../../observability/runSession.js'
import { EffectOpMiddlewareTag } from './EffectOpCore.js'

export interface OperationRuntimeServices {
  readonly middlewareStack: EffectOp.MiddlewareStack
  readonly runSession: RunSession | undefined
}

const readMiddlewareEnv = (): Effect.Effect<Option.Option<EffectOpCore.EffectOpMiddlewareEnv>, never, any> =>
  Effect.serviceOption(EffectOpMiddlewareTag as any).pipe(
    Effect.map((option) => option as Option.Option<EffectOpCore.EffectOpMiddlewareEnv>),
  )

const readRunSession = (): Effect.Effect<Option.Option<RunSession>, never, any> =>
  Effect.serviceOption(RunSessionTag as any).pipe(Effect.map((option) => option as Option.Option<RunSession>))

export const resolveOperationRuntimeServices = (): Effect.Effect<OperationRuntimeServices, never, any> =>
  Effect.all([
    readMiddlewareEnv(),
    readRunSession(),
  ]).pipe(
    Effect.map(([middlewareOpt, runSessionOpt]) => ({
      middlewareStack: Option.isSome(middlewareOpt) ? middlewareOpt.value.stack : [],
      runSession: Option.isSome(runSessionOpt) ? runSessionOpt.value : undefined,
    })),
  )

export const getMiddlewareStack = (): Effect.Effect<EffectOp.MiddlewareStack, never, any> =>
  resolveOperationRuntimeServices().pipe(Effect.map((runtimeServices) => runtimeServices.middlewareStack))

export const assignOperationOpSeq = (
  meta: EffectOp.EffectOp['meta'] | undefined,
  runSession: RunSession | undefined,
): number | undefined => {
  const metaAny = meta as any
  if (typeof metaAny?.opSeq === 'number' && Number.isFinite(metaAny.opSeq)) {
    return Math.floor(metaAny.opSeq)
  }

  if (!runSession || !metaAny) {
    return undefined
  }

  const key = metaAny.instanceId ?? 'global'
  const opSeq = runSession.local.nextSeq('opSeq', key)
  metaAny.opSeq = opSeq
  return opSeq
}

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
  readonly runtimeLabel: string | undefined
  readonly txnContext: StateTxnContext<any>
}): RunOperation => {
  const { optionsModuleId, instanceId, runtimeLabel, txnContext } = args

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
      const [{ middlewareStack, runSession }, existingLinkId] = yield* Effect.all([
        resolveOperationRuntimeServices(),
        Effect.service(EffectOpCore.currentLinkId).pipe(Effect.orDie),
      ])

      const currentTxnId = txnContext.current?.txnId

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

      const opSeq = assignOperationOpSeq(baseMeta, runSession)

      const op = EffectOp.make<A2, E2, R2>({
        kind,
        name,
        payload: params.payload,
        effect: eff,
        meta: baseMeta,
      })

      const linkId = existingLinkId ?? op.id
      const program = middlewareStack.length ? EffectOp.run(op, middlewareStack) : op.effect

      // linkId: created at the boundary, reused for nested ops (shared across modules via a FiberRef).
      return yield* Effect.provideService(Effect.provideService(program, Debug.currentOpSeq, opSeq), EffectOpCore.currentLinkId, linkId)
    })

  return runOperation
}
