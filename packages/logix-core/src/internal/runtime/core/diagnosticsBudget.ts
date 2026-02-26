export const DIAGNOSTICS_BUDGET_CONTRACT_V1 = 'diagnostics_budget.v1' as const

export type RunBudgetDomain = 'process' | 'workflow' | 'flow'

export type RunBudgetEnvelopeV1 = {
  readonly contract: typeof DIAGNOSTICS_BUDGET_CONTRACT_V1
  readonly domain: RunBudgetDomain
  readonly runId: string
  readonly limits?: {
    readonly maxEvents?: number
    readonly maxBytes?: number
  }
  readonly usage?: {
    readonly emitted?: number
    readonly dropped?: number
    readonly downgraded?: number
  }
}

export type RunDegradeReasonV1 =
  | 'budget_exceeded'
  | 'payload_oversized'
  | 'payload_non_serializable'
  | 'observer_disabled'
  | 'sampled_out'
  | 'unknown'

export type RunDegradeMarkerV1 = {
  readonly contract: typeof DIAGNOSTICS_BUDGET_CONTRACT_V1
  readonly degraded: boolean
  readonly reason?: RunDegradeReasonV1
}

const normalizePositiveInteger = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined
  return Math.floor(value)
}

export const makeRunBudgetEnvelopeV1 = (args: {
  readonly domain: RunBudgetDomain
  readonly runId: string
  readonly limits?: {
    readonly maxEvents?: number
    readonly maxBytes?: number
  }
  readonly usage?: {
    readonly emitted?: number
    readonly dropped?: number
    readonly downgraded?: number
  }
}): RunBudgetEnvelopeV1 => {
  const maxEvents = normalizePositiveInteger(args.limits?.maxEvents)
  const maxBytes = normalizePositiveInteger(args.limits?.maxBytes)
  const emitted = normalizePositiveInteger(args.usage?.emitted)
  const dropped = normalizePositiveInteger(args.usage?.dropped)
  const downgraded = normalizePositiveInteger(args.usage?.downgraded)

  return {
    contract: DIAGNOSTICS_BUDGET_CONTRACT_V1,
    domain: args.domain,
    runId: args.runId,
    ...((maxEvents !== undefined || maxBytes !== undefined
      ? {
          limits: {
            ...(maxEvents !== undefined ? { maxEvents } : null),
            ...(maxBytes !== undefined ? { maxBytes } : null),
          },
        }
      : null) as object),
    ...((emitted !== undefined || dropped !== undefined || downgraded !== undefined
      ? {
          usage: {
            ...(emitted !== undefined ? { emitted } : null),
            ...(dropped !== undefined ? { dropped } : null),
            ...(downgraded !== undefined ? { downgraded } : null),
          },
        }
      : null) as object),
  } satisfies RunBudgetEnvelopeV1
}

export const makeRunDegradeMarkerV1 = (
  degraded: boolean,
  reason?: RunDegradeReasonV1,
): RunDegradeMarkerV1 => ({
  contract: DIAGNOSTICS_BUDGET_CONTRACT_V1,
  degraded,
  ...(degraded && reason ? { reason } : null),
})
