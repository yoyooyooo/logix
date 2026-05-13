export { fieldValue, fieldValues, rawFormMeta } from './internal/formProjection.js'

export type RawFormMeta = Readonly<{
  readonly submitCount: number
  readonly isSubmitting: boolean
  readonly isDirty: boolean
  readonly errorCount: number
}>

declare const FieldValueSelectorBrand: unique symbol

export type FieldValueSelector<P extends string = string> = {
  readonly [FieldValueSelectorBrand]: P
}

declare const FieldValuesSelectorBrand: unique symbol

export type FieldValuesSelector<Paths extends readonly string[] = readonly string[]> = {
  readonly [FieldValuesSelectorBrand]: Paths
}

type Primitive = string | number | boolean | bigint | symbol | null | undefined | Date | RegExp | Function
type NonNull<T> = Exclude<T, null | undefined>
type IndexSegment = `${number}`

type PrevDepth<D extends number> = D extends 5
  ? 4
  : D extends 4
    ? 3
    : D extends 3
      ? 2
      : D extends 2
        ? 1
        : D extends 1
          ? 0
          : 0

type IsPlainObject<T> = [NonNull<T>] extends [Primitive]
  ? false
  : [NonNull<T>] extends [readonly any[]]
    ? false
    : [NonNull<T>] extends [Map<any, any> | Set<any> | WeakMap<any, any> | WeakSet<any>]
      ? false
      : [NonNull<T>] extends [object]
        ? true
        : false

type FieldPathInner<T, Depth extends number> = Depth extends 0
  ? never
  : [NonNull<T>] extends [Primitive]
    ? never
    : [NonNull<T>] extends [readonly (infer Item)[]]
      ?
          | IndexSegment
          | (FieldPathInner<Item, PrevDepth<Depth>> extends infer P
              ? P extends string
                ? `${IndexSegment}.${P}`
                : never
              : never)
      : [NonNull<T>] extends [object]
        ? {
            [K in keyof NonNull<T> & string]:
              | K
              | ([NonNull<T>[K]] extends [readonly (infer Item)[]]
                  ?
                      | `${K}.${IndexSegment}`
                      | (FieldPathInner<Item, PrevDepth<Depth>> extends infer P
                          ? P extends string
                            ? `${K}.${IndexSegment}.${P}`
                            : never
                          : never)
                  : IsPlainObject<NonNull<T>[K]> extends true
                    ? FieldPathInner<NonNull<T>[K], PrevDepth<Depth>> extends infer P
                      ? P extends string
                        ? `${K}.${P}`
                        : never
                      : never
                    : never)
          }[keyof NonNull<T> & string]
        : never

export type FieldValuePath<TValues extends object> = FieldPathInner<TValues, 5>

type AtIndex<T> = NonNull<T> extends readonly (infer Item)[] ? Item : never

type FieldValueAtInner<TValues, P> = P extends `${infer Head}.${infer Rest}`
  ? Head extends IndexSegment
    ? FieldValueAtInner<AtIndex<TValues>, Rest>
    : Head extends keyof NonNull<TValues>
      ? FieldValueAtInner<NonNull<TValues>[Head], Rest>
      : never
  : P extends IndexSegment
    ? AtIndex<TValues>
    : P extends keyof NonNull<TValues>
      ? NonNull<TValues>[P]
      : never

export type FieldValueAt<TValues extends object, P extends FieldValuePath<TValues>> = FieldValueAtInner<TValues, P>

export type FieldValuesAt<
  TValues extends object,
  Paths extends readonly FieldValuePath<TValues>[],
> = {
  readonly [K in keyof Paths]: Paths[K] extends FieldValuePath<TValues> ? FieldValueAt<TValues, Paths[K]> : never
}
