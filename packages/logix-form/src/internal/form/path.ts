export const getAtPath = (state: unknown, path: string): unknown => {
  if (!path) return state

  const segments = path.split('.')
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
  if (value && typeof value === 'object') return { ...(value as any) }
  return undefined
}

export const setAtPath = (state: unknown, path: string, value: unknown): unknown => {
  if (!path) return value

  const segments = path.split('.')
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
    const nextIsIndex = Number.isInteger(nextIndex) && String(nextIndex) === nextSegment

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

export const unsetAtPath = (state: unknown, path: string): unknown => {
  if (!path) return state
  if (getAtPath(state, path) === undefined) return state

  const segments = path.split('.')
  const rootClone = cloneContainer(state)
  if (rootClone === undefined) return state

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

    const nextClone = cloneContainer(nextSource)
    if (nextClone === undefined) {
      return state
    }

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
    current[lastIndex] = undefined
    return rootClone
  }

  if (current && typeof current === 'object') {
    delete current[last]
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

// Internal-only path helpers for Form error/ui overlays.
// These helpers deliberately live under internal/form so `@logixjs/form` does not expose
// a public Form.Path family or schema-path mapping route.
export type FormValuePath = string
export type FormPatternPath = string
export type FormListPath = string
export type FormErrorsPath = string
export type FormUiPath = string
export type FormFieldPath = ReadonlyArray<string>

const isNumericPathSegment = (segment: string): boolean => /^[0-9]+$/.test(segment)

const splitFormPath = (path: string): ReadonlyArray<string> => {
  if (!path) return []
  const parts = path.split('.').filter((part) => part.length > 0)
  const segments: Array<string> = []

  for (const part of parts) {
    if (!part) continue
    if (part.endsWith('[]')) {
      const base = part.slice(0, -2)
      if (base) segments.push(base)
      segments.push('[]')
      continue
    }
    const bracket = /^(.+)\[(\d+)\]$/.exec(part)
    if (bracket) {
      const base = bracket[1]!
      if (base) segments.push(base)
      segments.push(bracket[2]!)
      continue
    }
    segments.push(part)
  }

  return segments
}

export const toPatternPath = (valuePath: FormValuePath): FormPatternPath => {
  if (!valuePath) return valuePath
  const segments = splitFormPath(valuePath)
  const out: Array<string> = []

  for (const segment of segments) {
    if (segment === '[]' || isNumericPathSegment(segment)) {
      if (out.length === 0) continue
      const last = out[out.length - 1]!
      if (!last.endsWith('[]')) out[out.length - 1] = `${last}[]`
      continue
    }
    out.push(segment)
  }

  return out.join('.')
}

export const toListPath = (valuePath: FormValuePath): FormListPath | undefined => {
  const segments = splitFormPath(valuePath)
  const firstIndex = segments.findIndex((segment) => segment === '[]' || isNumericPathSegment(segment))
  if (firstIndex <= 0) return undefined
  return segments.slice(0, firstIndex).join('.')
}

export const toErrorsPath = (valuePath: FormValuePath): FormErrorsPath => {
  if (!valuePath) return 'errors'
  const segments = splitFormPath(valuePath)
  const out: Array<string> = []

  for (const segment of segments) {
    if (isNumericPathSegment(segment)) {
      out.push('rows', segment)
      continue
    }
    if (segment === '[]') continue
    out.push(segment)
  }

  return `errors.${out.join('.')}`
}

export const toManualErrorsPath = (valuePath: FormValuePath): FormErrorsPath => {
  const base = toErrorsPath(valuePath)
  return base === 'errors' ? 'errors.$manual' : base.replace(/^errors\./, 'errors.$manual.')
}

export const toSchemaErrorsPath = (valuePath: FormValuePath): FormErrorsPath => {
  const base = toErrorsPath(valuePath)
  return base === 'errors' ? 'errors.$schema' : base.replace(/^errors\./, 'errors.$schema.')
}

export const toUiPath = (valuePath: FormValuePath): FormUiPath => (valuePath ? `ui.${valuePath}` : 'ui')

export const toFieldPath = (path: FormValuePath | FormPatternPath): FormFieldPath => {
  const segments = splitFormPath(path)
  const out: Array<string> = []
  for (const segment of segments) {
    if (segment === '[]' || isNumericPathSegment(segment)) continue
    out.push(segment)
  }
  return out.length > 0 ? out : ['$root']
}
