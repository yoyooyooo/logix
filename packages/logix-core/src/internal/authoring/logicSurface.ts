import { Effect } from 'effect'
import type { AnyModuleShape, ModuleLogic } from '../module.js'
import * as LogicPlanMarker from '../runtime/core/LogicPlanMarker.js'

export interface PublicLogicSource {
  readonly file: string
  readonly line: number
  readonly column: number
}

export interface PublicLogicOptions {
  readonly kind?: string
  readonly name?: string
  readonly source?: PublicLogicSource
}

export class PublicLogicAuthoringShapeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PublicLogicAuthoringShapeError'
  }
}

const isLegacySetupRunShape = (value: unknown): value is { readonly setup: unknown; readonly run: unknown } =>
  Boolean(value) && typeof value === 'object' && 'setup' in (value as object) && 'run' in (value as object)

export const validatePublicLogicReturn = (value: unknown): void => {
  if (LogicPlanMarker.isLogicPlanEffect(value)) {
    throw new PublicLogicAuthoringShapeError(
      '[Module.logic] public LogicPlanEffect return is removed; keep declaration at the builder root and return the run effect directly',
    )
  }

  if (isLegacySetupRunShape(value)) {
    throw new PublicLogicAuthoringShapeError(
      '[Module.logic] legacy { setup, run } public shape is removed; keep declaration at the builder root and return the run effect directly',
    )
  }
}

type LogicSurfaceModule = {
  readonly id: string
  readonly tag: {
    readonly logic: (
      id: string,
      build: (api: unknown) => ModuleLogic<any, any, any>,
      options?: PublicLogicOptions,
    ) => ModuleLogic<any, any, any>
  }
}

export const bindLogicSurface = <Sh extends AnyModuleShape, R = never, E = unknown>(
  selfModule: LogicSurfaceModule,
  id: string,
  build: (api: any) => ModuleLogic<Sh, R, E>,
  options?: PublicLogicOptions,
): ModuleLogic<Sh, R, E> => {
  // Public logic authoring stays on one builder surface:
  // do synchronous declaration work at the builder root, then return the run effect.
  return selfModule.tag.logic(id, (api) => {
    const withSelf = Object.create(api as object)
    ;(withSelf as any).self = Effect.suspend(() => (api as any).use(selfModule as any))
    const built = build(withSelf)
    validatePublicLogicReturn(built)
    return built
  }, options) as ModuleLogic<Sh, R, E>
}
