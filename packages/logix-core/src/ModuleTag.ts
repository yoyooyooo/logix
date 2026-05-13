import { Effect, Layer, Schema } from 'effect'
import * as Logic from './Logic.js'
import * as Action from './internal/action.js'
import * as ModuleFactory from './internal/runtime/ModuleFactory.js'
import type { FieldPath } from './internal/field-path.js'
import { mutateWithoutPatches, mutateWithPatchPaths } from './internal/runtime/core/mutativePatches.js'
import { getBoundInternals, setModuleFieldsProgram } from './internal/runtime/core/runtimeInternalsAccessor.js'
import * as Debug from './internal/runtime/core/DebugSink.js'
import * as LogicUnitMeta from './internal/runtime/core/LogicUnitMeta.js'
import type {
  ActionsFromMap,
  AnyModuleShape,
  AnySchema,
  BoundApi,
  ActionOf,
  ModuleLogic,
  ModuleShape,
  ModuleRuntime,
  ModuleTag,
  ModuleHandle,
  ModuleHandleUnion,
  StateChangeWithMeta,
  StateCommitMeta,
  StateCommitMode,
  StateCommitPriority,
  ReducersFromMap,
  StateOf,
} from './internal/module.js'
import { ensureModuleFieldsFinalizePath } from './internal/runtime/core/moduleFieldsExpertPath.js'

type NoInfer_<T> = [T][T extends any ? 0 : never]

/**
 * Public exports for core type definitions such as ModuleTag / ModuleRuntime and assembly-related handles.
 *
 * Kept aligned with `docs/ssot/runtime/logix-core/api/02-module-and-logic-api.md`.
 * Concrete type definitions live in internal/module.ts; this module wires the factory implementation.
 */
export type {
  AnySchema,
  AnyModuleShape,
  ModuleShape,
  ModuleLogic,
  ModuleRuntime,
  ModuleRuntimeOfShape,
  ModuleTag,
  ModuleHandle,
  ModuleHandleUnion,
  StateOf,
  ActionsFromMap,
  ReducersFromMap,
  BoundApi,
  ActionOf,
  LogicEffect,
  DispatchEffect,
  ActionForTag,
  BoundApiRootApi,
  BoundApiStateApi,
  BoundApiDispatchersApi,
  BoundApiDispatchApi,
  BoundApiReadyAfterApi,
  BoundApiUseApi,
  BoundApiReducerApi,
  StateCommitMode,
  StateCommitPriority,
  StateCommitMeta,
  StateChangeWithMeta,
} from './internal/module.js'

/**
 * Reducer helper:
 * - `Reducer.mutate` provides the same mutative style as `$.state.mutate`.
 * - Internally uses mutative-based immutable updates to map "in-place draft mutation" into a pure `(state, action) => state`.
 *
 * @example
 *
 *   const Counter = ModuleTag.make("Counter", {
 *     state: CounterState,
 *     actions: CounterActions,
 *     reducers: {
 *       inc: ModuleTag.Reducer.mutate((draft, _payload) => {
 *         draft.count += 1
 *       }),
 *     },
 *   })
 *
 *   yield* $.reducer(
 *     "setValue",
 *     ModuleTag.Reducer.mutate((draft, payload) => {
 *       draft.value = payload
 *     }),
 *   )
 */
export const Reducer = {
  mutate:
    <S, A extends { readonly payload?: any }>(
      mutator: (draft: Logic.Draft<S>, payload: A['payload']) => void,
    ): ((state: S, action: A, sink?: (path: string | FieldPath) => void) => S) =>
    (state, action, sink) => {
      const payload = (action as any)?.payload as A['payload']
      if (!sink) {
        return mutateWithoutPatches(state as S, (draft) => {
          mutator(draft as Logic.Draft<S>, payload)
        })
      }

      const { nextState, patchPaths } = mutateWithPatchPaths(state as S, (draft) => {
        mutator(draft as Logic.Draft<S>, payload)
      })

      for (const path of patchPaths) {
        sink(path)
      }

      return nextState
    },

  mutateMap: <
    R extends Readonly<
      Record<string, ((state: any, action: any, sink?: (path: string | FieldPath) => void) => any) | undefined>
    >,
  >(mutators: {
    readonly [K in keyof NoInfer_<R>]?: (
      draft: Logic.Draft<Parameters<NonNullable<NoInfer_<R>[K]>>[0]>,
      payload: Parameters<NonNullable<NoInfer_<R>[K]>>[1] extends { readonly payload: infer P }
        ? P
        : Parameters<NonNullable<NoInfer_<R>[K]>>[1] extends { readonly payload?: infer P }
          ? P | undefined
          : never,
    ) => void
  }): R => {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(mutators)) {
      const mutator = (mutators as any)[key]
      if (typeof mutator !== 'function') continue
      out[key] = Reducer.mutate(mutator as any)
    }
    return out as any
  },
}

/**
 * A simplified Shape definition helper, designed for Action Maps.
 * @example type MyShape = Shape<typeof MyState, typeof MyActionMap>
 */
export type ActionTokenMap<ADefs extends Action.ActionDefs> = Action.NormalizedActionTokens<ADefs>

export type ActionUnionOf<ADefs extends Action.ActionDefs> = ActionsFromMap<ActionTokenMap<ADefs>>

export type ActionSchemaOf<ADefs extends Action.ActionDefs> = Schema.Schema<ActionUnionOf<ADefs>>

export type Shape<SSchema extends AnySchema, ADefs extends Action.ActionDefs> = ModuleShape<
  SSchema,
  ActionSchemaOf<ADefs>,
  ActionTokenMap<ADefs>
>

export type ShapeFromActionTokenMap<
  SSchema extends AnySchema,
  AMap extends Record<string, Action.AnyActionToken>,
> = ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>

const makeImpl = <Id extends string, SSchema extends AnySchema, AMap extends Record<string, Action.AnyActionToken>>(
  id: Id,
  def: {
    readonly state: SSchema
    readonly actions: AMap
    readonly reducers?: ReducersFromMap<SSchema, AMap>
  },
): ModuleTag<Id, ShapeFromActionTokenMap<SSchema, AMap>> =>
  ModuleFactory.Module(id, def) as ModuleTag<Id, ShapeFromActionTokenMap<SSchema, AMap>>

/**
 * ModuleTag.make：
 * - Defines a domain module Tag using the given id and state/actions/reducers.
 * - The returned ModuleTag is both a Context.Tag and a factory carrying its Shape.
 *
 * Note: since 022, the old `Module` (Tag identity) was renamed to `ModuleTag`; use `Logix.Module` for module definition objects.
 */
export const make = <Id extends string, SSchema extends AnySchema, ADefs extends Action.ActionDefs>(
  id: Id,
  def: {
    readonly state: SSchema
    readonly actions: ADefs
    readonly reducers?: ReducersFromMap<SSchema, ADefs>
  },
): ModuleTag<Id, Shape<SSchema, ADefs>> => {
  const actions = Action.normalizeActions(def.actions)
  const moduleTag: ModuleTag<Id, Shape<SSchema, ADefs>> = makeImpl(id, {
    state: def.state,
    actions,
    reducers: def.reducers as any,
  })

  type Sh = Shape<SSchema, ADefs>

  const stateSchema = def.state as Schema.Schema<any>
  ensureModuleFieldsFinalizePath({
    id,
    moduleTag: moduleTag as any,
    stateSchema,
  })

  return moduleTag
}
