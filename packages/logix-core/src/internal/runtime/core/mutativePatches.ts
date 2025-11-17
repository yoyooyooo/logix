import { create, type Patches } from 'mutative'
import type { FieldPath } from '../../field-path.js'
import { isFieldPathSegment } from '../../field-path.js'

export type PatchPath = FieldPath

export const mutateWithoutPatches = <S>(base: S, mutator: (draft: S) => void): S => {
  return create(base, mutator as any) as unknown as S
}

const toPatchFieldPath = (path: unknown): PatchPath | '*' | undefined => {
  if (typeof path === 'string') {
    const trimmed = path.trim()
    return trimmed.length > 0 ? '*' : undefined
  }

  if (!Array.isArray(path)) return undefined

  const parts: Array<string> = []
  for (const seg of path) {
    if (typeof seg === 'string') {
      if (isFieldPathSegment(seg)) parts.push(seg)
      continue
    }
  }

  if (parts.length === 0) return '*'
  return parts
}

export const mutateWithPatchPaths = <S>(
  base: S,
  mutator: (draft: S) => void,
): { readonly nextState: S; readonly patchPaths: ReadonlyArray<PatchPath | '*'> } => {
  const out = create(base, mutator as any, {
    enablePatches: {
      pathAsArray: true,
      arrayLengthAssignment: false,
    },
  }) as unknown

  if (!Array.isArray(out)) {
    return { nextState: out as S, patchPaths: [] }
  }

  const nextState = out[0] as S
  const patches = (out[1] ?? []) as Patches<{ pathAsArray: true; arrayLengthAssignment: false }>

  const dedup = new Map<string, PatchPath | '*'>()
  for (const patch of patches) {
    const p = toPatchFieldPath((patch as any)?.path)
    if (!p) continue
    const key = p === '*' ? '*' : JSON.stringify(p)
    if (!dedup.has(key)) dedup.set(key, p)
  }

  return {
    nextState,
    patchPaths: Array.from(dedup.values()),
  }
}
