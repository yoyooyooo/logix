import { Context } from "effect"

export interface RootContext {
  readonly context: Context.Context<any>
}

class RootContextTagImpl extends Context.Tag(
  "@logix/core/RootContext",
)<RootContextTagImpl, RootContext>() {}

export const RootContextTag = RootContextTagImpl
