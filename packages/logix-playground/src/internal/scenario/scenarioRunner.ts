import type { ProgramSessionAction } from '../session/programSession.js'
import type { InteractionDriver } from '../driver/driverModel.js'
import { resolveDriverAction } from '../driver/driverRunner.js'
import type {
  ScenarioExecutionResult,
  ScenarioFailureKind,
  ScenarioPlayback,
  ScenarioProductFailure,
  ScenarioReadTarget,
  ScenarioStep,
  ScenarioStepResult,
} from './scenarioModel.js'

export interface ScenarioRunnerInput {
  readonly scenario: ScenarioPlayback
  readonly scenarioRunId: string
  readonly drivers: ReadonlyArray<InteractionDriver>
  readonly dispatchAction?: (action: ProgramSessionAction) => Promise<void> | void
  readonly settle?: () => Promise<void> | void
  readonly read?: (target: ScenarioReadTarget) => unknown
  readonly now?: () => number
}

const defaultNow = (): number => Date.now()

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms))
  })

const withTimeout = async (
  operation: Promise<void> | void,
  timeoutMs: number,
): Promise<void> => {
  await Promise.race([
    Promise.resolve(operation),
    delay(timeoutMs).then(() => {
      throw new Error(`Scenario step timed out after ${timeoutMs}ms`)
    }),
  ])
}

const makeFailure = (
  kind: ScenarioFailureKind,
  stepId: string,
  message: string,
): ScenarioProductFailure => ({
  kind,
  classification: 'product-failure',
  stepId,
  message,
})

const valuesEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right)

const assertExpectation = (
  step: Extract<ScenarioStep, { readonly kind: 'expect' }>,
  value: unknown,
): void => {
  if (step.assertion === 'exists') {
    if (value === undefined || value === null) {
      throw new Error(`Expected ${step.target} to exist`)
    }
    return
  }
  if (step.assertion === 'changed') {
    if (value === undefined || value === null) {
      throw new Error(`Expected ${step.target} to be changed`)
    }
    return
  }
  if (!valuesEqual(value, step.value)) {
    throw new Error(`Expected ${step.target} to equal ${JSON.stringify(step.value)}`)
  }
}

const resolveScenarioDriverAction = (
  step: Extract<ScenarioStep, { readonly kind: 'driver' }>,
  driver: InteractionDriver,
): ProgramSessionAction => {
  const resolved = resolveDriverAction(driver, step.exampleId)
  if ('payload' in step) {
    return { ...resolved, payload: step.payload }
  }
  return resolved
}

const runStep = async (
  step: ScenarioStep,
  input: ScenarioRunnerInput,
): Promise<unknown> => {
  if (step.kind === 'driver') {
    const driver = input.drivers.find((candidate) => candidate.id === step.driverId)
    if (!driver) {
      throw makeFailure('scenario-driver', step.id, `Scenario driver not found: ${step.driverId}`)
    }
    await input.dispatchAction?.(resolveScenarioDriverAction(step, driver))
    return { driverId: driver.id, actionTag: driver.actionTag }
  }

  if (step.kind === 'wait') {
    await delay(step.timeoutMs)
    return { timeoutMs: step.timeoutMs }
  }

  if (step.kind === 'settle') {
    await withTimeout(input.settle?.(), step.timeoutMs)
    return { timeoutMs: step.timeoutMs }
  }

  if (step.kind === 'observe') {
    return { target: step.target, value: input.read?.(step.target) }
  }

  const value = input.read?.(step.target)
  assertExpectation(step, value)
  return { target: step.target, value }
}

const coerceFailure = (
  error: unknown,
  step: ScenarioStep,
): ScenarioProductFailure => {
  if (typeof error === 'object' && error !== null && 'classification' in error && 'kind' in error && 'message' in error) {
    return error as ScenarioProductFailure
  }
  if ((step.kind === 'wait' || step.kind === 'settle') && error instanceof Error && error.message.includes('timed out')) {
    return makeFailure('scenario-timeout', step.id, error.message)
  }
  if (step.kind === 'expect') {
    return makeFailure('scenario-expectation', step.id, error instanceof Error ? error.message : String(error))
  }
  return makeFailure('scenario-runtime', step.id, error instanceof Error ? error.message : String(error))
}

export const runScenario = async (
  input: ScenarioRunnerInput,
): Promise<ScenarioExecutionResult> => {
  const now = input.now ?? defaultNow
  const startedAt = now()
  const stepResults: Array<ScenarioStepResult> = []

  for (const step of input.scenario.steps) {
    const stepStartedAt = now()
    try {
      const result = await runStep(step, input)
      stepResults.push({
        stepId: step.id,
        kind: step.kind,
        status: 'passed',
        durationMs: Math.max(0, now() - stepStartedAt),
        result,
      })
    } catch (error) {
      const failure = coerceFailure(error, step)
      stepResults.push({
        stepId: step.id,
        kind: step.kind,
        status: 'failed',
        durationMs: Math.max(0, now() - stepStartedAt),
        failure,
      })
      return {
        status: 'failed',
        scenarioRunId: input.scenarioRunId,
        scenarioId: input.scenario.id,
        durationMs: Math.max(0, now() - startedAt),
        stepResults,
        failure,
      }
    }
  }

  return {
    status: 'passed',
    scenarioRunId: input.scenarioRunId,
    scenarioId: input.scenario.id,
    durationMs: Math.max(0, now() - startedAt),
    stepResults,
  }
}
