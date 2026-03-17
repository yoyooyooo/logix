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

export interface OperationRuntimeSnapshot {
  readonly middlewareEnv: EffectOpCore.EffectOpMiddlewareEnv | undefined
  readonly runSession: RunSession | undefined
}

export type OperationRunSessionOpSeqAllocator = (
  meta: EffectOp.EffectOp['meta'] | undefined,
) => number | undefined

export interface OperationRuntimeHotContext {
  readonly runtimeServices: OperationRuntimeServices
  readonly canUseHotFastPath: boolean
  readonly runSessionOpSeqAllocator: OperationRunSessionOpSeqAllocator | undefined
}

export const hasEmptyOperationMiddlewareStack = (services: OperationRuntimeServices): boolean =>
  services.middlewareStack.length === 0

export const isOperationRuntimeServicesEmpty = (services: OperationRuntimeServices): boolean =>
  hasEmptyOperationMiddlewareStack(services) && services.runSession === undefined

const EMPTY_OPERATION_MIDDLEWARE_STACK: EffectOp.MiddlewareStack = []
const EMPTY_OPERATION_RUNTIME_SERVICES: OperationRuntimeServices = {
  middlewareStack: EMPTY_OPERATION_MIDDLEWARE_STACK,
  runSession: undefined,
}
const operationRuntimeServicesByRunSession = new WeakMap<RunSession, OperationRuntimeServices>()
const operationRuntimeServicesByMiddlewareEnv = new WeakMap<
  EffectOpCore.EffectOpMiddlewareEnv,
  OperationRuntimeServices
>()
const operationRuntimeServicesByMiddlewareAndSession = new WeakMap<
  EffectOpCore.EffectOpMiddlewareEnv,
  WeakMap<RunSession, OperationRuntimeServices>
>()

const canonicalizeOperationRuntimeServices = (args: {
  readonly middlewareEnv: EffectOpCore.EffectOpMiddlewareEnv | undefined
  readonly runSession: RunSession | undefined
}): OperationRuntimeServices => {
  if (!args.middlewareEnv) {
    if (!args.runSession) {
      return EMPTY_OPERATION_RUNTIME_SERVICES
    }
    const cached = operationRuntimeServicesByRunSession.get(args.runSession)
    if (cached) {
      return cached
    }
    const services: OperationRuntimeServices = {
      middlewareStack: EMPTY_OPERATION_MIDDLEWARE_STACK,
      runSession: args.runSession,
    }
    operationRuntimeServicesByRunSession.set(args.runSession, services)
    return services
  }

  const middlewareStack = args.middlewareEnv.stack
  if (!args.runSession) {
    const cached = operationRuntimeServicesByMiddlewareEnv.get(args.middlewareEnv)
    if (cached && cached.middlewareStack === middlewareStack) {
      return cached
    }
    const services: OperationRuntimeServices = {
      middlewareStack,
      runSession: undefined,
    }
    operationRuntimeServicesByMiddlewareEnv.set(args.middlewareEnv, services)
    return services
  }

  let nested = operationRuntimeServicesByMiddlewareAndSession.get(args.middlewareEnv)
  if (!nested) {
    nested = new WeakMap<RunSession, OperationRuntimeServices>()
    operationRuntimeServicesByMiddlewareAndSession.set(args.middlewareEnv, nested)
  }
  const cached = nested.get(args.runSession)
  if (cached && cached.middlewareStack === middlewareStack) {
    return cached
  }
  const services: OperationRuntimeServices = {
    middlewareStack,
    runSession: args.runSession,
  }
  nested.set(args.runSession, services)
  return services
}

const readMiddlewareEnv = (): Effect.Effect<Option.Option<EffectOpCore.EffectOpMiddlewareEnv>, never, any> =>
  Effect.serviceOption(EffectOpMiddlewareTag as any).pipe(
    Effect.map((option) => option as Option.Option<EffectOpCore.EffectOpMiddlewareEnv>),
  )

const readRunSession = (): Effect.Effect<Option.Option<RunSession>, never, any> =>
  Effect.serviceOption(RunSessionTag as any).pipe(Effect.map((option) => option as Option.Option<RunSession>))

