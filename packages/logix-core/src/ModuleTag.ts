import { Effect, FiberRef, Layer, Schema } from 'effect'
import * as Logic from './Logic.js'
import * as Action from './internal/action.js'
import * as ModuleFactory from './internal/runtime/ModuleFactory.js'
import type { FieldPath } from './internal/field-path.js'
import { mutateWithoutPatches, mutateWithPatchPaths } from './internal/runtime/core/mutativePatches.js'
import { getBoundInternals, setModuleTraitsProgram } from './internal/runtime/core/runtimeInternalsAccessor.js'
import * as Debug from './internal/runtime/core/DebugSink.js'
import * as LogicUnitMeta from './internal/runtime/core/LogicUnitMeta.js'
import type {
  ActionsFromMap,
  AnyModuleShape,
  AnySchema,
  BoundApi,
  ActionOf,
  ModuleImpl,
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
import * as StateTrait from './StateTrait.js'
import type { StateTraitProgram } from './StateTrait.js'
import * as ModuleTraitsRegistry from './internal/debug/ModuleTraitsRegistry.js'
import * as ModuleTraits from './internal/runtime/core/ModuleTraits.js'

type NoInfer_<T> = [T][T extends any ? 0 : never]

/**
 * Public exports for core type definitions such as ModuleTag / ModuleRuntime / ModuleImpl.
 *
 * Kept aligned with `.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md`.
 * Concrete type definitions live in internal/module.ts; this module wires the factory implementation.
 */
export type {
  AnySchema,
  AnyModuleShape,
  ModuleShape,
  ModuleLogic,
  ModuleImpl,
  ModuleRuntime,
  ModuleTag,
  ModuleHandle,
  ModuleHandleUnion,
  StateOf,
  ActionsFromMap,
  ReducersFromMap,
  BoundApi,
  ActionOf,
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
 *   const Counter = Logix.ModuleTag.make("Counter", {
 *     state: CounterState,
 *     actions: CounterActions,
 *     reducers: {
 *       inc: Logix.ModuleTag.Reducer.mutate((draft, _payload) => {
 *         draft.count += 1
 *       }),
 *     },
 *   })
 *
 *   yield* $.reducer(
 *     "setValue",
 *     Logix.ModuleTag.Reducer.mutate((draft, payload) => {
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
export type Shape<S extends AnySchema, M extends Record<string, AnySchema>> = ModuleShape<
  S,
  Schema.Schema<ActionsFromMap<Action.NormalizedActionTokens<M & Action.ActionDefs>>>,
  Action.NormalizedActionTokens<M & Action.ActionDefs>
>

const makeImpl = <Id extends string, SSchema extends AnySchema, AMap extends Record<string, Action.AnyActionToken>>(
  id: Id,
  def: {
    readonly state: SSchema
    readonly actions: AMap
    readonly reducers?: ReducersFromMap<SSchema, AMap>
  },
): ModuleTag<Id, ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>> =>
  ModuleFactory.Module(id, def) as ModuleTag<Id, ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>>

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
    /**
     * traits：
     * - Used to attach a StateTraitSpec (see specs/000-module-traits-runtime).
     * - The current implementation builds a Program during ModuleTag.make, and injects a setup-only Logic in `ModuleTag.implement`
     *   to call `StateTrait.install`.
     *   (Note: if you use `ModuleTag.live` to export a Layer and want trait behavior, call `StateTrait.install` explicitly in logics,
     *   or use `ModuleTag.implement` instead.)
     */
    readonly traits?: unknown
  },
): ModuleTag<
  Id,
  ModuleShape<
    SSchema,
    Schema.Schema<ActionsFromMap<Action.NormalizedActionTokens<ADefs>>>,
    Action.NormalizedActionTokens<ADefs>
  >
> => {
  const actions = Action.normalizeActions(def.actions)
  const moduleTag = makeImpl(id, {
    state: def.state,
    actions,
    reducers: def.reducers as any,
  })

  type Sh = ModuleShape<
    SSchema,
    Schema.Schema<ActionsFromMap<Action.NormalizedActionTokens<ADefs>>>,
    Action.NormalizedActionTokens<ADefs>
  >

  const stateSchema = def.state as Schema.Schema<any, any>
  const moduleTraitsSpec = def.traits as StateTrait.StateTraitSpec<any> | undefined
  const baseProgram: StateTraitProgram<any> | undefined = moduleTraitsSpec
    ? StateTrait.build(stateSchema as any, moduleTraitsSpec as any)
    : undefined

  if (baseProgram) {
    // For TraitLifecycle/Debug/Devtools reads (definition-side hidden slot).
    setModuleTraitsProgram(moduleTag as any, baseProgram)
    ModuleTraitsRegistry.registerModuleProgram(id, baseProgram as StateTraitProgram<any>)
  }

  // 023: consolidate the trait "declaration/merge entry points" into the setup phase:
  // - module-level traits register as contributions first;
  // - logic-level declares via $.traits.declare;
  // - finally, finalize → freeze → build/install in one shot.

  const makeModuleTraitsContributionLogic = (traits: unknown): ModuleLogic<Sh, never, never> => {
    const logic = moduleTag.logic(($) => ({
      setup: Effect.sync(() => {
        if (!traits || typeof traits !== 'object') return
        // module-level provenance uses moduleId as the stable anchor
        // (aligned with 023 data-model: originType=module, originId=moduleId).
        // Note: traitsSpec still reuses StateTraitSpec; do not introduce a second IR.
        const internals = getBoundInternals($ as any)
        internals.traits.registerModuleTraitsContribution({
          traits,
          provenance: {
            originType: 'module',
            originId: id,
            originIdKind: 'explicit',
            originLabel: `module:${id}`,
          },
        })
      }),
      run: Effect.void,
    })) as ModuleLogic<Sh, never, never>

    LogicUnitMeta.attachLogicUnitMeta(logic as any, {
      id: '__logix_internal:traits:module_contrib',
      kind: 'internal',
      name: 'traits:module_contrib',
      moduleId: id,
    })
    return logic
  }

  const makeFinalizeTraitsLogic = (): ModuleLogic<Sh, never, never> => {
    const logic = moduleTag.logic(($) => ({
      setup: Effect.gen(function* () {
        const internals = getBoundInternals($ as any)
        const diagnosticsLevel = yield* FiberRef.get(Debug.currentDiagnosticsLevel)

        const contributions = internals.traits.getModuleTraitsContributions()
        let merged: ModuleTraits.TraitSpec
        let snapshot: ModuleTraits.ModuleTraitsSnapshot

        try {
          ;({ merged, snapshot } = ModuleTraits.finalizeTraitContributions({
            moduleId: id,
            contributions,
          }))
        } catch (cause) {
          if (
            diagnosticsLevel !== 'off' &&
            cause &&
            typeof cause === 'object' &&
            (cause as any)._tag === 'ModuleTraitsConflictError'
          ) {
            const conflicts = Array.isArray((cause as any).conflicts)
              ? ((cause as any).conflicts as ReadonlyArray<unknown>)
              : []
            const traitIds = conflicts
              .map((c: any) => (c && typeof c === 'object' ? (c as any).traitId : undefined))
              .filter((t): t is string => typeof t === 'string' && t.length > 0)
              .slice(0, 20)

            const data =
              diagnosticsLevel === 'full'
                ? {
                    conflictCount: conflicts.length,
                    conflicts,
                  }
                : {
                    conflictCount: conflicts.length,
                    traitIds,
                  }

            yield* Debug.record({
              type: 'trace:module:traits:conflict',
              moduleId: id,
              instanceId: internals.instanceId,
              data,
            } as any)
          }

          throw cause
        }

        internals.traits.setModuleTraitsSnapshot(snapshot)
        internals.traits.freezeModuleTraits()

        if (diagnosticsLevel !== 'off') {
          const data =
            diagnosticsLevel === 'full'
              ? {
                  digest: snapshot.digest,
                  count: snapshot.traits.length,
                  traits: snapshot.traits,
                  provenanceIndex: snapshot.provenanceIndex,
                }
              : {
                  digest: snapshot.digest,
                  count: snapshot.traits.length,
                }

          yield* Debug.record({
            type: 'trace:module:traits',
            moduleId: id,
            instanceId: internals.instanceId,
            data,
          } as any)
        }

        if (Object.keys(merged).length === 0) {
          return
        }

        const onlyModuleLevel = contributions.length === 1 && contributions[0]?.provenance?.originType === 'module'

        // Build a one-shot Program from the final merged Spec, and install it during initialization.
        // - If there is only a module-level contribution, reuse the program built in ModuleTag.make (useful for Debug/TraitLifecycle).
        const program =
          onlyModuleLevel && baseProgram ? baseProgram : StateTrait.build(stateSchema as any, merged as any)

        // For TraitLifecycle/Debug/Devtools reads (definition-side hidden slot).
        setModuleTraitsProgram(moduleTag as any, program)
        ModuleTraitsRegistry.registerModuleProgram(id, program as StateTraitProgram<any>)

        yield* StateTrait.install($ as unknown as BoundApi<any, any>, program)
      }),
      run: Effect.void,
    })) as ModuleLogic<Sh, never, never>

    LogicUnitMeta.attachLogicUnitMeta(logic as any, {
      id: '__logix_internal:traits:finalize',
      kind: 'internal',
      name: 'traits:finalize',
      moduleId: id,
    })

    return logic
  }

  // Wrap implement: inject (1) optional module-level contribution logic, and (2) required finalize+install logic.
  const originalImplement = moduleTag.implement
  ;(moduleTag as any).implement = (<R = never>(config: {
    initial: StateOf<typeof moduleTag.shape>
    logics?: Array<ModuleLogic<typeof moduleTag.shape, R, any>>
    imports?: ReadonlyArray<Layer.Layer<any, any, any> | ModuleImpl<any, AnyModuleShape, any>>
    processes?: ReadonlyArray<Effect.Effect<void, any, any>>
  }) => {
    const userLogics = (config.logics ?? []) as Array<ModuleLogic<typeof moduleTag.shape, R, any>>

    const moduleLevel = def.traits ? [makeModuleTraitsContributionLogic(def.traits) as any] : []

    const finalize = makeFinalizeTraitsLogic() as ModuleLogic<typeof moduleTag.shape, R, any>

    const mergedLogics = [...moduleLevel, ...userLogics, finalize]

    return originalImplement<R>({
      ...config,
      logics: mergedLogics,
    })
  }) as typeof moduleTag.implement

  return moduleTag
}
