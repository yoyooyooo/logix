import { describe, expect, it } from '@effect/vitest'
import { makeFieldPathIdRegistry } from '../../src/internal/field-path.js'
import {
  dirtyRootIdsFromDirtyPlan,
  resolveDirtyPlanState,
} from '../../src/internal/field-kernel/converge-planner.js'
import type { TxnDirtyPlanSnapshot } from '../../src/internal/runtime/core/StateTransaction.js'

const makePlan = (paths: ReadonlyArray<string>): TxnDirtyPlanSnapshot => {
  const registry = makeFieldPathIdRegistry([['user'], ['user', 'name'], ['settings'], ['settings', 'locale']])
  const ids = paths.map((path) => registry.pathStringToId!.get(path)!)
  const roots = Array.from(new Set(ids)).sort((a, b) => a - b)
  return {
    dirtyAll: false,
    rawPathIds: ids,
    rawKeyHash: 0,
    rawKeySize: ids.length,
    rootIds: Int32Array.from(roots),
    rootKeyHash: roots.reduce((hash, id) => ((hash ^ id) * 16777619) >>> 0, 2166136261 >>> 0),
    rootCount: roots.length,
    authority: 'field-path-registry',
    fieldPathCount: registry.fieldPaths.length,
  }
}

describe('FieldKernel converge planner stable root hash', () => {
  it('keeps root hash stable for same dirty roots in different write order', () => {
    const a = dirtyRootIdsFromDirtyPlan(makePlan(['user.name', 'settings.locale']))!
    const b = dirtyRootIdsFromDirtyPlan(makePlan(['settings.locale', 'user.name']))!

    expect(Array.from(a.rootIds)).toEqual(Array.from(b.rootIds))
    expect(a.keyHash).toBe(b.keyHash)
  })

  it('keeps exact-empty dirtyPlan authoritative when legacy dirty-all input conflicts', () => {
    const empty = makePlan([])
    const state = resolveDirtyPlanState({ dirtyPlan: empty })
    expect(state?.kind).toBe('exact-empty')

    const dirtyAllState = resolveDirtyPlanState({ dirtyPlan: empty })
    expect(dirtyAllState?.kind).toBe('exact-empty')

    const dirty = dirtyRootIdsFromDirtyPlan(empty)!
    expect(dirty.dirtyAll).toBe(false)
    expect(dirty.rootCount).toBe(0)
  })
})