export const captureOperationRuntimeSnapshot = (): Effect.Effect<OperationRuntimeSnapshot, never, any> =>
  Effect.gen(function* () {
    const middlewareOpt = yield* readMiddlewareEnv()
    const runSessionOpt = yield* readRunSession()
    return {
      middlewareEnv: Option.isSome(middlewareOpt) ? middlewareOpt.value : undefined,
      runSession: Option.isSome(runSessionOpt) ? runSessionOpt.value : undefined,
    }
  })

export const resolveOperationRuntimeServices = (
  snapshot?: OperationRuntimeSnapshot,
): Effect.Effect<OperationRuntimeServices, never, any> =>
  Effect.gen(function* () {
    if (snapshot) {
      return canonicalizeOperationRuntimeServices(snapshot)
    }

    const runtimeSnapshot = yield* captureOperationRuntimeSnapshot()
    return canonicalizeOperationRuntimeServices(runtimeSnapshot)
  })

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

const makeRunSessionLocalOpSeqAllocator = (
  runSession: RunSession | undefined,
): ((meta: EffectOp.EffectOp['meta'] | undefined) => number | undefined) | undefined => {
  if (!runSession) {
    return undefined
  }

  const local = runSession.local
  return (meta) => {
    const metaAny = meta as any
    if (typeof metaAny?.opSeq === 'number' && Number.isFinite(metaAny.opSeq)) {
      return Math.floor(metaAny.opSeq)
    }

    if (!metaAny) {
      return undefined
    }

    const key = metaAny.instanceId ?? 'global'
    const opSeq = local.nextSeq('opSeq', key)
    metaAny.opSeq = opSeq
    return opSeq
  }
}

const operationRuntimeHotContextCache = new WeakMap<OperationRuntimeServices, OperationRuntimeHotContext>()

export const captureOperationRuntimeHotContext = (
  runtimeServices: OperationRuntimeServices | undefined,
): OperationRuntimeHotContext | undefined => {
  if (!runtimeServices) {
    return undefined
  }

  const cached = operationRuntimeHotContextCache.get(runtimeServices)
  if (cached) {
    return cached
  }

  const hotContext: OperationRuntimeHotContext = {
    runtimeServices,
    canUseHotFastPath: hasEmptyOperationMiddlewareStack(runtimeServices),
    runSessionOpSeqAllocator: makeRunSessionLocalOpSeqAllocator(runtimeServices.runSession),
  }
  operationRuntimeHotContextCache.set(runtimeServices, hotContext)
  return hotContext
}

const assignInlineFastPathOpSeq = (
  meta: EffectOp.EffectOp['meta'] | undefined,
  fallbackInstanceId: string,
  runSession: RunSession | undefined,
): number | undefined =>
  assignOperationOpSeq(
    {
      instanceId: (meta as any)?.instanceId ?? fallbackInstanceId,
      opSeq: (meta as any)?.opSeq,
    } as EffectOp.EffectOp['meta'],
    runSession,
  )

