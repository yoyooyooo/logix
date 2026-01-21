// StateTrait namespace module (@logixjs/core/StateTrait):
// - Provides a DSL for trait specs (from/node/list/computed/source/link).
// - build: normalizes the spec and produces Program/Graph/Plan.
// - install: installs a Program into the runtime (registers source.refresh, runs converge/validate in txn windows).

import type { Schema } from 'effect'
import { Effect } from 'effect'
import type { BoundApi } from './Bound.js'
import type { ExternalStore as ExternalStoreType } from './ExternalStore.js'
import * as Model from './internal/state-trait/model.js'
import type { TraitMeta as TraitMetaInternal } from './internal/state-trait/meta.js'
import * as FieldPath from './internal/state-trait/field-path.js'
import * as RowId from './internal/state-trait/rowid.js'
import * as InternalBuild from './internal/state-trait/build.js'
import * as InternalInstall from './internal/state-trait/install.js'
import * as InternalIr from './internal/state-trait/ir.js'

// Public type aliases.
export type StateTraitSpec<S> = Model.StateTraitSpec<S>
export type StateTraitEntry<S = unknown, P extends string = string> = Model.StateTraitEntry<S, P>
export type StateTraitProgram<S> = Model.StateTraitProgram<S>
export type StateTraitGraph = Model.StateTraitGraph
export type StateTraitPlan = Model.StateTraitPlan
export type StateTraitNode<Input = unknown, Ctx = unknown> = Model.StateTraitNode<Input, Ctx>
export type StateTraitList<Item = unknown> = Model.StateTraitList<Item>
export type CheckRule<Input = unknown, Ctx = unknown> = Model.CheckRule<Input, Ctx>
export type TraitMeta = TraitMetaInternal

export type StateFieldPath<S> = FieldPath.StateFieldPath<S>
export type StateAtPath<S, P> = FieldPath.StateAtPath<S, P>

export const $root = '$root' as const

type DepsArgs<S extends object, Deps extends ReadonlyArray<StateFieldPath<S>>> = {
  readonly [K in keyof Deps]: StateAtPath<S, Deps[K]>
}

/**
 * StateTrait.from:
 * - Narrows available field paths based on the state Schema, adding type constraints to trait specs.
 * - At runtime this returns the raw spec object; normalization is handled by internal layers.
 */
export const from =
  <S extends object, I>(_schema: Schema.Schema<S, I>) =>
  (spec: StateTraitSpec<S>): StateTraitSpec<S> =>
    spec

export const node = <Input = unknown, Ctx = unknown>(
  spec: Omit<Model.StateTraitNode<Input, Ctx>, '_tag'>,
): Model.StateTraitNode<Input, Ctx> => ({
  _tag: 'StateTraitNode',
  ...spec,
})

export const list = <Item = unknown>(spec: Omit<Model.StateTraitList<Item>, '_tag'>): Model.StateTraitList<Item> => ({
  _tag: 'StateTraitList',
  ...spec,
})

/**
 * StateTrait.computed:
 * - Declares computed semantics for a field.
 * - Uses explicit deps as the single source of truth for dependencies (diagnostics / reverse-closure / incremental sched).
 */
export const computed = <
  S extends object,
  P extends StateFieldPath<S>,
  const Deps extends ReadonlyArray<StateFieldPath<S>>,
>(input: {
  readonly deps: Deps
  readonly get: (...depsValues: DepsArgs<S, Deps>) => StateAtPath<S, P>
  readonly equals?: (prev: StateAtPath<S, P>, next: StateAtPath<S, P>) => boolean
  /**
   * 043: explicit converge time-slicing scheduling.
   * - unset: immediate (default behavior unchanged)
   * - deferred: can be postponed and merged into later windows (requires runtime time-slicing enabled)
   */
  readonly scheduling?: Model.TraitConvergeScheduling
}): StateTraitEntry<S, P> => {
  const derive = (state: Readonly<S>): StateAtPath<S, P> => {
    const args = (input.deps as ReadonlyArray<string>).map((dep) => RowId.getAtPath(state as any, dep))
    return (input.get as any)(...args)
  }
  return {
    fieldPath: undefined as unknown as P,
    kind: 'computed',
    meta: {
      deps: input.deps,
      derive,
      equals: input.equals,
      ...(input.scheduling ? { scheduling: input.scheduling } : {}),
    },
  } as StateTraitEntry<S, P>
}

