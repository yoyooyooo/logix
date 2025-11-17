export type ValuePath = string
export type PatternPath = string
export type ListPath = string
export type ErrorsPath = string
export type UiPath = string
export type FieldPath = ReadonlyArray<string>

const isNumericSegment = (seg: string): boolean => /^[0-9]+$/.test(seg)

const splitPath = (path: string): ReadonlyArray<string> => {
  if (!path) return []
  const parts = path.split('.').filter((p) => p.length > 0)
  const segs: Array<string> = []

  for (const part of parts) {
    if (!part) continue
    if (part.endsWith('[]')) {
      const base = part.slice(0, -2)
      if (base) segs.push(base)
      segs.push('[]')
      continue
    }
    const bracket = /^(.+)\[(\d+)\]$/.exec(part)
    if (bracket) {
      const base = bracket[1]!
      if (base) segs.push(base)
      segs.push(bracket[2]!)
      continue
    }
    segs.push(part)
  }

  return segs
}

export const toPatternPath = (valuePath: ValuePath): PatternPath => {
  if (!valuePath) return valuePath
  const segs = splitPath(valuePath)
  const out: Array<string> = []

  for (const seg of segs) {
    if (seg === '[]' || isNumericSegment(seg)) {
      if (out.length === 0) continue
      const last = out[out.length - 1]!
      if (!last.endsWith('[]')) out[out.length - 1] = `${last}[]`
      continue
    }
    out.push(seg)
  }

  return out.join('.')
}

export const toListPath = (valuePath: ValuePath): ListPath | undefined => {
  const segs = splitPath(valuePath)
  const firstIndex = segs.findIndex((seg) => seg === '[]' || isNumericSegment(seg))
  if (firstIndex <= 0) return undefined
  return segs.slice(0, firstIndex).join('.')
}

export const toErrorsPath = (valuePath: ValuePath): ErrorsPath => {
  if (!valuePath) return 'errors'
  const segs = splitPath(valuePath)
  const out: Array<string> = []

  for (const seg of segs) {
    if (isNumericSegment(seg)) {
      out.push('rows', seg)
      continue
    }
    if (seg === '[]') {
      continue
    }
    out.push(seg)
  }

  return `errors.${out.join('.')}`
}

export const toManualErrorsPath = (valuePath: ValuePath): ErrorsPath => {
  const base = toErrorsPath(valuePath)
  return base === 'errors' ? 'errors.$manual' : base.replace(/^errors\./, 'errors.$manual.')
}

export const toSchemaErrorsPath = (valuePath: ValuePath): ErrorsPath => {
  const base = toErrorsPath(valuePath)
  return base === 'errors' ? 'errors.$schema' : base.replace(/^errors\./, 'errors.$schema.')
}

export const toUiPath = (valuePath: ValuePath): UiPath => (valuePath ? `ui.${valuePath}` : 'ui')

export const toFieldPath = (path: ValuePath | PatternPath): FieldPath => {
  const segs = splitPath(path)
  const out: Array<string> = []
  for (const seg of segs) {
    if (seg === '[]' || isNumericSegment(seg)) continue
    out.push(seg)
  }
  return out.length > 0 ? out : ['$root']
}

export const Path = {
  toPatternPath,
  toListPath,
  toErrorsPath,
  toManualErrorsPath,
  toSchemaErrorsPath,
  toUiPath,
  toFieldPath,
} as const
