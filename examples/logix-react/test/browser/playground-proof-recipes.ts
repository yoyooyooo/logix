import { strict as assert } from 'node:assert'
import type { Page } from 'playwright'
import type { PlaygroundProject } from '@logixjs/playground/Project'

export type ProofPackId =
  | 'run'
  | 'check'
  | 'checkFailure'
  | 'trialStartup'
  | 'trialFailure'
  | 'runFailure'
  | 'actions'
  | 'drivers'
  | 'scenarios'
  | 'serviceFiles'
  | 'pressureVisualCapacity'
  | 'runtimeEvidenceProbe'
  | 'gapHarvest'
  | 'renderIsolationProbe'
  | 'boundaryProbe'

export interface PlaygroundProofContext {
  readonly page: Page
  readonly baseUrl: string
  readonly project: PlaygroundProject
  readonly route: string
}

export interface PlaygroundRouteProofRecipe {
  readonly projectId: string
  readonly reportLabel: string
  readonly proofPackIds: ReadonlyArray<ProofPackId>
  readonly assertDemoProof?: (ctx: PlaygroundProofContext) => Promise<void>
}

export const logixReactPlaygroundProofRecipes = {
  'logix-react.new-project': {
    projectId: 'logix-react.new-project',
    reportLabel: 'new project minimal runtime chain',
    proofPackIds: ['run', 'check', 'trialStartup', 'runtimeEvidenceProbe', 'gapHarvest', 'boundaryProbe'],
  },
  'logix-react.local-counter': {
    projectId: 'logix-react.local-counter',
    reportLabel: 'local-counter runtime chain',
    proofPackIds: ['run', 'check', 'trialStartup', 'actions', 'drivers', 'scenarios', 'runtimeEvidenceProbe', 'gapHarvest', 'renderIsolationProbe', 'boundaryProbe'],
  },
  'logix-react.pressure.action-dense': {
    projectId: 'logix-react.pressure.action-dense',
    reportLabel: 'action density visual capacity',
    proofPackIds: ['actions', 'pressureVisualCapacity', 'runtimeEvidenceProbe', 'gapHarvest', 'renderIsolationProbe'],
  },
  'logix-react.pressure.state-large': {
    projectId: 'logix-react.pressure.state-large',
    reportLabel: 'state projection visual capacity',
    proofPackIds: ['pressureVisualCapacity', 'runtimeEvidenceProbe', 'gapHarvest'],
  },
  'logix-react.pressure.trace-heavy': {
    projectId: 'logix-react.pressure.trace-heavy',
    reportLabel: 'trace drawer visual capacity',
    proofPackIds: ['pressureVisualCapacity', 'runtimeEvidenceProbe', 'gapHarvest', 'renderIsolationProbe', 'boundaryProbe'],
  },
  'logix-react.pressure.diagnostics-dense': {
    projectId: 'logix-react.pressure.diagnostics-dense',
    reportLabel: 'diagnostics visual capacity',
    proofPackIds: ['check', 'trialStartup', 'pressureVisualCapacity', 'runtimeEvidenceProbe', 'gapHarvest', 'boundaryProbe'],
  },
  'logix-react.pressure.scenario-driver-payload': {
    projectId: 'logix-react.pressure.scenario-driver-payload',
    reportLabel: 'driver scenario payload visual capacity',
    proofPackIds: ['drivers', 'scenarios', 'pressureVisualCapacity', 'runtimeEvidenceProbe', 'gapHarvest'],
  },
  'logix-react.diagnostics.check-imports': {
    projectId: 'logix-react.diagnostics.check-imports',
    reportLabel: 'runtime.check import diagnostics',
    proofPackIds: ['checkFailure', 'boundaryProbe'],
  },
  'logix-react.diagnostics.trial-missing-config': {
    projectId: 'logix-react.diagnostics.trial-missing-config',
    reportLabel: 'runtime.trial missing config diagnostics',
    proofPackIds: ['check', 'trialFailure', 'boundaryProbe'],
  },
  'logix-react.diagnostics.trial-missing-service': {
    projectId: 'logix-react.diagnostics.trial-missing-service',
    reportLabel: 'runtime.trial missing service diagnostics',
    proofPackIds: ['check', 'trialFailure', 'boundaryProbe'],
  },
  'logix-react.diagnostics.trial-missing-import': {
    projectId: 'logix-react.diagnostics.trial-missing-import',
    reportLabel: 'runtime.trial missing Program import diagnostics',
    proofPackIds: ['check', 'trialFailure', 'boundaryProbe'],
  },
  'logix-react.diagnostics.run-null-value': {
    projectId: 'logix-react.diagnostics.run-null-value',
    reportLabel: 'Runtime.run null result diagnostics',
    proofPackIds: ['run', 'runtimeEvidenceProbe', 'gapHarvest', 'boundaryProbe'],
  },
  'logix-react.diagnostics.run-undefined-value': {
    projectId: 'logix-react.diagnostics.run-undefined-value',
    reportLabel: 'Runtime.run undefined result diagnostics',
    proofPackIds: ['run', 'runtimeEvidenceProbe', 'gapHarvest', 'boundaryProbe'],
  },
  'logix-react.diagnostics.run-failure': {
    projectId: 'logix-react.diagnostics.run-failure',
    reportLabel: 'Runtime.run failure diagnostics',
    proofPackIds: ['runFailure', 'gapHarvest', 'boundaryProbe'],
  },
  'logix-react.diagnostics.payload-validator-unavailable': {
    projectId: 'logix-react.diagnostics.payload-validator-unavailable',
    reportLabel: 'payload validator unavailable evidence gap diagnostics',
    proofPackIds: ['run', 'runtimeEvidenceProbe', 'gapHarvest', 'boundaryProbe'],
  },
  'logix-react.diagnostics.reflection-action-gap': {
    projectId: 'logix-react.diagnostics.reflection-action-gap',
    reportLabel: 'reflection action evidence gap diagnostics',
    proofPackIds: ['run', 'runtimeEvidenceProbe', 'gapHarvest', 'boundaryProbe'],
  },
  'logix-react.service-source': {
    projectId: 'logix-react.service-source',
    reportLabel: 'service source runtime chain',
    proofPackIds: ['run', 'check', 'trialStartup', 'serviceFiles', 'runtimeEvidenceProbe', 'gapHarvest', 'boundaryProbe'],
  },
} satisfies Record<string, PlaygroundRouteProofRecipe>

