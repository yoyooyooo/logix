import { Effect } from 'effect'
import type * as Logic from './LogicMiddleware.js'
import type { BoundApi, AnyModuleShape } from './module.js'
import type { RuntimeInternals } from './RuntimeInternals.js'

export const registerDeclarationOnlyApi = <Sh extends AnyModuleShape, R>(
  api: string,
  currentPhase: 'setup' | 'run',
  emitDeclarationOnlyViolation: (api: string) => Effect.Effect<void>,
  register: () => void,
): Logic.Of<Sh, R, void, never> => {
  if (currentPhase === 'run') {
    return emitDeclarationOnlyViolation(api) as any
  }
  register()
  return Effect.void as any
}

export const makeReadyAfter = <Sh extends AnyModuleShape, R>(args: {
  readonly getPhase: () => 'setup' | 'run'
  readonly runtimeInternals: RuntimeInternals
  readonly emitDeclarationOnlyViolation: (api: string) => Effect.Effect<void>
}): BoundApi<Sh, R>['readyAfter'] => {
  return (eff, options) =>
    registerDeclarationOnlyApi<Sh, R>(
      '$.readyAfter',
      args.getPhase(),
      args.emitDeclarationOnlyViolation,
      () => {
        args.runtimeInternals.lifecycle.registerInitRequired(
          eff as any,
          options?.id ? { name: options.id } : undefined,
        )
      },
    )
}
