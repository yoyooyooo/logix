// EffectOp core model and middleware composition logic.
// For higher-level Runtime / Devtools integration, see:
// specs/000-module-traits-runtime/references/effectop-and-middleware.md

import { Context, Effect, FiberRef } from 'effect'

/**
 * currentLinkId：
 * - Stores the current operation chain id (linkId) in a FiberRef.
 * - Used to correlate multiple boundary ops within the same chain (can be shared across modules via the same FiberRef).
 */
export const currentLinkId = FiberRef.unsafeMake<string | undefined>(undefined)

/**
 * OperationPolicy：
 * - Local policy markers (intent only; no rule logic attached).
 *
 * Constraints (enforced by Runtime/middleware together):
 * - Only observation-only capabilities (Observer) may be disabled; global guards must not be disabled.
 */
export interface OperationPolicy {
  readonly disableObservers?: boolean
}

/**
 * OperationRejected：
 * - Unified failure result when a guard rejects execution.
 * - Semantics: explicit failure with no business side effects (rejection must happen before user code executes).
 */
export interface OperationRejected {
  readonly _tag: 'OperationRejected'
  readonly message: string
  readonly kind?: EffectOp['kind']
  readonly name?: string
  readonly linkId?: string
  readonly details?: unknown
}

/**
 * OperationError：
 * - Any boundary operation executed via EffectOp may be explicitly rejected by Guard middleware.
 * - Therefore, the middleware error channel must allow OperationRejected to be added.
 */
export type OperationError<E> = E | OperationRejected

export const makeOperationRejected = (params: {
  readonly message: string
  readonly kind?: EffectOp['kind']
  readonly name?: string
  readonly linkId?: string
  readonly details?: unknown
}): OperationRejected => ({
  _tag: 'OperationRejected',
  message: params.message,
  kind: params.kind,
  name: params.name,
  linkId: params.linkId,
  details: params.details,
})

/**
 * EffectOp: a unified representation of an Effect execution at an "observable boundary".
 *
 * - Out / Err / Env are the generic parameters of the underlying Effect.
 * - meta carries structured context needed by Devtools / Middleware.
 */
export interface EffectOp<Out = unknown, Err = unknown, Env = unknown> {
  readonly id: string
  readonly kind:
    | 'action'
    | 'flow'
    | 'state'
    | 'service'
    | 'lifecycle'
    | 'trait-computed'
    | 'trait-link'
    | 'trait-source'
    | 'devtools'
  readonly name: string
  readonly payload?: unknown
  readonly meta?: {
    /**
     * linkId：
     * - Operation chain id: multiple boundary ops in the same chain must share it.
     * - Runtime ensures this field is populated on all boundary ops.
     */
    linkId?: string
    moduleId?: string
    instanceId?: string
    runtimeLabel?: string
    txnId?: string
    txnSeq?: number
    opSeq?: number
    fieldPath?: string
    deps?: ReadonlyArray<string>
    from?: string
    to?: string
    traitNodeId?: string
    stepId?: string
    resourceId?: string
    key?: unknown
    trace?: ReadonlyArray<string>
    tags?: ReadonlyArray<string>
    policy?: OperationPolicy
    // Reserved extension slot for middleware/devtools to attach extra information.
    readonly [k: string]: unknown
  }
  readonly effect: Effect.Effect<Out, Err, Env>
}

/**
 * Middleware: the general middleware model for observing / wrapping / guarding EffectOps.
 */
export type Middleware = <A, E, R>(op: EffectOp<A, E, R>) => Effect.Effect<A, OperationError<E>, R>

export type MiddlewareStack = ReadonlyArray<Middleware>

/**
 * EffectOpMiddlewareEnv：
 * - A Service in Effect Env that carries the current Runtime's MiddlewareStack.
 * - Injected by Runtime.ts when constructing a ManagedRuntime.
 * - Runtime code (e.g. StateTrait.install) uses this Service to decide which MiddlewareStack to use.
 */
export interface EffectOpMiddlewareEnv {
  readonly stack: MiddlewareStack
}

export class EffectOpMiddlewareTag extends Context.Tag('Logix/EffectOpMiddleware')<
  EffectOpMiddlewareTag,
  EffectOpMiddlewareEnv
>() {}

/**
 * composeMiddleware：
 * - Composes Middleware from "outer to inner" in declaration order:
 *   - stack = [mw1, mw2] => mw1 -> mw2 -> effect -> mw2 -> mw1
 * - Matches the reduceRight example in the reference docs.
 */
export const composeMiddleware = (stack: MiddlewareStack): Middleware => {
  return <A, E, R>(op: EffectOp<A, E, R>): Effect.Effect<A, OperationError<E>, R> =>
    stack.reduceRight<Effect.Effect<A, OperationError<E>, R>>(
      (eff, mw) => mw({ ...op, effect: eff } as any) as any,
      op.effect as Effect.Effect<A, OperationError<E>, R>,
    )
}

/**
 * runWithMiddleware：
 * - Executes a given EffectOp with a MiddlewareStack according to the composition rules.
 * - If the stack is empty, returns op.effect directly.
 */
export const runWithMiddleware = <A, E, R>(op: EffectOp<A, E, R>, stack: MiddlewareStack): Effect.Effect<A, E, R> => {
  return Effect.gen(function* () {
    const existing = yield* FiberRef.get(currentLinkId)
    const metaLinkId = (op.meta as any)?.linkId
    const linkId = typeof metaLinkId === 'string' && metaLinkId.length > 0 ? metaLinkId : (existing ?? op.id)

    const nextOp: EffectOp<A, E, R> = {
      ...op,
      meta: {
        ...(op.meta ?? {}),
        linkId,
      },
    }

    const program = stack.length ? composeMiddleware(stack)(nextOp) : nextOp.effect

    // linkId is created at the boundary root and reused for nested ops (the FiberRef is the global single source of truth).
    // NOTE: middleware may explicitly reject with OperationRejected.
    return yield* Effect.locally(currentLinkId, linkId)(program as any)
  }) as Effect.Effect<A, E, R>
}