/**
 * StateTrait.source:
 * - Declares an external resource source for a field (Resource / Query integration is implemented in later phases).
 * - The kernel owns keyHash gating / concurrency / ReplayMode behavior.
 */
export const source = <
  S extends object,
  P extends StateFieldPath<S>,
  const Deps extends ReadonlyArray<StateFieldPath<S>>,
>(input: {
  readonly resource: string
  readonly deps: Deps
  readonly key: (...depsValues: DepsArgs<S, Deps>) => unknown
  readonly triggers?: ReadonlyArray<'onMount' | 'onKeyChange' | 'manual'>
  readonly debounceMs?: number
  readonly concurrency?: 'switch' | 'exhaust-trailing'
  /**
   * Serializable metadata for Devtools/docs (whitelisted fields are extracted during build).
   */
  readonly meta?: TraitMeta
}): StateTraitEntry<S, P> => {
  const key = (state: Readonly<S>): unknown => {
    const args = (input.deps as ReadonlyArray<string>).map((dep) => RowId.getAtPath(state as any, dep))
    return (input.key as any)(...args)
  }
  return {
    fieldPath: undefined as unknown as P,
    kind: 'source',
    meta: { ...input, key },
  } as StateTraitEntry<S, P>
}

/**
 * StateTrait.externalStore:
 * - Declares that a field is written back from an ExternalStore (external input or Module-as-Source).
 * - The field is treated as external-owned: do not write to it from reducers/computed/link/source; use separate fields + derived traits.
 */
export const externalStore = <S extends object, P extends StateFieldPath<S>, T = StateAtPath<S, P>>(input: {
  readonly store: ExternalStoreType<T>
  readonly select?: (snapshot: T) => StateAtPath<S, P>
  readonly equals?: (prev: StateAtPath<S, P>, next: StateAtPath<S, P>) => boolean
  readonly coalesceWindowMs?: number
  readonly priority?: Model.TraitLane
  readonly meta?: TraitMeta
}): StateTraitEntry<S, P> =>
  ({
    fieldPath: undefined as unknown as P,
    kind: 'externalStore',
    meta: input as any,
  }) as StateTraitEntry<S, P>

/**
 * StateTrait.link:
 * - Declares a linkage from another field into the target field.
 * - `meta.from` is also constrained by `StateFieldPath<S>`.
 */
export const link = <S extends object, P extends StateFieldPath<S>>(meta: {
  from: StateFieldPath<S>
  /**
   * 043: explicit converge time-slicing scheduling.
   * - unset: immediate (default behavior unchanged)
   * - deferred: can be postponed and merged into later windows (requires runtime time-slicing enabled)
   */
  scheduling?: Model.TraitConvergeScheduling
}): StateTraitEntry<S, P> =>
  ({
    fieldPath: undefined as unknown as P,
    kind: 'link',
    meta: { ...meta, ...(meta.scheduling ? { scheduling: meta.scheduling } : {}) },
  }) as StateTraitEntry<S, P>

/**
 * StateTrait.build:
 * - Normalizes the spec into an executable Program (including Graph/Plan).
 * - When DSL and build constraints differ, build is the final authority (e.g. requiring explicit deps).
 */
export const build = <S extends object>(
  stateSchema: Schema.Schema<S, any>,
  spec: StateTraitSpec<S>,
): StateTraitProgram<S> => InternalBuild.build(stateSchema, spec)

/**
 * StateTrait.install:
 * - Installs Program-defined behavior (computed/link/source/check, etc.) on top of a Bound API.
 * - Each PlanStep corresponds to a long-lived Effect mounted into the runtime Scope.
 */
export const install = <S extends object>(
  bound: BoundApi<any, any>,
  program: StateTraitProgram<S>,
): Effect.Effect<void, never, any> => InternalInstall.install(bound, program)

/**
 * StateTrait.exportStaticIr:
 * - Exports minimal Static IR (aligned with 009 canonical FieldPath constraints) for Devtools / Alignment Lab.
 * - The return value must be JSON-stringifiable (evidence packages / replay pipeline).
 */
export type StaticIr = InternalIr.StaticIr

export const exportStaticIr = (
  program: StateTraitProgram<any>,
  moduleId: string,
  options?: {
    readonly version?: string
  },
): StaticIr =>
  InternalIr.exportStaticIr({
    program,
    moduleId,
    version: options?.version,
  })
