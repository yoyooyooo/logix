import { Context, Deferred, Effect, Layer } from 'effect'
import { isDevEnv } from './runtime/core/env.js'
import { RootContextTag, type RootContext } from './runtime/core/RootContext.js'
import * as ServiceId from './serviceId.js'

export type RootResolveEntrypoint = 'logic.root.resolve' | 'logic.$.root.resolve'

export interface RootResolveOptions {
  readonly entrypoint?: RootResolveEntrypoint
  /**
   * Whether to wait when RootContext is not ready yet:
   * - Default false: avoid misuse during layer/setup which can deadlock.
   * - `$.root.resolve` passes true in the run phase (run-only), allowing Env assembly to complete.
   */
  readonly waitForReady?: boolean
}

const tagIdOf = (tag: Context.Tag<any, any>): string =>
  ServiceId.fromTag(tag) ?? '<unknown tag>'

const makeMissingRootProviderError = (
  tag: Context.Tag<any, any>,
  entrypoint: RootResolveEntrypoint,
  extra?: string,
): Error => {
  const dev = isDevEnv()
  const tokenId = tagIdOf(tag)
  const fix: string[] = dev
    ? [
        '- Provide it when creating the runtime tree (Logix.Runtime.make(...,{ layer }) / ManagedRuntime.make(Layer.mergeAll(...))).',
        "- If you're in React and want the current runtime environment singleton, use useModule(ModuleTag).",
        '- Do not rely on nested RuntimeProvider.layer to mock Root.resolve.',
      ]
    : []

  const message = dev
    ? [
        '[MissingRootProviderError] Cannot resolve Tag from root provider.',
        extra ? `\n${extra}` : '',
        `tokenId: ${tokenId}`,
        `entrypoint: ${entrypoint}`,
        'mode: global',
        'startScope: root',
        '',
        'fix:',
        ...fix,
      ]
        .filter((s) => s.length > 0)
        .join('\n')
    : '[MissingRootProviderError] tag not found in root provider'

  const err = new Error(message)
  err.name = 'MissingRootProviderError'
  ;(err as any).tokenId = tokenId
  ;(err as any).entrypoint = entrypoint
  ;(err as any).mode = 'global'
  ;(err as any).startScope = { kind: 'root' }
  ;(err as any).fix = fix
  return err
}

/**
 * resolve
 *
 * Resolve a Tag explicitly from the root provider of the current Runtime tree (ServiceTag / ModuleTag).
 *
 * Semantics:
 * - Always reads rootContext; unaffected by nearer-scope Layer/Context overrides.
 * - For ModuleTag: expresses root singleton semantics only (not used for multi-instance selection).
 */
export const resolve = <Id, Svc>(
  tag: Context.Tag<Id, Svc>,
  options?: RootResolveOptions,
): Effect.Effect<Svc, never, any> =>
  Effect.gen(function* () {
    const entrypoint: RootResolveEntrypoint = options?.entrypoint ?? 'logic.root.resolve'

    const root = yield* RootContextTag

    const rootContext = root.context ?? (options?.waitForReady ? yield* root.ready : undefined)

    if (!rootContext) {
      return yield* Effect.die(
        makeMissingRootProviderError(tag as Context.Tag<any, any>, entrypoint, 'reason: rootContextNotReady'),
      )
    }

    try {
      return Context.get(rootContext, tag as Context.Tag<any, any>) as Svc
    } catch {
      return yield* Effect.die(makeMissingRootProviderError(tag as Context.Tag<any, any>, entrypoint))
    }
  })

/**
 * layerFromContext（tests/perf only）
 *
 * Provide a "ready immediately" RootContext for Root.resolve.
 * - `ready` is fulfilled immediately to avoid extra waits when waitForReady=true.
 */
export const layerFromContext = (context: Context.Context<any>): Layer.Layer<any, never, any> =>
  Layer.scoped(
    RootContextTag,
    Effect.gen(function* () {
      const ready = yield* Deferred.make<Context.Context<any>>()
      yield* Deferred.succeed(ready, context)
      const root: RootContext = { context, ready }
      return root
    }),
  )
