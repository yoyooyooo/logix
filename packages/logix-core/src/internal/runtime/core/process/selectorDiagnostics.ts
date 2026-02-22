export type SelectorDiagnosticsState = {
  readonly windowStartedMs: number
  readonly triggersInWindow: number
  readonly lastWarningAtMs: number
}

export type SelectorWarningDecision = {
  readonly shouldWarn: boolean
  readonly tooFrequent: boolean
  readonly tooSlow: boolean
  readonly triggersInWindow: number
}

export type SelectorDiagnosticsSampling = {
  readonly calls: number
  readonly sampled: number
  readonly slowSamples: number
  readonly maxSampleMs: number
}

export type SelectorDiagnosticsConfig = {
  readonly sampleEveryMask: number
  readonly slowSampleThresholdMs: number
  readonly triggerWindowMs: number
  readonly triggerWarningThreshold: number
  readonly warningCooldownMs: number
}

type SelectorWarningEvaluationOptions = {
  readonly config: SelectorDiagnosticsConfig
  readonly sampling: Pick<SelectorDiagnosticsSampling, 'sampled' | 'maxSampleMs'>
}

type SelectorWarningHintOptions = {
  readonly moduleId: string
  readonly path: string
  readonly decision: SelectorWarningDecision
  readonly config: SelectorDiagnosticsConfig
  readonly sampling: SelectorDiagnosticsSampling
}

export const makeSelectorDiagnosticsConfig = (isDevEnv: boolean): SelectorDiagnosticsConfig => ({
  sampleEveryMask: 0x7f, // sample every 128 calls
  slowSampleThresholdMs: 4,
  triggerWindowMs: 1000,
  triggerWarningThreshold: isDevEnv ? 20 : 200,
  warningCooldownMs: 30_000,
})

export const initialSelectorDiagnosticsState = (now: number): SelectorDiagnosticsState => ({
  windowStartedMs: now,
  triggersInWindow: 0,
  lastWarningAtMs: 0,
})

export const evaluateSelectorWarning = (
  state: SelectorDiagnosticsState,
  now: number,
  options: SelectorWarningEvaluationOptions,
): readonly [SelectorWarningDecision, SelectorDiagnosticsState] => {
  const { config, sampling } = options
  const windowExpired = now - state.windowStartedMs >= config.triggerWindowMs
  const windowStartedMs = windowExpired ? now : state.windowStartedMs
  const triggersInWindow = windowExpired ? 1 : state.triggersInWindow + 1

  const shouldCooldown = now - state.lastWarningAtMs < config.warningCooldownMs
  const tooFrequent = triggersInWindow >= config.triggerWarningThreshold
  const tooSlow = sampling.maxSampleMs >= config.slowSampleThresholdMs && sampling.sampled > 0
  const shouldWarn = !shouldCooldown && (tooFrequent || tooSlow)

  const next: SelectorDiagnosticsState = shouldWarn
    ? {
        windowStartedMs: now,
        triggersInWindow: 0,
        lastWarningAtMs: now,
      }
    : {
        ...state,
        windowStartedMs,
        triggersInWindow,
      }

  return [
    {
      shouldWarn,
      tooFrequent,
      tooSlow,
      triggersInWindow,
    },
    next,
  ] as const
}

export const buildSelectorWarningHint = (options: SelectorWarningHintOptions): string => {
  const { moduleId, path, decision, config, sampling } = options
  return [
    `moduleId=${moduleId}`,
    `path=${path}`,
    `windowMs=${config.triggerWindowMs}`,
    `triggersInWindow=${decision.triggersInWindow}`,
    `threshold=${config.triggerWarningThreshold}`,
    `cooldownMs=${config.warningCooldownMs}`,
    '',
    'selector sampling:',
    `calls=${sampling.calls}`,
    `sampled=${sampling.sampled}`,
    `slowSamples(>=${config.slowSampleThresholdMs}ms)=${sampling.slowSamples}`,
    `maxSampleMs=${sampling.maxSampleMs.toFixed(2)}`,
    '',
    'notes:',
    '- Ensure the selected value is stable (prefer primitive/tuple; avoid returning fresh objects).',
    '- Narrow the path to reduce change frequency; avoid selecting large objects.',
  ].join('\n')
}
