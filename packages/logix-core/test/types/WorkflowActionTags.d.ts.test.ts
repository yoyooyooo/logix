import * as Logix from '../../src/index.js'
import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'

const State = Schema.Struct({ value: Schema.Number })

const M = Logix.Module.make('Types.WorkflowActionTags', {
  state: State,
  actions: {
    start: Schema.Void,
    done: Schema.Void,
  } as const,
})

describe('types: Workflow actionTag', () => {
  it('compiles', () => {
    Logix.Workflow.make<typeof M>({
      localId: 'w1',
      trigger: Logix.Workflow.onAction('start'),
      steps: [
        Logix.Workflow.dispatch({
          key: 's1',
          actionTag: 'done',
        }),
      ],
    })

    // @ts-expect-error unknown actionTag should be rejected when Module type is provided
    Logix.Workflow.make<typeof M>({
      localId: 'w2',
      trigger: Logix.Workflow.onAction('missing'),
      steps: [],
    })

    const W = Logix.Workflow.forModule(M)

    W.make({
      localId: 'w3',
      trigger: W.onAction('start'),
      steps: [
        W.dispatch({
          key: 's1',
          actionTag: 'done',
        }),
      ],
    })

    // @ts-expect-error unknown actionTag should be rejected on bound DSL
    W.onAction('missing')

    expect(true).toBe(true)
  })
})

