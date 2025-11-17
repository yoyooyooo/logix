import { Context, Effect } from 'effect'

export interface RuntimeServiceBuiltins {
  /**
   * Returns the make Effect of a builtin implementation (provided by ModuleRuntime during assembly, avoiding external code
   * capturing internal closures/state).
   * - For kernel implementors only (e.g. core-ng) to implement behavior-equivalent replacements or thin wrappers.
   * - Not an app-facing contract; must not be depended on from business Flow/Logic.
   */
  readonly getBuiltinMake: (serviceId: string) => Effect.Effect<unknown, never, any>
}

export class RuntimeServiceBuiltinsTag extends Context.Tag('@logix/core/RuntimeServiceBuiltins')<
  RuntimeServiceBuiltinsTag,
  RuntimeServiceBuiltins
>() {}
