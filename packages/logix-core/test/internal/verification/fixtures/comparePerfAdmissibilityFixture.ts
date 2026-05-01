// lifecycle: demoted-test-fixture for VOB-02 / PF-09.
// covers: PF-09, VOB-02.
// This helper proves admissibility digests without productizing root compare truth.
import type { EvidencePackage } from '../../../../src/internal/verification/evidence.js'
import type { ScenarioCompiledPlan } from '../../../../src/internal/verification/scenarioCompiledPlanCarrier.js'
import type { ScenarioFixture } from './scenarioCompiledPlanFixtureAdapter.js'

export interface ComparePerfAdmissibilityInput {
  readonly plan: ScenarioCompiledPlan
  readonly fixture: ScenarioFixture
  readonly evidence: EvidencePackage
  readonly environment: {
    readonly host: string
    readonly profile?: string
  }
}

export interface ComparePerfAdmissibilityEvidence {
  readonly kind: 'ComparePerfAdmissibilityEvidence'
  readonly compiledPlanDigest: string
  readonly fixtureIdentityDigest: string
  readonly evidenceDigest: string
  readonly environmentFingerprint: string
  readonly correctnessVerdict: 'not-owned'
}

const stableJson = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
    .join(',')}}`
}

const digest = (prefix: string, value: unknown): string => `${prefix}:${stableJson(value)}`

export const makeComparePerfAdmissibilityEvidence = (
  input: ComparePerfAdmissibilityInput,
): ComparePerfAdmissibilityEvidence => ({
  kind: 'ComparePerfAdmissibilityEvidence',
  compiledPlanDigest: digest('compiledPlan', {
    planId: input.plan.planId,
    steps: input.plan.steps.map((step) => step.stepId),
  }),
  fixtureIdentityDigest: digest('fixtureIdentity', {
    fixtureId: input.fixture.fixtureId,
    fixtures: input.fixture.fixtures,
    expect: input.fixture.expect,
  }),
  evidenceDigest: digest('evidence', {
    runId: input.evidence.runId,
    events: input.evidence.events.map((event) => ({
      type: event.type,
      payload: event.payload,
    })),
  }),
  environmentFingerprint: digest('environment', input.environment),
  correctnessVerdict: 'not-owned',
})
