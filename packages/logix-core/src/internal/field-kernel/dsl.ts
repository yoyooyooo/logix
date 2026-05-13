import type { Schema } from 'effect'
import type { ExternalStore as ExternalStoreType } from '../external-store.js'
import type { StateAtPath, StateFieldPath } from './field-path.js'
import type { FieldMeta } from './meta.js'
import type {
  FieldConvergeScheduling,
  FieldEntry,
  FieldPriorityLane,
  FieldSpec,
} from './model.js'
import * as RowId from './rowid.js'

export const $root = '$root' as const

type DepsArgs<S extends object, Deps extends ReadonlyArray<StateFieldPath<S>>> = {
  readonly [K in keyof Deps]: StateAtPath<S, Deps[K]>
}

export const from =
  <S extends object>(_schema: Schema.Schema<S>) =>
  (spec: FieldSpec<S>): FieldSpec<S> =>
    spec

export const node = <Input = unknown, Ctx = unknown>(
  spec: Omit<import('./model.js').FieldNode<Input, Ctx>, '_tag'>,
): import('./model.js').FieldNode<Input, Ctx> => ({
  _tag: 'FieldNode',
  ...spec,
})

export const list = <Item = unknown>(
  spec: Omit<import('./model.js').FieldList<Item>, '_tag'>,
): import('./model.js').FieldList<Item> => ({
  _tag: 'FieldList',
  ...spec,
})

export const computed = <
  S extends object,
  P extends StateFieldPath<S>,
  const Deps extends ReadonlyArray<StateFieldPath<S>>,
>(input: {
  readonly deps: Deps
  readonly get: (...depsValues: DepsArgs<S, Deps>) => StateAtPath<S, P>
  readonly equals?: (prev: StateAtPath<S, P>, next: StateAtPath<S, P>) => boolean
  readonly scheduling?: FieldConvergeScheduling
}): FieldEntry<S, P> => {
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
  } as FieldEntry<S, P>
}

export const source = <
  S extends object,
  P extends StateFieldPath<S>,
  const Deps extends ReadonlyArray<StateFieldPath<S>>,
>(input: {
  readonly resource: string
  readonly deps: Deps
  readonly key: (...depsValues: DepsArgs<S, Deps>) => unknown
  readonly triggers?: ReadonlyArray<'onMount' | 'onKeyChange'>
  readonly debounceMs?: number
  readonly concurrency?: 'switch' | 'exhaust-trailing'
  readonly submitImpact?: 'block' | 'observe'
  readonly meta?: FieldMeta
}): FieldEntry<S, P> => {
  const key = (state: Readonly<S>): unknown => {
    const args = (input.deps as ReadonlyArray<string>).map((dep) => RowId.getAtPath(state as any, dep))
    return (input.key as any)(...args)
  }

  return {
    fieldPath: undefined as unknown as P,
    kind: 'source',
    meta: { ...input, key },
  } as FieldEntry<S, P>
}

export const externalStore = <
  S extends object,
  P extends StateFieldPath<S>,
  T = StateAtPath<S, P>,
>(input: {
  readonly store: ExternalStoreType<T>
  readonly select?: (snapshot: T) => StateAtPath<S, P>
  readonly equals?: (prev: StateAtPath<S, P>, next: StateAtPath<S, P>) => boolean
  readonly coalesceWindowMs?: number
  readonly priority?: FieldPriorityLane
  readonly meta?: FieldMeta
}): FieldEntry<S, P> =>
  ({
    fieldPath: undefined as unknown as P,
    kind: 'externalStore',
    meta: input as any,
  }) as FieldEntry<S, P>

export const link = <S extends object, P extends StateFieldPath<S>>(meta: {
  readonly from: StateFieldPath<S>
  readonly scheduling?: FieldConvergeScheduling
}): FieldEntry<S, P> =>
  ({
    fieldPath: undefined as unknown as P,
    kind: 'link',
    meta: { ...meta, ...(meta.scheduling ? { scheduling: meta.scheduling } : {}) },
  }) as FieldEntry<S, P>
