import { Context, Deferred, Effect } from 'effect'

export type RootContextLifecycleState = 'uninitialized' | 'merged' | 'ready' | 'failed'

export type RootContextLifecycleReasonCode =
  | 'root_context::merge_duplicate'
  | 'root_context::ready_without_merge'
  | 'root_context::ready_after_failed'
  | 'root_context::ready_duplicate'

export interface RootContextLifecycle {
  readonly state: RootContextLifecycleState
  readonly reasonCode?: RootContextLifecycleReasonCode
}

export class RootContextLifecycleError extends Error {
  readonly _tag = 'RootContextLifecycleError'

  constructor(
    readonly reasonCode: RootContextLifecycleReasonCode,
    readonly fromState: RootContextLifecycleState,
    message: string,
  ) {
    super(message)
    this.name = 'RootContextLifecycleError'
  }
}

export interface RootContext {
  context: Context.Context<any> | undefined
  readonly ready: Deferred.Deferred<Context.Context<any>, never>
  lifecycle: RootContextLifecycle
  readonly appId?: string
  readonly appModuleIds?: ReadonlyArray<string>
}

class RootContextTagImpl extends Context.Tag('@logixjs/core/RootContext')<RootContextTagImpl, RootContext>() {}

export const RootContextTag = RootContextTagImpl

const failRootContextTransition = (
  root: RootContext,
  reasonCode: RootContextLifecycleReasonCode,
  message: string,
): RootContextLifecycleError => {
  const fromState = root.lifecycle.state
  root.lifecycle = { state: 'failed', reasonCode }
  return new RootContextLifecycleError(reasonCode, fromState, message)
}

export const makeRootContext = (args?: {
  readonly appId?: string
  readonly appModuleIds?: ReadonlyArray<string>
}): Effect.Effect<RootContext, never, never> =>
  Effect.gen(function* () {
    const ready = yield* Deferred.make<Context.Context<any>>()
    return {
      context: undefined,
      ready,
      lifecycle: { state: 'uninitialized' },
      appId: args?.appId,
      appModuleIds: args?.appModuleIds,
    } satisfies RootContext
  })

export const mergeRootContext = (
  root: RootContext,
  context: Context.Context<any>,
): Effect.Effect<RootContext, RootContextLifecycleError, never> =>
  Effect.gen(function* () {
    if (root.context !== undefined || root.lifecycle.state !== 'uninitialized') {
      return yield* Effect.fail(
        failRootContextTransition(
          root,
          'root_context::merge_duplicate',
          '[Logix] RootContext merge duplicated during app assembly.',
        ),
      )
    }

    root.context = context
    root.lifecycle = { state: 'merged' }
    return root
  })

export const readyRootContext = (root: RootContext): Effect.Effect<void, RootContextLifecycleError, never> =>
  Effect.gen(function* () {
    if (root.lifecycle.state === 'failed') {
      return yield* Effect.fail(
        failRootContextTransition(
          root,
          'root_context::ready_after_failed',
          '[Logix] RootContext ready attempted after lifecycle entered failed state.',
        ),
      )
    }

    if (root.context === undefined || root.lifecycle.state === 'uninitialized') {
      return yield* Effect.fail(
        failRootContextTransition(
          root,
          'root_context::ready_without_merge',
          '[Logix] RootContext ready attempted before merge during app assembly.',
        ),
      )
    }

    const readySucceeded = yield* Deferred.succeed(root.ready, root.context)
    if (!readySucceeded || root.lifecycle.state === 'ready') {
      return yield* Effect.fail(
        failRootContextTransition(
          root,
          'root_context::ready_duplicate',
          '[Logix] RootContext ready was already completed before app assembly finished.',
        ),
      )
    }

    root.lifecycle = { state: 'ready' }
  })
