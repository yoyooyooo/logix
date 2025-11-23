// 基础的 dot-path 读写工具，避免泄漏 any

export function get<T>(obj: T, path: string, defaultValue?: unknown): unknown {
  if (!path) return obj as unknown
  const segments = path.split(".")
  let current: unknown = obj

  for (const key of segments) {
    if (current == null) return defaultValue
    if (Array.isArray(current)) {
      const index = Number(key)
      if (Number.isNaN(index)) return defaultValue
      current = current[index]
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[key]
    } else {
      return defaultValue
    }
  }

  return current ?? defaultValue
}

export function set<T>(obj: T, path: string, value: unknown): T {
  const segments = path.split(".")
  if (segments.length === 0) return obj

  const clone: Record<string, unknown> | unknown[] = Array.isArray(obj)
    ? [...(obj as unknown[])]
    : { ...(obj as Record<string, unknown>) }

  let current: Record<string, unknown> | unknown[] | undefined = clone

  segments.forEach((key, idx) => {
    if (current == null) return
    const isLast = idx === segments.length - 1

    if (Array.isArray(current)) {
      const index = Number(key)
      if (Number.isNaN(index)) return
      if (isLast) {
        current[index] = value
        return
      }

      const next = current[index]
      if (next == null || typeof next !== "object") {
        current[index] = Number.isInteger(Number(segments[idx + 1])) ? [] : {}
      }
      current = current[index] as Record<string, unknown> | unknown[]
    } else {
      if (isLast) {
        current[key] = value
        return
      }

      const next = current[key]
      if (next == null || typeof next !== "object") {
        current[key] = Number.isInteger(Number(segments[idx + 1])) ? [] : {}
      }
      current = current[key] as Record<string, unknown> | unknown[]
    }
  })

  return clone as T
}
