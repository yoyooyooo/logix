// lifecycle: demoted-test-fixture for VOB-01 / PF-08.
// covers: PF-08, VOB-01.
// This evaluator must not write summary truth or own compare truth.
import type { EvidencePackage } from '../../../../src/internal/verification/evidence.js'
import { scenarioCarrierEvidenceFeedEventType } from '../../../../src/internal/verification/scenarioCarrierFeed.js'
import type { ScenarioFixture } from './scenarioCompiledPlanFixtureAdapter.js'

export const scenarioCarrierFeedExistsTarget =
  `evidence.events[${scenarioCarrierEvidenceFeedEventType}]` as const

export interface ScenarioExpectationCheck {
  readonly kind: 'exists'
  readonly target: string
  readonly passed: boolean
  readonly reason?: string
}

export interface ScenarioExpectationEvaluation {
  readonly kind: 'ScenarioExpectationEvaluation'
  readonly passed: boolean
  readonly checks: ReadonlyArray<ScenarioExpectationCheck>
}

const evaluateExistsTarget = (target: string, evidence: EvidencePackage): ScenarioExpectationCheck => {
  if (target !== scenarioCarrierFeedExistsTarget) {
    return {
      kind: 'exists',
      target,
      passed: false,
      reason: 'unsupported-target',
    }
  }

  return {
    kind: 'exists',
    target,
    passed: evidence.events.some((event) => event.type === scenarioCarrierEvidenceFeedEventType),
  }
}

export const evaluateScenarioFixtureExpectations = (
  fixture: ScenarioFixture,
  evidence: EvidencePackage,
): ScenarioExpectationEvaluation => {
  const checks = fixture.expect.map((expectation) => {
    switch (expectation.kind) {
      case 'exists':
        return evaluateExistsTarget(expectation.target, evidence)
    }
  })

  return {
    kind: 'ScenarioExpectationEvaluation',
    passed: checks.every((check) => check.passed),
    checks,
  }
}
