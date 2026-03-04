import { create, type Patches } from 'mutative'
import type { FieldPath } from '../../field-path.js'
import { isFieldPathSegment, toKey } from '../../field-path.js'

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

  // Fast path: patch path is already a pure string FieldPath (common case for flat object writes).
  let allValidString = true
  for (let i = 0; i < path.length; i++) {
    const seg = path[i]
    if (typeof seg !== 'string' || !isFieldPathSegment(seg)) {
      allValidString = false
      break
    }
  }
  if (allValidString) return path as PatchPath

  // Structural path: keep only valid string segments (drop indices / invalid parts).
  const parts: Array<string> = []
  for (let i = 0; i < path.length; i++) {
    const seg = path[i]
    if (typeof seg !== 'string') continue
    if (isFieldPathSegment(seg)) parts.push(seg)
  }

  return parts.length === 0 ? '*' : parts
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

  // Large patch bursts (e.g. reducers mutating hundreds/thousands of flat fields) are typically prefix-free and
  // already unique. In this case, string-key dedup becomes pure overhead and can cause GC jitter in perf workloads.
  // We keep only the '*' guard and let downstream dirty-set tracking handle any rare duplicates.
  if (patches.length > 256) {
    let sawStar = false
    const patchPaths: Array<PatchPath | '*'> = []
    for (let i = 0; i < patches.length; i++) {
      const patch = patches[i]
      const p = toPatchFieldPath((patch as any)?.path)
      if (!p) continue
      if (p === '*') {
        if (sawStar) continue
        sawStar = true
      }
      patchPaths.push(p)
    }
    return {
      nextState,
      patchPaths,
    }
  }

  // Perf note:
  // - Avoid JSON.stringify-based dedup keys (alloc-heavy, can cause GC spikes in perf workloads).
  // - Use segment keys for single-segment paths; fall back to a stable toKey() digest for multi-segment paths.
  let sawStar = false
  const singleSeg = new Set<string>()
  const multiSeg = new Set<string>()
  const patchPaths: Array<PatchPath | '*'> = []

  for (let i = 0; i < patches.length; i++) {
    const patch = patches[i]
    const p = toPatchFieldPath((patch as any)?.path)
    if (!p) continue

    if (p === '*') {
      if (sawStar) continue
      sawStar = true
      patchPaths.push(p)
      continue
    }

    if (p.length === 1) {
      const seg = p[0]!
      if (singleSeg.has(seg)) continue
      singleSeg.add(seg)
      patchPaths.push(p)
      continue
    }

    const key = toKey(p)
    if (multiSeg.has(key)) continue
    multiSeg.add(key)
    patchPaths.push(p)
  }

  return {
    nextState,
    patchPaths,
  }
}
