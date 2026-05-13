import * as Logix from '@logixjs/core'
import { Effect, Schema } from 'effect'

const LiveBridgeModule = Logix.Module.make('LiveBridgeFixture', {
  state: Schema.Struct({
    count: Schema.Number,
  }),
  actions: {
    increment: Schema.Void,
  },
})

export const LiveBridgeProgram = Logix.Program.make(LiveBridgeModule, {
  initial: { count: 0 },
  logics: [
    LiveBridgeModule.logic('increment-handler', ($) => {
      return $.onAction('increment').run(() => $.state.update((state) => ({ count: state.count + 1 }))).pipe(
        Effect.asVoid,
      )
    }),
  ],
})

export const liveBridgeVerificationFixture = {
  id: 'agent-live-runtime-bridge',
  docs: 'specs/171-agent-live-runtime-bridge/spec.md',
  program: 'LiveBridgeProgram',
  target: {
    runtimeId: 'example-runtime',
    moduleId: 'LiveBridgeFixture',
    instanceId: 'default',
  },
  declaredActions: ['increment'],
  invalidDispatch: {
    actionTag: 'missing-action',
    expectedFacet: 'operation.denied',
    noMutation: true,
  },
  evidenceExport: {
    packageId: 'live-evidence:example-runtime',
    artifactOutputKeys: ['live-capture-1'],
  },
} as const
