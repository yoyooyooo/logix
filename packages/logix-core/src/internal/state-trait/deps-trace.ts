export interface DepsTraceResult<T> {
  readonly value: T
  readonly reads: ReadonlyArray<string>
}

export interface DepsDiff {
  readonly reads: ReadonlyArray<string>
  readonly declared: ReadonlyArray<string>
  readonly missing: ReadonlyArray<string>
  readonly unused: ReadonlyArray<string>
}

const isTraceableObject = (value: unknown): value is object => {
  if (!value || typeof value !== "object") return false
  if (Array.isArray(value)) return true
  if (value instanceof Date) return false
  if (value instanceof RegExp) return false
  if (value instanceof Error) return false
  if (value instanceof Map) return false
  if (value instanceof Set) return false
  if (value instanceof WeakMap) return false
  if (value instanceof WeakSet) return false
  return true
}

const shouldIgnoreKey = (key: string): boolean =>
  key === "__proto__" || key === "prototype" || key === "constructor"

const normalizeReads = (reads: ReadonlySet<string>): ReadonlyArray<string> => {
  const all = Array.from(reads).filter((p) => typeof p === "string" && p.length > 0)
  all.sort()

  // 去掉严格前缀路径（例如同时读了 profile 与 profile.id 时，只保留更具体的 profile.id）。
  const isPrefix = (prefix: string, full: string): boolean =>
    full !== prefix && full.startsWith(prefix + ".")

  const pruned: Array<string> = []
  for (const p of all) {
    let hasMoreSpecific = false
    for (const other of all) {
      if (isPrefix(p, other)) {
        hasMoreSpecific = true
        break
      }
    }
    if (!hasMoreSpecific) {
      pruned.push(p)
    }
  }

  pruned.sort()
  return pruned
}

const covers = (declared: string, read: string): boolean =>
  declared === read || read.startsWith(declared + ".")

export const diffDeps = (
  declared: ReadonlyArray<string>,
  reads: ReadonlyArray<string>,
): DepsDiff | undefined => {
  const declaredList = Array.from(new Set(declared)).filter((p) => typeof p === "string" && p.length > 0)
  declaredList.sort()
  const readList = Array.from(new Set(reads)).filter((p) => typeof p === "string" && p.length > 0)
  readList.sort()

  const missing = readList.filter((r) => declaredList.every((d) => !covers(d, r)))
  const unused = declaredList.filter((d) => readList.every((r) => !covers(d, r)))

  if (missing.length === 0 && unused.length === 0) return undefined

  return {
    reads: readList,
    declared: declaredList,
    missing,
    unused,
  }
}

export const trace = <T>(
  fn: (state: any) => T,
  state: unknown,
): DepsTraceResult<T> => {
  if (!isTraceableObject(state)) {
    return { value: fn(state as any), reads: [] }
  }

  const reads = new Set<string>()

  // per-trace caches to preserve reference identity within the traced call.
  const proxyCache = new WeakMap<object, Map<string, any>>()
  const proxyToTarget = new WeakMap<object, object>()

  const wrap = (value: unknown, path: string): unknown => {
    if (!isTraceableObject(value)) return value
    return getProxy(value as any, path)
  }

  const unwrap = <V>(value: V): V => {
    if (value && (typeof value === "object" || typeof value === "function")) {
      const target = proxyToTarget.get(value as any)
      if (target) return target as any as V
    }
    return value
  }

  const getProxy = (target: object, basePath: string): any => {
    let byPath = proxyCache.get(target)
    if (!byPath) {
      byPath = new Map()
      proxyCache.set(target, byPath)
    }

    const cached = byPath.get(basePath)
    if (cached) return cached

    const record = (path: string) => {
      if (path) reads.add(path)
    }

    const proxy = new Proxy(target as any, {
      get: (t, prop, receiver) => {
        if (typeof prop === "symbol") {
          return Reflect.get(t, prop, receiver)
        }
        const key = String(prop)
        if (shouldIgnoreKey(key)) {
          return Reflect.get(t, prop, receiver)
        }

        const nextPath = basePath ? `${basePath}.${key}` : key
        record(nextPath)

        const value = Reflect.get(t, prop, receiver) as unknown
        return wrap(value, nextPath)
      },
      has: (t, prop) => {
        if (typeof prop === "symbol") return Reflect.has(t, prop)
        const key = String(prop)
        if (!shouldIgnoreKey(key)) {
          const nextPath = basePath ? `${basePath}.${key}` : key
          record(nextPath)
        }
        return Reflect.has(t, prop)
      },
      ownKeys: (t) => {
        if (basePath) record(basePath)
        return Reflect.ownKeys(t)
      },
      getOwnPropertyDescriptor: (t, prop) => {
        if (typeof prop === "symbol") {
          return Reflect.getOwnPropertyDescriptor(t, prop)
        }
        const key = String(prop)
        if (!shouldIgnoreKey(key)) {
          const nextPath = basePath ? `${basePath}.${key}` : key
          record(nextPath)
        }
        return Reflect.getOwnPropertyDescriptor(t, prop)
      },
      set: () => {
        throw new Error(
          "[deps-trace] Attempted to mutate state during deps tracing (state is readonly in dev-mode diagnostics).",
        )
      },
      defineProperty: () => {
        throw new Error(
          "[deps-trace] Attempted to define property on state during deps tracing (state is readonly in dev-mode diagnostics).",
        )
      },
      deleteProperty: () => {
        throw new Error(
          "[deps-trace] Attempted to delete property on state during deps tracing (state is readonly in dev-mode diagnostics).",
        )
      },
    })

    byPath.set(basePath, proxy)
    proxyToTarget.set(proxy, target)
    return proxy
  }

  const root = getProxy(state as any, "")
  const value = unwrap(fn(root))

  return {
    value,
    reads: normalizeReads(reads),
  }
}

