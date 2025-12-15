// StateFieldPath / StateAtPath 类型工具。
// 目标：在类型层展开 State 上可用的字段路径，并根据路径推导字段类型。

type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | RegExp
  | Function

type NonNull<T> = Exclude<T, null | undefined>

type IsPlainObject<T> =
  [NonNull<T>] extends [Primitive] ? false
    : [NonNull<T>] extends [readonly any[]] ? false
    : [NonNull<T>] extends [Map<any, any> | Set<any> | WeakMap<any, any> | WeakSet<any>] ? false
    : [NonNull<T>] extends [object] ? true
    : false

type Join<K, P> = K extends string | number
  ? P extends string
    ? `${K}.${P}`
    : never
  : never

type PrevDepth<D extends number> =
  D extends 4 ? 3
    : D extends 3 ? 2
    : D extends 2 ? 1
    : D extends 1 ? 0
    : 0

type FieldPathInner<S, Depth extends number> =
  Depth extends 0 ? never
    : S extends object
      ? {
          [K in keyof S & string]:
            | K
            | (IsPlainObject<S[K]> extends true
                ? Join<K, FieldPathInner<S[K], PrevDepth<Depth>>>
                : never)
        }[keyof S & string]
      : never

/**
 * StateFieldPath<S>：
 * - 在类型层展开 S 上所有可被 Trait 标注的字段路径；
 * - 使用最大递归深度 4，避免 TS Server 性能问题。
 */
export type StateFieldPath<S> = FieldPathInner<S, 4>

/**
 * StateAtPath<S, P>：
 * - 给定 State 类型 S 与路径 P，推导该路径对应的字段类型；
 * - 对不存在的路径返回 never，用于在测试中触发类型错误。
 */
export type StateAtPath<S, P> =
  S extends object
    ? P extends `${infer K}.${infer Rest}`
      ? K extends keyof S
        ? StateAtPath<S[K], Rest>
        : never
      : P extends keyof S
        ? S[P]
        : never
    : never
