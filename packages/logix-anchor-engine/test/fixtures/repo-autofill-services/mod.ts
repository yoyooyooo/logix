import * as Logix from '@logixjs/core'
import { Effect, Schema } from 'effect'

import { SvcA, SvcB } from './service.js'

export const ModServicesMissing = Logix.Module.make('modServicesMissing', {
  state: Schema.Struct({}),
  actions: {},
})

export const Logic = ModServicesMissing.logic(($) =>
  Effect.gen(function* () {
    yield* $.use(SvcB)
    yield* $.use(SvcA)
    yield* $.use(SvcA)
  }),
)

export const WfSvc = Logix.Workflow.make({
  localId: 'wfSvc',
  trigger: { kind: 'action', actionTag: 'start' },
  steps: [
    Logix.Workflow.callById({ key: 'call.a', serviceId: 'svc/a', onSuccess: [], onFailure: [] }),
    Logix.Workflow.callById({ key: 'call.b', serviceId: 'svc/b', onSuccess: [], onFailure: [] }),
  ],
})

export const ModWorkflowOnly = Logix.Module.make('modWorkflowOnly', {
  state: Schema.Struct({}),
  actions: {},
}).withWorkflow(WfSvc)

