// lifecycle: demoted-test-fixture for VOB-01 / PF-08.
// covers: PF-08, VOB-01. This adapter proves one scenario path and must not become production compiler vocabulary.
import type {
  ScenarioCompiledPlan,
  ScenarioCompiledStep,
} from '../../../../src/internal/verification/scenarioCompiledPlanCarrier.js'
import {
  emitScenarioFormArtifactReasonLinkFixture,
  type ScenarioFormEvidenceSourceSeed,
} from './scenarioCarrierReasonLinkFixture.js'

export interface ScenarioFixtureReasonLinkStep {
  readonly kind: 'emitReasonLink'
  readonly stepId: string
  readonly state: {
    readonly $form?: {
      readonly submitAttempt?: {
        readonly reasonSlotId?: string
      }
    }
  }
  readonly listPath: string
  readonly rowId: string
  readonly fieldPath: string
  readonly formEvidenceContract: {
    readonly sources?: ReadonlyArray<ScenarioFormEvidenceSourceSeed>
  }
}

export type ScenarioFixtureStep = ScenarioFixtureReasonLinkStep

export interface ScenarioFixtureExistsExpectation {
  readonly kind: 'exists'
  readonly target: string
}

export type ScenarioFixtureExpectation = ScenarioFixtureExistsExpectation

export interface ScenarioFixture {
  readonly fixtureId: string
  readonly fixtures: {
    readonly env?: Record<string, unknown>
  }
  readonly steps: ReadonlyArray<ScenarioFixtureStep>
  readonly expect: ReadonlyArray<ScenarioFixtureExpectation>
}

const compileScenarioFixtureStep = (step: ScenarioFixtureStep): ScenarioCompiledStep => {
  switch (step.kind) {
    case 'emitReasonLink':
      return {
        stepId: step.stepId,
        run: () =>
          emitScenarioFormArtifactReasonLinkFixture({
            state: step.state,
            listPath: step.listPath,
            rowId: step.rowId,
            fieldPath: step.fieldPath,
            formEvidenceContract: step.formEvidenceContract,
          }),
      }
  }
}

export const compileScenarioFixtureToPlan = (fixture: ScenarioFixture): ScenarioCompiledPlan => ({
  planId: fixture.fixtureId,
  steps: fixture.steps.map((step) => compileScenarioFixtureStep(step)),
})
