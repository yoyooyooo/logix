import * as Logix from '@logixjs/core'

export const WStepKey = Logix.Workflow.make({
  localId: 'WStepKey',
  trigger: { kind: 'action', actionTag: 'start' },
  steps: [
    // @ts-expect-error fixture: missing stepKey (used to validate autofill)
    Logix.Workflow.dispatch({ actionTag: 'a' }),
    // @ts-expect-error fixture: missing stepKey (used to validate autofill)
    Logix.Workflow.dispatch({ actionTag: 'a' }),
    // @ts-expect-error fixture: missing stepKey (used to validate autofill)
    Logix.Workflow.callById({ serviceId: 'svc/one', onSuccess: [], onFailure: [] }),
    // @ts-expect-error fixture: missing stepKey (used to validate autofill)
    Logix.Workflow.delay({ ms: 10 }),
  ],
})
