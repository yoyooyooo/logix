import * as Logix from '@logixjs/core'

export const W1 = Logix.Workflow.make({
  localId: 'W1',
  trigger: { kind: 'action', actionTag: 'ok' },
  steps: [
    Logix.Workflow.callById({ key: 'call1', serviceId: 'svc/one', onSuccess: [], onFailure: [] }),
    // @ts-expect-error fixture: missing stepKey (used to validate autofill)
    Logix.Workflow.dispatch({ actionTag: 'missingKey' }),
    Logix.Workflow.dispatch({ key: 'dup', actionTag: 'a' }),
    Logix.Workflow.delay({ key: 'dup', ms: 1 }),
  ],
})
