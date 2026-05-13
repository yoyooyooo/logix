import { describe, expect, it } from '@effect/vitest'
import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'

describe('runtime operation event law', () => {
  it('projects accepted and completed dispatch operation events from stable coordinates', () => {
    const accepted = CoreReflection.createOperationAcceptedEvent({
      operationKind: 'dispatch',
      instanceId: 'counter:r1',
      txnSeq: 3,
      opSeq: 7,
      actionTag: 'setCount',
      attachmentRefs: [
        { kind: 'state', ref: 'artifact://state-after', digest: 'sha256:state' },
        { kind: 'trace', ref: 'artifact://trace', digest: 'sha256:trace' },
      ],
    })
    const completed = CoreReflection.createOperationCompletedEvent({
      operationKind: 'dispatch',
      instanceId: 'counter:r1',
      txnSeq: 3,
      opSeq: 7,
      actionTag: 'setCount',
      message: 'dispatch completed',
    })

    expect(accepted).toMatchObject({
      name: 'operation.accepted',
      eventId: 'counter:r1::t3::o7::operation.accepted',
      operationKind: 'dispatch',
      instanceId: 'counter:r1',
      txnSeq: 3,
      opSeq: 7,
      actionTag: 'setCount',
      timestampMode: 'omitted',
    })
    expect(accepted.attachmentRefs).toEqual([
      { kind: 'state', ref: 'artifact://state-after', digest: 'sha256:state' },
      { kind: 'trace', ref: 'artifact://trace', digest: 'sha256:trace' },
    ])
    expect(completed.name).toBe('operation.completed')
    expect(completed.eventId).toBe('counter:r1::t3::o7::operation.completed')
  })

  it('projects failure and evidence gap without Playground session types', () => {
    const failed = CoreReflection.createOperationFailedEvent({
      operationKind: 'trial',
      instanceId: 'runtime.check',
      txnSeq: 0,
      opSeq: 1,
      failure: {
        code: 'TRIAL_FAILED',
        message: 'startup failed',
      },
    })
    const gap = CoreReflection.createRuntimeOperationEvidenceGap({
      instanceId: 'runtime.check',
      txnSeq: 0,
      opSeq: 1,
      message: 'missing source coordinate',
      code: 'missing-source-coordinate',
    })

    expect(failed).toMatchObject({
      name: 'operation.failed',
      operationKind: 'trial',
      failure: {
        code: 'TRIAL_FAILED',
        message: 'startup failed',
      },
    })
    expect(gap).toMatchObject({
      name: 'evidence.gap',
      code: 'missing-source-coordinate',
      message: 'missing source coordinate',
    })
    expect(JSON.stringify([failed, gap])).not.toMatch(/ProjectSnapshot|ProgramSessionState|logix-playground/)
  })

  it('uses operationKind instead of growing event families', () => {
    const names = CoreReflection.RUNTIME_OPERATION_EVENT_NAMES
    expect(names).toEqual(['operation.accepted', 'operation.completed', 'operation.failed', 'evidence.gap'])
    expect(CoreReflection.RUNTIME_OPERATION_KINDS).toEqual(['dispatch', 'run', 'check', 'trial'])
  })

  it('projects existing runtime debug refs into operation law events', () => {
    const actionRef = {
      eventId: 'fixture:i1::e1',
      eventSeq: 1,
      moduleId: 'Counter',
      instanceId: 'fixture:i1',
      txnSeq: 2,
      kind: 'action',
      label: 'setCount',
      timestamp: 1,
      meta: { actionTag: 'setCount' },
    }
    const failedRef = {
      eventId: 'fixture:i1::e2',
      eventSeq: 2,
      moduleId: 'Counter',
      instanceId: 'fixture:i1',
      txnSeq: 2,
      kind: 'lifecycle',
      label: 'lifecycle:error',
      timestamp: 2,
      errorSummary: { code: 'boom', message: 'failed' },
    }

    expect(CoreReflection.projectRuntimeDebugRefToOperationEvents(actionRef, { operationKind: 'dispatch', opSeq: 1 })).toEqual([
      {
        name: 'operation.accepted',
        eventId: 'fixture:i1::t2::o1::operation.accepted',
        operationKind: 'dispatch',
        instanceId: 'fixture:i1',
        txnSeq: 2,
        opSeq: 1,
        actionTag: 'setCount',
        timestampMode: 'omitted',
        attachmentRefs: [],
      },
      {
        name: 'operation.completed',
        eventId: 'fixture:i1::t2::o1::operation.completed',
        operationKind: 'dispatch',
        instanceId: 'fixture:i1',
        txnSeq: 2,
        opSeq: 1,
        actionTag: 'setCount',
        timestampMode: 'omitted',
        attachmentRefs: [],
      },
    ])

    expect(CoreReflection.projectRuntimeDebugRefToOperationEvents(failedRef, { operationKind: 'run', opSeq: 2 })).toEqual([
      {
        name: 'operation.failed',
        eventId: 'fixture:i1::t2::o2::operation.failed',
        operationKind: 'run',
        instanceId: 'fixture:i1',
        txnSeq: 2,
        opSeq: 2,
        timestampMode: 'omitted',
        attachmentRefs: [],
        failure: { code: 'boom', message: 'failed' },
      },
    ])

    expect(CoreReflection.projectRuntimeDebugRefToOperationEvents({ kind: 'state', label: 'state:update' }, { operationKind: 'dispatch' })).toEqual([
      {
        name: 'evidence.gap',
        eventId: 'unknown::t0::o0::evidence.gap',
        operationKind: 'dispatch',
        instanceId: 'unknown',
        txnSeq: 0,
        opSeq: 0,
        message: 'Runtime debug ref is missing stable operation coordinate.',
        timestampMode: 'omitted',
        attachmentRefs: [],
        code: 'missing-operation-coordinate',
      },
    ])
  })
})
