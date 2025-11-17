// StateFieldPath / StateAtPath type utilities.
// Goal: enumerate field paths available on State at the type level, and derive the field type from a path.

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

type Join<K, P> = K extends string | number ? (P extends string ? `${K}.${P}` : never) : never

type PrevDepth<D extends number> = D extends 4 ? 3 : D extends 3 ? 2 : D extends 2 ? 1 : D extends 1 ? 0 : 0

type FieldPathInner<S, Depth extends number> = Depth extends 0
  ? never
  : S extends object
    ? {
        [K in keyof S & string]:
          | K
          | (IsPlainObject<S[K]> extends true ? Join<K, FieldPathInner<S[K], PrevDepth<Depth>>> : never)
      }[keyof S & string]
    : never

/**
 * StateFieldPath<S>：
 * - Enumerate all field paths on S that can be annotated by Traits at the type level.
 * - Uses a max recursion depth of 4 to avoid TS Server performance issues.
 */
export type StateFieldPath<S> = FieldPathInner<S, 4>

/**
 * StateAtPath<S, P>：
 * - Given a State type S and path P, derive the field type at that path.
 * - Returns never for non-existent paths, used to trigger type errors in tests.
 */
export type StateAtPath<S, P> = S extends object
  ? P extends `${infer K}.${infer Rest}`
    ? K extends keyof S
      ? StateAtPath<S[K], Rest>
      : never
    : P extends keyof S
      ? S[P]
      : never
  : never