const makeOperationId = (instanceId: unknown, opSeq: number): string =>
  typeof instanceId === 'string' && instanceId.length > 0 ? `${instanceId}::o${opSeq}` : `o${opSeq}`

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
  readonly defaultRuntimeServices?: OperationRuntimeServices
}): RunOperation => {
  const { optionsModuleId, instanceId, runtimeLabel, txnContext, defaultRuntimeServices } = args
  const defaultRuntimeHotContext = captureOperationRuntimeHotContext(defaultRuntimeServices)
  const readHotOperationRuntimeContext = (): OperationRuntimeHotContext | undefined => {
    const fromTxnHotContext = (txnContext.current as any)?.operationRuntimeHotContext as
      | OperationRuntimeHotContext
      | undefined
    if (fromTxnHotContext) {
      return fromTxnHotContext
    }

    const fromTxnServices = (txnContext.current as any)?.operationRuntimeServices as OperationRuntimeServices | undefined
    const captured = captureOperationRuntimeHotContext(fromTxnServices)
    if (captured && txnContext.current && (txnContext.current as any).operationRuntimeHotContext !== captured) {
      ;(txnContext.current as any).operationRuntimeHotContext = captured
    }
    return captured ?? defaultRuntimeHotContext
  }

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
      const existingLinkId = yield* Effect.service(EffectOpCore.currentLinkId).pipe(Effect.orDie)
      const hotRuntimeContext = readHotOperationRuntimeContext()
      const hotRuntimeServices = hotRuntimeContext?.runtimeServices
      const canUseHotFastPath = hotRuntimeContext?.canUseHotFastPath === true
      const hotRunSessionOpSeqAllocator = hotRuntimeContext?.runSessionOpSeqAllocator

      const provideInlineContext = (opSeq: number | undefined, linkId: string) =>
        Effect.provideService(Effect.provideService(eff, Debug.currentOpSeq, opSeq), EffectOpCore.currentLinkId, linkId)

      if (canUseHotFastPath && existingLinkId !== undefined && hotRuntimeServices) {
        const opSeq = assignInlineFastPathOpSeq(params.meta, instanceId, hotRuntimeServices.runSession)
        return yield* provideInlineContext(opSeq, existingLinkId)
      }

      if (canUseHotFastPath && hotRunSessionOpSeqAllocator) {
        const currentTxnId = txnContext.current?.txnId
        const { linkId: _ignoredLinkId, ...restMeta } = (params.meta ?? {}) as any
        const baseMeta: NonNullable<EffectOp.EffectOp['meta']> = {
          ...restMeta,
          moduleId: (params.meta as any)?.moduleId ?? optionsModuleId,
          instanceId: (params.meta as any)?.instanceId ?? instanceId,
          runtimeLabel: (params.meta as any)?.runtimeLabel ?? runtimeLabel,
          txnSeq: (params.meta as any)?.txnSeq ?? txnContext.current?.txnSeq,
          txnId: (params.meta as any)?.txnId ?? currentTxnId,
        }
        const opSeq = hotRunSessionOpSeqAllocator(baseMeta)
        if (opSeq !== undefined) {
          const linkId = existingLinkId ?? makeOperationId(baseMeta.instanceId, opSeq)
          return yield* provideInlineContext(opSeq, linkId)
        }
      }

      const runtimeServices = hotRuntimeServices ?? (yield* resolveOperationRuntimeServices())
      const runtimeContext = hotRuntimeContext ?? captureOperationRuntimeHotContext(runtimeServices)

      if (existingLinkId !== undefined && runtimeContext?.canUseHotFastPath) {
        const opSeq = assignInlineFastPathOpSeq(params.meta, instanceId, runtimeServices.runSession)
        return yield* provideInlineContext(opSeq, existingLinkId)
      }

      const currentTxnId = txnContext.current?.txnId

      // NOTE: linkId is generated/propagated by the Runtime:
      // - Boundary entrypoints create a new linkId.
      // - Nested operations reuse the current FiberRef.linkId.
      // - Never default to randomness/time to avoid non-replayable implicit identifiers.
      const { linkId: _ignoredLinkId, ...restMeta } = (params.meta ?? {}) as any

      const baseMeta: NonNullable<EffectOp.EffectOp['meta']> = {
        ...restMeta,
        // Filled by the runtime.
        moduleId: (params.meta as any)?.moduleId ?? optionsModuleId,
        instanceId: (params.meta as any)?.instanceId ?? instanceId,
        runtimeLabel: (params.meta as any)?.runtimeLabel ?? runtimeLabel,
        txnSeq: (params.meta as any)?.txnSeq ?? txnContext.current?.txnSeq,
        txnId: (params.meta as any)?.txnId ?? currentTxnId,
      }
      const opSeq = runtimeContext?.runSessionOpSeqAllocator
        ? runtimeContext.runSessionOpSeqAllocator(baseMeta)
        : assignOperationOpSeq(baseMeta, runtimeServices.runSession)

      const op = EffectOp.make<A2, E2, R2>({
        kind,
        name,
        payload: params.payload,
        effect: eff,
        meta: baseMeta,
      })

      const linkId = existingLinkId ?? op.id
      const program = runtimeServices.middlewareStack.length ? EffectOp.run(op, runtimeServices.middlewareStack) : op.effect

      // linkId: created at the boundary, reused for nested ops (shared across modules via a FiberRef).
      return yield* Effect.provideService(
        Effect.provideService(program, Debug.currentOpSeq, opSeq),
        EffectOpCore.currentLinkId,
        linkId,
      )
    })

  return runOperation
}
