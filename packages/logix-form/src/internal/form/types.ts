type Primitive = string | number | boolean | bigint | symbol | null | undefined | Date | RegExp | Function

type NonNull<T> = Exclude<T, null | undefined>

type IsPlainObject<T> = [NonNull<T>] extends [Primitive]
  ? false
  : [NonNull<T>] extends [readonly any[]]
    ? false
    : [NonNull<T>] extends [Map<any, any> | Set<any> | WeakMap<any, any> | WeakSet<any>]
      ? false
      : [NonNull<T>] extends [object]
        ? true
        : false

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never

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

type IndexSegment = `${number}`

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
                    ? Join<K, FieldPathInner<NonNull<T>[K], PrevDepth<Depth>>>
                    : never)
          }[keyof NonNull<T> & string]
        : never

/**
 * FieldPath<TValues>：
 * - A typed version of valuePath strings (aligned with the "ValuePath" mental model from 010).
 *   Array indices are represented as `${number}`; examples:
 *   - "profile.name"
 *   - "items.${number}.warehouseId"
 * - Uses a max recursion depth of 5 to avoid TS Server performance issues.
 */
export type FieldPath<TValues extends object> = FieldPathInner<TValues, 5>

type AtIndex<T> = NonNull<T> extends readonly (infer Item)[] ? Item : never

type FieldValueInner<TValues, P> = P extends `${infer Head}.${infer Rest}`
  ? Head extends IndexSegment
    ? FieldValueInner<AtIndex<TValues>, Rest>
    : Head extends keyof NonNull<TValues>
      ? FieldValueInner<NonNull<TValues>[Head], Rest>
      : never
  : P extends IndexSegment
    ? AtIndex<TValues>
    : P extends keyof NonNull<TValues>
      ? NonNull<TValues>[P]
      : never

/**
 * FieldValue<TValues, P>：
 * - Given a values type and a FieldPath, infers the value type at that path.
 */
export type FieldValue<TValues extends object, P extends FieldPath<TValues>> = FieldValueInner<TValues, P>

type UnwrapArray<T> = [NonNull<T>] extends [readonly (infer Item)[]] ? Item : NonNull<T>

type CanonicalPathInner<T, Depth extends number> = Depth extends 0
  ? never
  : [NonNull<T>] extends [Primitive]
    ? never
    : [NonNull<T>] extends [readonly (infer Item)[]]
      ? CanonicalPathInner<Item, PrevDepth<Depth>>
      : [NonNull<T>] extends [object]
        ? {
            [K in keyof NonNull<T> & string]:
              | K
              | ([NonNull<T>[K]] extends [readonly (infer Item)[]]
                  ? CanonicalPathInner<Item, PrevDepth<Depth>> extends infer P
                    ? P extends string
                      ? `${K}.${P}`
                      : never
                    : never
                  : IsPlainObject<NonNull<T>[K]> extends true
                    ? Join<K, CanonicalPathInner<NonNull<T>[K], PrevDepth<Depth>>>
                    : never)
          }[keyof NonNull<T> & string]
        : never

/**
 * CanonicalPath<TValues>：
 * - The "canonical value path" aligned with Form.rules / Form.Rule.field/list:
 *   - No numeric segments (`${number}`) and no bracket/[] syntax.
 *   - For arrays: uses implicit pattern semantics to "pierce through array items"
 *     (e.g. `items.title`, `items.allocations.amount`).
 * - Uses a max recursion depth of 5 to avoid TS Server performance issues.
 */
export type CanonicalPath<TValues extends object> = CanonicalPathInner<TValues, 5>

type CanonicalValueInner<TValues, P> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof UnwrapArray<TValues> & string
    ? CanonicalValueInner<
        [NonNull<UnwrapArray<TValues>[Head]>] extends [readonly (infer Item)[]] ? Item : UnwrapArray<TValues>[Head],
        Rest
      >
    : never
  : P extends keyof UnwrapArray<TValues> & string
    ? UnwrapArray<TValues>[P]
    : never

/**
 * CanonicalValue<TValues, P>：
 * - Given a values type and a CanonicalPath, infers the value type at that path.
 */
export type CanonicalValue<TValues extends object, P extends CanonicalPath<TValues>> = CanonicalValueInner<TValues, P>

/**
 * CanonicalListPath<TValues>：
 * - The subset of CanonicalPath whose endpoints are arrays; used as listPath hints for Form.Rule.list.
 */
export type CanonicalListPath<TValues extends object> = {
  [P in CanonicalPath<TValues>]: CanonicalValue<TValues, P> extends readonly any[] ? P : never
}[CanonicalPath<TValues>]

export type CanonicalListItem<TValues extends object, P extends CanonicalListPath<TValues>> =
  CanonicalValue<TValues, P> extends readonly (infer Item)[] ? Item : never
