// Internal EffectOp API (for internal implementation code).
//
// Goal:
// - Internal modules must never import root public submodules (e.g. `../EffectOp`).
// - This file hosts the shared implementation; public `src/EffectOp.ts` delegates to it.

import { Effect, Option } from 'effect'
import * as Core from './runtime/core/EffectOpCore.js'
import { RunSessionTag } from './observability/runSession.js'

export type EffectOp<Out = unknown, Err = unknown, Env = unknown> = Core.EffectOp<Out, Err, Env>

export type OperationPolicy = Core.OperationPolicy

export type OperationRejected = Core.OperationRejected

export type OperationError<E> = Core.OperationError<E>

export type Middleware = Core.Middleware

export type MiddlewareStack = Core.MiddlewareStack

export const composeMiddleware = Core.composeMiddleware

export const makeOperationRejected = Core.makeOperationRejected

/**
 * Generate a stable id for identifying an EffectOp.
 * - Uses a monotonic sequence by default to avoid non-replayability from randomness/time.
 * - If meta.instanceId is available, prefer deriving `${instanceId}::o${opSeq}`.
 */
let nextGlobalOpSeq = 0

const nextOpSeq = (): number => {
  nextGlobalOpSeq += 1
  return nextGlobalOpSeq
}

const makeId = (instanceId: string | undefined, opSeq: number): string =>
  instanceId ? `${instanceId}::o${opSeq}` : `o${opSeq}`

/**
 * EffectOp.make：
 * - Create an EffectOp with basic meta.
 * - Generates a stable id by default (based on `instanceId` + monotonic `opSeq`); callers may override externally.
 */
export const make = <A, E, R>(params: {
  readonly kind: EffectOp['kind']
  readonly name: string
  readonly effect: Effect.Effect<A, E, R>
  readonly payload?: unknown
  readonly meta?: EffectOp['meta']
  readonly id?: string
}): EffectOp<A, E, R> => ({
  ...(params.id
    ? { id: params.id, meta: params.meta }
    : (() => {
        const meta: any = params.meta ?? {}
        const instanceId: string | undefined = meta.instanceId
        const opSeq: number =
          typeof meta.opSeq === 'number' && Number.isFinite(meta.opSeq) ? Math.floor(meta.opSeq) : nextOpSeq()
        return {
          id: makeId(instanceId, opSeq),
          meta: meta.opSeq === opSeq ? meta : { ...meta, opSeq },
        }
      })()),
  kind: params.kind,
  name: params.name,
  payload: params.payload,
  effect: params.effect,
})

/**
 * EffectOp.makeInRunSession：
 * - Allocate a stable `opSeq` within a RunSession scope (per-session + per-instance).
 * - If RunSession is missing from Env, fall back to a process-wide monotonic sequence (no process-wide Map).
 */
export const makeInRunSession = <A, E, R>(params: {
  readonly kind: EffectOp['kind']
  readonly name: string
  readonly effect: Effect.Effect<A, E, R>
  readonly payload?: unknown
  readonly meta?: EffectOp['meta']
  readonly id?: string
}): Effect.Effect<EffectOp<A, E, R>, never, any> =>
  Effect.gen(function* () {
    if (params.id) {
      return {
        id: params.id,
        kind: params.kind,
        name: params.name,
        payload: params.payload,
        meta: params.meta,
        effect: params.effect,
      } satisfies EffectOp<A, E, R>
    }

    const meta: any = params.meta ?? {}
    const instanceId: string | undefined = meta.instanceId

    let opSeq: number
    if (typeof meta.opSeq === 'number' && Number.isFinite(meta.opSeq)) {
      opSeq = Math.floor(meta.opSeq)
    } else {
      const sessionOpt = yield* Effect.serviceOption(RunSessionTag)
      if (Option.isSome(sessionOpt)) {
        const key = instanceId ?? 'global'
        opSeq = sessionOpt.value.local.nextSeq('opSeq', key)
      } else {
        opSeq = nextOpSeq()
      }
    }

    return {
      id: makeId(instanceId, opSeq),
      kind: params.kind,
      name: params.name,
      payload: params.payload,
      meta: meta.opSeq === opSeq ? meta : { ...meta, opSeq },
      effect: params.effect,
    } satisfies EffectOp<A, E, R>
  })

/**
 * EffectOp.withMeta：
 * - Append or override meta fields on an existing EffectOp.
 * - Does not change the effect itself.
 */
export const withMeta = <A, E, R>(
  op: EffectOp<A, E, R>,
  meta: Partial<NonNullable<EffectOp['meta']>>,
): EffectOp<A, E, R> => ({
  ...op,
  meta: { ...(op.meta ?? {}), ...meta },
})

/**
 * EffectOp.run：
 * - Execute an EffectOp using the given MiddlewareStack.
 * - If the stack is empty, return op.effect directly.
 */
export const run = <A, E, R>(op: EffectOp<A, E, R>, stack: MiddlewareStack): Effect.Effect<A, E, R> =>
  Core.runWithMiddleware(op, stack)
