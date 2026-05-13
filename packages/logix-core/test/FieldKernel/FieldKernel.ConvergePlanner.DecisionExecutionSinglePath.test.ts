import { describe, expect, it } from '@effect/vitest'
import { Schema } from 'effect'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { makeFieldPathIdRegistry } from '../../src/internal/field-path.js'
import { dirtyRootIdsFromDirtyPlan, planConverge } from '../../src/internal/field-kernel/converge-planner.js'
import { makeConvergeExecIr } from '../../src/internal/field-kernel/converge-exec-ir.js'
import type { TxnDirtyPlanSnapshot } from '../../src/internal/runtime/core/StateTransaction.js'

describe('FieldKernel converge planner decision execution single path', () => {
  it('exposes canonical dirty roots from dirtyPlan for planner consumers', () => {
    const registry = makeFieldPathIdRegistry([['count']])
    const id = registry.pathStringToId!.get('count')!
    const dirtyPlan: TxnDirtyPlanSnapshot = {
      dirtyAll: false,
      rawPathIds: [id],
      rawKeyHash: 1,
      rawKeySize: 1,
      rootIds: Int32Array.from([id]),
      rootKeyHash: 1,
      rootCount: 1,
      authority: 'field-path-registry',
      fieldPathCount: registry.fieldPaths.length,
    }

    const dirty = dirtyRootIdsFromDirtyPlan(dirtyPlan)!
    expect(dirty.dirtyAll).toBe(false)
    expect(dirty.inputSource).toBe('dirtyPlan')
    expect(Array.from(dirty.rootIds)).toEqual([id])
    expect(dirty.rootCount).toBe(1)

    const dirtyWithLegacyDirtyAll = dirtyRootIdsFromDirtyPlan(dirtyPlan)!
    expect(dirtyWithLegacyDirtyAll.dirtyAll).toBe(false)
    expect(dirtyWithLegacyDirtyAll.inputSource).toBe('dirtyPlan')
  })

  it('returns executable dirty step ids and deferred reachable backlog from one planner result', () => {
    const State = Schema.Struct({
      a: Schema.Number,
      b: Schema.Number,
      i0: Schema.Number,
      d0: Schema.Number,
      d1: Schema.Number,
      d2: Schema.Number,
    })
    const program = FieldContracts.buildFieldProgram(
      State,
      FieldContracts.fieldFrom(State)({
        i0: FieldContracts.fieldComputed({
          deps: ['a'],
          get: (a) => a + 1,
          scheduling: 'immediate',
        }),
        d0: FieldContracts.fieldComputed({
          deps: ['i0'],
          get: (i0) => i0 + 1,
          scheduling: 'deferred',
        }),
        d1: FieldContracts.fieldComputed({
          deps: ['a'],
          get: (a) => a + 2,
          scheduling: 'deferred',
        }),
        d2: FieldContracts.fieldComputed({
          deps: ['b'],
          get: (b) => b + 3,
          scheduling: 'deferred',
        }),
      }),
    )
    const execIr = makeConvergeExecIr(program.convergeIr!)
    const registry = execIr.fieldPathIdRegistry
    const id = registry.pathStringToId!.get('a')!
    const dirtyPlan: TxnDirtyPlanSnapshot = {
      dirtyAll: false,
      rawPathIds: [id],
      rawKeyHash: 1,
      rawKeySize: 1,
      rootIds: Int32Array.from([id]),
      rootKeyHash: 1,
      rootCount: 1,
      authority: 'field-path-registry',
      fieldPathCount: registry.fieldPaths.length,
      fieldPathsKey: registry.fieldPathsKey,
    }
    const stepIdByLabel = new Map(execIr.stepLabelByStepId.map((label, stepId) => [label, stepId] as const))
    const i0StepId = stepIdByLabel.get('computed:i0')!
    const d0StepId = stepIdByLabel.get('computed:d0')!
    const d1StepId = stepIdByLabel.get('computed:d1')!

    const result = planConverge({
      execIr,
      dirtyPlan,
      requestedMode: 'dirty',
      schedulingScope: 'immediate',
      diagnosticsLevel: 'off',
      middlewareStackEmpty: true,
      resolvedMode: 'dirty',
      scopeStepIds: execIr.topoOrderImmediateInt32,
      scopeStepCount: 1,
      dirtyStepIds: Int32Array.from([i0StepId]),
      dirtyStepCount: 1,
      deferredStepIds: execIr.topoOrderDeferredInt32,
    })

    expect(result.mode).toBe('dirty')
    expect(result.dirtyInputSource).toBe('dirtyPlan')
    expect(Array.from(result.stepIds ?? [])).toEqual([i0StepId])
    expect(result.stepCount).toBe(1)
    expect(Array.from(result.deferredReachableStepIds ?? []).sort((a, b) => a - b)).toEqual([d0StepId, d1StepId].sort((a, b) => a - b))
    expect(result.deferredReachableStepIds?.length).toBeLessThan(execIr.topoOrderDeferredInt32.length)
  })
})
