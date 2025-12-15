export const getAtPath = (state: unknown, path: string): unknown => {
  if (!path) return state

  const segments = path.split(".")
  let current: any = state

  for (const segment of segments) {
    if (current == null) return undefined
    const index = Number(segment)
    if (Array.isArray(current) && Number.isInteger(index) && String(index) === segment) {
      current = current[index]
      continue
    }
    current = current[segment]
  }

  return current
}

const cloneContainer = (value: unknown): any => {
  if (Array.isArray(value)) return value.slice()
  if (value && typeof value === "object") return { ...(value as any) }
  return undefined
}

export const setAtPath = (state: unknown, path: string, value: unknown): unknown => {
  if (!path) return value

  const segments = path.split(".")
  const rootClone = cloneContainer(state) ?? {}

  let current: any = rootClone
  let currentSource: any = state

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!
    const index = Number(segment)
    const isIndex = Number.isInteger(index) && String(index) === segment

    const nextSource =
      currentSource == null
        ? undefined
        : isIndex && Array.isArray(currentSource)
          ? currentSource[index]
          : currentSource[segment]

    const nextSegment = segments[i + 1]!
    const nextIndex = Number(nextSegment)
    const nextIsIndex =
      Number.isInteger(nextIndex) && String(nextIndex) === nextSegment

    const nextClone = cloneContainer(nextSource) ?? (nextIsIndex ? [] : {})

    if (isIndex && Array.isArray(current)) {
      current[index] = nextClone
    } else {
      current[segment] = nextClone
    }

    current = nextClone
    currentSource = nextSource
  }

  const last = segments[segments.length - 1]!
  const lastIndex = Number(last)
  const lastIsIndex = Number.isInteger(lastIndex) && String(lastIndex) === last

  if (lastIsIndex && Array.isArray(current)) {
    current[lastIndex] = value
  } else {
    current[last] = value
  }

  return rootClone
}

export const updateArrayAtPath = (
  state: unknown,
  path: string,
  update: (items: ReadonlyArray<unknown>) => ReadonlyArray<unknown>,
): unknown => {
  const current = getAtPath(state, path)
  const items = Array.isArray(current) ? current : []
  const next = update(items)
  return setAtPath(state, path, next)
}
