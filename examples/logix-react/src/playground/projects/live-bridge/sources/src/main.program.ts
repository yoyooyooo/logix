import { Effect, Schema } from "effect"
import * as Logix from "@logixjs/core"

const LiveBridgeFixture = Logix.Module.make("LiveBridgeFixture", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
  reducers: {
    increment: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const target = {
  runtimeId: "example-runtime",
  moduleId: "LiveBridgeFixture",
  instanceId: "default",
} as const

export const Program = Logix.Program.make(LiveBridgeFixture, {
  initial: { count: 0 },
  logics: [],
})

export const main = (ctx: Logix.Runtime.ProgramRunContext<typeof LiveBridgeFixture.shape>) =>
  Effect.gen(function* () {
    yield* ctx.module.dispatch({ _tag: "increment", payload: undefined })
    const state = yield* ctx.module.getState
    const targetCoordinate = `runtime:${target.runtimeId}/module:${target.moduleId}/instance:${target.instanceId}`

    return {
      liveBridgeDogfood: true,
      count: state.count,
      targetCoordinate,
      declaredActions: ["increment"],
      operationFacet: {
        kind: "operation.denied",
        operationId: "dispatch:missing-action",
        operationKind: "dispatch.declaredAction",
        target,
        reason: "unavailable-action-contract",
        noMutation: true,
        binding: {
          manifestDigest: "runtime-manifest:dogfood",
          actionTag: "missing-action",
          bindingStatus: "missing",
        },
      },
      evidencePackage: {
        kind: "CanonicalEvidencePackage",
        packageId: "live-evidence:example-runtime",
        artifacts: [
          {
            outputKey: "live-capture-1",
            kind: "LiveCapture",
          },
        ],
      },
    }
  })
