import type { FieldPath, SchemaError, SchemaPathMappingOptions } from "./schema-path-mapping.js"
import { mapSchemaErrorToFieldPaths } from "./schema-path-mapping.js"

export interface SchemaErrorMappingOptions extends SchemaPathMappingOptions {
  /**
   * toLeaf：把 schemaError 转成可写入错误树的叶子值。
   * - 默认：直接写入原始 schemaError。
   */
  readonly toLeaf?: (schemaError: SchemaError) => unknown
}

type Segment = string | number

const parseSegments = (path: string): ReadonlyArray<Segment> => {
  if (!path) return []
  return path.split(".").filter(Boolean).map((seg) =>
    /^[0-9]+$/.test(seg) ? Number(seg) : seg,
  )
}

const cloneContainer = (value: unknown): any => {
  if (Array.isArray(value)) return value.slice()
  if (value && typeof value === "object") return { ...(value as any) }
  return undefined
}

/**
 * setAtPath：
 * - 纯函数：沿路径克隆并写入 value；
 * - 当下一段是 number 时，自动创建数组容器（保证 errors/ui 与 values 的数组形状对齐）。
 */
const setAtPath = (state: unknown, path: string, value: unknown): unknown => {
  if (!path) return value
  const segments = parseSegments(path)
  if (segments.length === 0) return value

  const rootClone =
    cloneContainer(state) ??
    (typeof segments[0] === "number" ? [] : {})

  let current: any = rootClone
  let currentSource: any = state

  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!
    const nextKey = segments[i + 1]!

    const nextSource =
      currentSource == null
        ? undefined
        : typeof key === "number"
          ? currentSource[key]
          : currentSource[key]

    const nextClone =
      cloneContainer(nextSource) ??
      (typeof nextKey === "number" ? [] : {})

    if (typeof key === "number" && Array.isArray(current)) {
      current[key] = nextClone
    } else {
      current[key as any] = nextClone
    }

    current = nextClone
    currentSource = nextSource
  }

  const last = segments[segments.length - 1]!
  if (typeof last === "number" && Array.isArray(current)) {
    current[last] = value
  } else {
    current[last as any] = value
  }

  return rootClone
}

export type SchemaErrorWrite = {
  /**
   * fieldPath：不带 errors. 前缀的字段路径（面向领域层）。
   */
  readonly fieldPath: FieldPath
  /**
   * errorPath：实际写入 state 的路径（带 errors. 前缀）。
   */
  readonly errorPath: string
  readonly error: unknown
}

export const toSchemaErrorWrites = (
  schemaError: SchemaError,
  options?: SchemaErrorMappingOptions,
): ReadonlyArray<SchemaErrorWrite> => {
  const fieldPaths = mapSchemaErrorToFieldPaths(schemaError, options)
  if (fieldPaths.length === 0) return []

  const toLeaf = options?.toLeaf ?? ((e: SchemaError) => e)
  const leaf = toLeaf(schemaError)

  return fieldPaths.map((fieldPath) => ({
    fieldPath,
    errorPath: `errors.${fieldPath}`,
    error: leaf,
  }))
}

/**
 * applySchemaErrorToState：
 * - 将 SchemaError 映射并写回到 state.errors.*；
 * - 不负责清理未命中的旧错误（由上层在更明确的 scope 下清理）。
 */
export const applySchemaErrorToState = (
  state: unknown,
  schemaError: SchemaError,
  options?: SchemaErrorMappingOptions,
): unknown => {
  const writes = toSchemaErrorWrites(schemaError, options)
  if (writes.length === 0) return state

  let next: unknown = state
  for (const w of writes) {
    next = setAtPath(next, w.errorPath, w.error)
  }
  return next
}

