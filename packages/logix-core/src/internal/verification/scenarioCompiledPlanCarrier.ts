// lifecycle: retained-harness for VOB-01 / PF-08.
// Exact final carrier placement and helper names remain under runtime/09 review.
import { Effect } from 'effect'
import type { RunId } from './runSession.js'

export interface ScenarioRunSession {
  readonly runId: RunId
}

export interface ScenarioCompiledStep {
  readonly stepId: string
  readonly run: (session: ScenarioRunSession) => Effect.Effect<void, unknown, unknown>
}

export interface ScenarioCompiledPlan {
  readonly planId: string
  readonly steps: ReadonlyArray<ScenarioCompiledStep>
}

export const makeScenarioRunSession = (args: { readonly runId: RunId }): ScenarioRunSession => ({
  runId: args.runId,
})

export const runScenarioCompiledPlan = (
  plan: ScenarioCompiledPlan,
  session: ScenarioRunSession,
): Effect.Effect<void, unknown, unknown> =>
  Effect.gen(function* () {
    for (const step of plan.steps) {
      yield* step.run(session)
    }
  })