export const assertProofRecipeCoverage = (
  registry: ReadonlyArray<PlaygroundProject>,
  recipes: Record<string, PlaygroundRouteProofRecipe>,
): void => {
  const registryIds = registry.map((project) => project.id).sort()
  const recipeIds = Object.keys(recipes).sort()
  assert.deepEqual(recipeIds, registryIds, 'Playground dogfood proof recipes must exactly cover the registry project ids')

  for (const [projectId, recipe] of Object.entries(recipes)) {
    assert.equal(recipe.projectId, projectId, `recipe key and projectId must match for ${projectId}`)
    assert(recipe.reportLabel.length > 0, `recipe ${projectId} must expose a short report label`)
    assert(
      recipe.proofPackIds.includes('runtimeEvidenceProbe')
        || recipe.proofPackIds.includes('checkFailure')
        || recipe.proofPackIds.includes('trialFailure')
        || recipe.proofPackIds.includes('runFailure'),
      `recipe ${projectId} must include runtime evidence coverage`,
    )
    assert(
      recipe.proofPackIds.includes('gapHarvest')
        || recipe.proofPackIds.includes('checkFailure')
        || recipe.proofPackIds.includes('trialFailure')
        || recipe.proofPackIds.includes('runFailure'),
      `recipe ${projectId} must include gap harvest or failure diagnostics coverage`,
    )
  }
}
