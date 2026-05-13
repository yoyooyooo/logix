import { describe, expect, it } from '@effect/vitest'
import { makeFieldPathIdRegistry } from '../../src/internal/field-path.js'
import { planConverge } from '../../src/internal/field-kernel/converge-planner.js'
import { planConvergeFromLegacyDirtyInput } from '../../src/internal/field-kernel/converge-legacy-dirty-adapter.js'
import { makeConvergeExecIr } from '../../src/internal/field-kernel/converge-exec-ir.js'
import type { ConvergeExecIr } from '../../src/internal/field-kernel/converge-exec-ir.js'
import type { TxnDirtyPlanSnapshot } from '../../src/internal/runtime/core/StateTransaction.js'
import { Schema } from 'effect'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'

const makeFixture = (): {
  readonly execIr: ConvergeExecIr
  readonly aId: number
  readonly bId: number
  readonly aStepId: number
  readonly bStepId: number
} => {
  const State = Schema.Struct({
    a: Schema.Number,
    b: Schema.Number,
    outA: Schema.Number,
    outB: Schema.Number,
  })
  const program = FieldContracts.buildFieldProgram(
    State,
    FieldContracts.fieldFrom(State)({
      outA: FieldContracts.fieldComputed({
        deps: ['a'],
        get: (a) => a + 1,
      }),
      outB: FieldContracts.fieldComputed({
        deps: ['b'],
        get: (b) => b + 1,
      }),
    }),
  )
  const execIr = makeConvergeExecIr(program.convergeIr!)
  const registry = execIr.fieldPathIdRegistry
  const aId = registry.pathStringToId!.get('a')!
  const bId = registry.pathStringToId!.get('b')!
  const stepIdByLabel = new Map(execIr.stepLabelByStepId.map((label, stepId) => [label, stepId] as const))
  return {
    execIr,
    aId,
    bId,
    aStepId: stepIdByLabel.get('computed:outA')!,
    bStepId: stepIdByLabel.get('computed:outB')!,
  }
}

const makeDirtyPlan = (id: number, fieldPathCount: number): TxnDirtyPlanSnapshot => ({
  dirtyAll: false,
  rawPathIds: [id],
  rawKeyHash: id,
  rawKeySize: 1,
  rootIds: Int32Array.from([id]),
  rootKeyHash: id,
  rootCount: 1,
  authority: 'field-path-registry',
  fieldPathCount,
})

describe('FieldKernel converge planner legacy dirty input guard', () => {
  it('normal planner keeps dirtyPlan authoritative over conflicting legacy dirty-all input', () => {
    const { execIr, aId, aStepId } = makeFixture()
    const dirtyPlan = makeDirtyPlan(aId, execIr.fieldPathsById.length)

    const result = planConverge({
      execIr,
      dirtyPlan,
      requestedMode: 'dirty',
      schedulingScope: 'all',
      diagnosticsLevel: 'off',
      middlewareStackEmpty: true,
      resolvedMode: 'dirty',
      dirtyStepIds: Int32Array.from([aStepId]),
      dirtyStepCount: 1,
    })

    expect(result.mode).toBe('dirty')
    expect(result.dirtyInputSource).toBe('dirtyPlan')
    expect(result.reason).toBe('dirty_sparse')
    expect(Array.from(result.stepIds ?? [])).toEqual([aStepId])
  })

  it('legacy adapter is the only path where raw dirty paths drive planner input', () => {
    const { execIr, bId, bStepId } = makeFixture()

    const result = planConvergeFromLegacyDirtyInput({
      execIr,
      dirtyPaths: new Set([bId]),
      requestedMode: 'dirty',
      schedulingScope: 'all',
      diagnosticsLevel: 'off',
      middlewareStackEmpty: true,
      resolvedMode: 'dirty',
      dirtyStepIds: Int32Array.from([bStepId]),
      dirtyStepCount: 1,
    })

    expect(result.mode).toBe('dirty')
    expect(result.dirtyInputSource).toBe('legacyDirtyPaths')
    expect(Array.from(result.stepIds ?? [])).toEqual([bStepId])
  })

  it('adapter keeps exact-empty dirtyPlan authoritative over non-empty legacy dirty paths', () => {
    const registry = makeFieldPathIdRegistry([['a'], ['b']])
    const dirtyPlan: TxnDirtyPlanSnapshot = {
      dirtyAll: false,
      rawPathIds: [],
      rawKeyHash: 0,
      rawKeySize: 0,
      rootIds: new Int32Array(0),
      rootKeyHash: 0,
      rootCount: 0,
      authority: 'field-path-registry',
      fieldPathCount: registry.fieldPaths.length,
    }
    const { execIr, bId, bStepId } = makeFixture()

    const result = planConvergeFromLegacyDirtyInput({
      execIr,
      dirtyPlan,
      dirtyPaths: new Set([bId]),
      requestedMode: 'dirty',
      schedulingScope: 'all',
      diagnosticsLevel: 'off',
      middlewareStackEmpty: true,
      resolvedMode: 'noop',
      dirtyStepIds: Int32Array.from([bStepId]),
      dirtyStepCount: 1,
    })

    expect(result.mode).toBe('noop')
    expect(result.dirtyInputSource).toBe('dirtyPlan')
    expect(result.stepCount).toBe(0)
  })
})
