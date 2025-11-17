import { Context, Deferred } from 'effect'

export interface RootContext {
  context: Context.Context<any> | undefined
  readonly ready: Deferred.Deferred<Context.Context<any>, never>
  readonly appId?: string
  readonly appModuleIds?: ReadonlyArray<string>
}

class RootContextTagImpl extends Context.Tag('@logix/core/RootContext')<RootContextTagImpl, RootContext>() {}

export const RootContextTag = RootContextTagImpl
