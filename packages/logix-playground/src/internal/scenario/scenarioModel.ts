import type {
  PlaygroundScenario,
  PlaygroundScenarioReadTarget,
  PlaygroundScenarioStep,
} from '../../Project.js'

export type ScenarioPlayback = PlaygroundScenario
export type ScenarioStep = PlaygroundScenarioStep
export type ScenarioReadTarget = PlaygroundScenarioReadTarget

export type ScenarioStepStatus = 'pending' | 'running' | 'passed' | 'failed'

export type ScenarioFailureKind =
  | 'scenario-driver'
  | 'scenario-timeout'
  | 'scenario-expectation'
  | 'scenario-runtime'

export interface ScenarioProductFailure {
  readonly kind: ScenarioFailureKind
  readonly classification: 'product-failure'
  readonly message: string
  readonly stepId: string
}

export interface ScenarioStepResult {
  readonly stepId: string
  readonly kind: ScenarioStep['kind']
  readonly status: ScenarioStepStatus
  readonly durationMs: number
  readonly result?: unknown
  readonly failure?: ScenarioProductFailure
}

export type ScenarioExecutionState =
  | { readonly status: 'idle'; readonly stepResults: ReadonlyArray<ScenarioStepResult> }
  | {
      readonly status: 'running'
      readonly scenarioRunId: string
      readonly scenarioId: string
      readonly stepResults: ReadonlyArray<ScenarioStepResult>
    }
  | {
      readonly status: 'passed'
      readonly scenarioRunId: string
      readonly scenarioId: string
      readonly durationMs: number
      readonly stepResults: ReadonlyArray<ScenarioStepResult>
    }
  | {
      readonly status: 'failed'
      readonly scenarioRunId: string
      readonly scenarioId: string
      readonly durationMs: number
      readonly stepResults: ReadonlyArray<ScenarioStepResult>
      readonly failure: ScenarioProductFailure
    }

export interface ScenarioExecutionResult {
  readonly status: 'passed' | 'failed'
  readonly scenarioRunId: string
  readonly scenarioId: string
  readonly durationMs: number
  readonly stepResults: ReadonlyArray<ScenarioStepResult>
  readonly failure?: ScenarioProductFailure
}
