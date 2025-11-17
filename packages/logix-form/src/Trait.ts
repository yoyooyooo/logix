import * as Logix from '@logix/core'

export type FieldPath<S extends object> = Logix.StateTrait.StateFieldPath<S>
export type AtPath<S extends object, P extends FieldPath<S>> = Logix.StateTrait.StateAtPath<S, P>

export type TraitEntry<S extends object, P extends string = FieldPath<S>> = Logix.StateTrait.StateTraitEntry<S, P>

export type DerivedEntry<S extends object, P extends string = FieldPath<S>> = Extract<
  TraitEntry<S, P>,
  { readonly kind: 'computed' | 'link' | 'source' }
>

export type DerivedState<TValues extends object> = TValues & {
  readonly ui: Readonly<Record<string, unknown>>
}

export type DerivedSpec<TValues extends object> = Readonly<{
  [P in FieldPath<DerivedState<TValues>>]?: DerivedEntry<DerivedState<TValues>, P>
}>

type DepsArgs<S extends object, Deps extends ReadonlyArray<FieldPath<S>>> = {
  readonly [K in keyof Deps]: AtPath<S, Deps[K]>
}

export const computed = <
  S extends object,
  P extends FieldPath<S>,
  const Deps extends ReadonlyArray<FieldPath<S>>,
>(input: {
  readonly deps: Deps
  readonly get: (...depsValues: DepsArgs<S, Deps>) => AtPath<S, P>
  readonly equals?: (prev: AtPath<S, P>, next: AtPath<S, P>) => boolean
}): DerivedEntry<S, P> => Logix.StateTrait.computed(input as any) as any

export const source = <S extends object, P extends FieldPath<S>, const Deps extends ReadonlyArray<FieldPath<S>>>(input: {
  readonly resource: string
  readonly deps: Deps
  readonly key: (...depsValues: DepsArgs<S, Deps>) => unknown
  readonly triggers?: ReadonlyArray<'onMount' | 'onKeyChange' | 'manual'>
  readonly debounceMs?: number
  readonly concurrency?: 'switch' | 'exhaust-trailing'
  readonly meta?: Record<string, unknown>
}): DerivedEntry<S, P> => Logix.StateTrait.source(input as any) as any

export const link = <S extends object, P extends FieldPath<S>>(meta: {
  readonly from: FieldPath<S>
}): DerivedEntry<S, P> => Logix.StateTrait.link(meta as any) as any
