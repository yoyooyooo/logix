import type { ProcessEvent } from './protocol.js'
import {
  makeRunBudgetEnvelopeV1,
  makeRunDegradeMarkerV1,
  type RunDegradeReasonV1,
} from '../diagnosticsBudget.js'

export const PROCESS_EVENT_MAX_BYTES = 4 * 1024
export const PROCESS_EVENT_MAX_EVENTS_PER_RUN = 50
export const PROCESS_EVENT_RESERVED_EVENTS_FOR_SUMMARY = 1

export type ProcessRunEventBudgetState = {
  readonly runId: string
  readonly maxEvents: number
  readonly maxBytes: number
  readonly emitted: number
  readonly dropped: number
  readonly downgraded: number
  readonly summaryEmitted: boolean
}

const PROCESS_RUN_BUDGET_RUN_ID_UNKNOWN = 'process:run:unknown'

const scopeKeyFromProcessEventIdentity = (eventIdentity: ProcessEvent['identity']['identity']['scope']): string => {
  switch (eventIdentity.type) {
    case 'app':
      return `app:${eventIdentity.appId}`
    case 'moduleInstance':
      return `module:${eventIdentity.moduleId}:${eventIdentity.instanceId}`
    case 'uiSubtree':
      return `subtree:${eventIdentity.subtreeId}`
  }
}

export const makeProcessRunBudgetRunId = (
  identity: ProcessEvent['identity'],
  trigger?: ProcessEvent['trigger'],
): string => {
  const processId = identity.identity.processId
  const scopeKey = scopeKeyFromProcessEventIdentity(identity.identity.scope)
  const runSeq = identity.runSeq
  const triggerSeq =
    trigger && typeof trigger.triggerSeq === 'number' && Number.isFinite(trigger.triggerSeq) && trigger.triggerSeq >= 1
      ? Math.floor(trigger.triggerSeq)
      : undefined
  return triggerSeq != null
    ? `${processId}@${scopeKey}::r${runSeq}::g${triggerSeq}`
    : `${processId}@${scopeKey}::r${runSeq}`
}

export const makeProcessRunEventBudgetState = (options?: {
  readonly runId?: string
  readonly maxEvents?: number
  readonly maxBytes?: number
}): ProcessRunEventBudgetState => ({
  runId:
    typeof options?.runId === 'string' && options.runId.length > 0 ? options.runId : PROCESS_RUN_BUDGET_RUN_ID_UNKNOWN,
  maxEvents:
    typeof options?.maxEvents === 'number' && Number.isFinite(options.maxEvents) && options.maxEvents >= 0
      ? Math.floor(options.maxEvents)
      : PROCESS_EVENT_MAX_EVENTS_PER_RUN,
  maxBytes:
    typeof options?.maxBytes === 'number' && Number.isFinite(options.maxBytes) && options.maxBytes >= 0
      ? Math.floor(options.maxBytes)
      : PROCESS_EVENT_MAX_BYTES,
  emitted: 0,
  dropped: 0,
  downgraded: 0,
  summaryEmitted: false,
})

export type ProcessRunEventBudgetDecision =
  | {
      readonly _tag: 'emit'
      readonly event: ProcessEvent
    }
  | {
      readonly _tag: 'emitSummary'
      readonly event: ProcessEvent
    }
  | {
      readonly _tag: 'drop'
    }

const attachProcessRunBudgetEnvelope = (
  event: ProcessEvent,
  state: ProcessRunEventBudgetState,
  degradeReason?: RunDegradeReasonV1,
): ProcessEvent => ({
  ...event,
  budgetEnvelope: makeRunBudgetEnvelopeV1({
    domain: 'process',
    runId: state.runId,
    limits: {
      maxEvents: state.maxEvents,
      maxBytes: state.maxBytes,
    },
    usage: {
      emitted: state.emitted,
      dropped: state.dropped,
      downgraded: state.downgraded,
    },
  }),
  degrade: makeRunDegradeMarkerV1(Boolean(degradeReason), degradeReason),
})

const finalizeBudgetedProcessEvent = (args: {
  readonly event: ProcessEvent
  readonly state: ProcessRunEventBudgetState
  readonly maxBytes: number
  readonly degradeReason?: RunDegradeReasonV1
}): { readonly event: ProcessEvent; readonly state: ProcessRunEventBudgetState } => {
  const withEnvelope = attachProcessRunBudgetEnvelope(args.event, args.state, args.degradeReason)
  if (estimateEventBytes(withEnvelope) <= args.maxBytes) {
    return { event: withEnvelope, state: args.state }
  }

  // Envelope itself may push the event over the byte budget.
  // In this case we degrade to a slimmer event (keep degrade marker, drop envelope).
  let nextState: ProcessRunEventBudgetState = {
    ...args.state,
    downgraded: args.state.downgraded + 1,
  }

  const compact: ProcessEvent = {
    ...args.event,
    degrade: makeRunDegradeMarkerV1(true, args.degradeReason ?? 'payload_oversized'),
  }

  const enforcedCompact = enforceProcessEventMaxBytes(compact, { maxBytes: args.maxBytes })
  if (enforcedCompact.downgraded) {
    nextState = {
      ...nextState,
      downgraded: nextState.downgraded + 1,
    }
  }

  return {
    event: enforcedCompact.event,
    state: nextState,
  }
}

const makeBudgetSummaryEvent = (args: {
  readonly sourceEvent: ProcessEvent
  readonly maxEvents: number
  readonly maxBytes: number
  readonly emitted: number
  readonly dropped: number
  readonly downgraded: number
}): ProcessEvent => ({
  type: 'process:trigger',
  identity: args.sourceEvent.identity,
  trigger: args.sourceEvent.trigger,
  severity: 'warning',
  eventSeq: args.sourceEvent.eventSeq,
  timestampMs: args.sourceEvent.timestampMs,
  error: {
    message: 'Process run event budget exceeded; further trigger/dispatch events are suppressed.',
    code: 'process::event_budget_exceeded',
    hint: `maxEvents=${args.maxEvents} maxBytes=${args.maxBytes} emitted=${args.emitted} dropped=${args.dropped} downgraded=${args.downgraded}`,
  },
})

export const applyProcessRunEventBudget = (
  state: ProcessRunEventBudgetState,
  event: ProcessEvent,
): readonly [ProcessRunEventBudgetDecision, ProcessRunEventBudgetState] => {
  const maxEvents = Math.max(0, state.maxEvents)
  const maxBytes = Math.max(0, state.maxBytes)

  if (state.summaryEmitted) {
    return [
      { _tag: 'drop' },
      {
        ...state,
        dropped: state.dropped + 1,
      },
    ]
  }

  const reserve = PROCESS_EVENT_RESERVED_EVENTS_FOR_SUMMARY
  const allowedRegular = Math.max(0, maxEvents - reserve)

  if (state.emitted < allowedRegular) {
    const enforced = enforceProcessEventMaxBytes(event, { maxBytes })
    const baseState: ProcessRunEventBudgetState = {
      ...state,
      emitted: state.emitted + 1,
      downgraded: state.downgraded + (enforced.downgraded ? 1 : 0),
    }
    const finalized = finalizeBudgetedProcessEvent({
      event: enforced.event,
      state: baseState,
      maxBytes,
      degradeReason: enforced.downgraded ? 'payload_oversized' : undefined,
    })
    return [
      { _tag: 'emit', event: finalized.event },
      finalized.state,
    ]
  }

  const dropped = state.dropped + 1
  const summary = makeBudgetSummaryEvent({
    sourceEvent: event,
    maxEvents,
    maxBytes,
    emitted: state.emitted,
    dropped,
    downgraded: state.downgraded,
  })
  const enforcedSummary = enforceProcessEventMaxBytes(summary, { maxBytes })
  const baseState: ProcessRunEventBudgetState = {
    ...state,
    emitted: Math.min(maxEvents, state.emitted + 1),
    dropped,
    downgraded: state.downgraded + (enforcedSummary.downgraded ? 1 : 0),
    summaryEmitted: true,
  }
  const finalized = finalizeBudgetedProcessEvent({
    event: enforcedSummary.event,
    state: baseState,
    maxBytes,
    degradeReason: 'budget_exceeded',
  })

  return [
    { _tag: 'emitSummary', event: finalized.event },
    finalized.state,
  ]
}

export const estimateEventBytes = (event: ProcessEvent): number => {
  const json = JSON.stringify(event)
  return typeof Buffer !== 'undefined' ? Buffer.byteLength(json, 'utf8') : new TextEncoder().encode(json).length
}

const truncateChars = (value: string, maxLen: number): string =>
  value.length <= maxLen ? value : value.slice(0, maxLen)

const normalizeErrorSummary = (error: NonNullable<ProcessEvent['error']>): NonNullable<ProcessEvent['error']> => {
  const message = typeof error.message === 'string' && error.message.length > 0 ? error.message : 'Error'

  const hint = typeof error.hint === 'string' && error.hint.length > 0 ? truncateChars(error.hint, 1024) : undefined

  return {
    name: typeof error.name === 'string' && error.name.length > 0 ? error.name : undefined,
    message: truncateChars(message, 256),
    code: typeof error.code === 'string' && error.code.length > 0 ? error.code : undefined,
    hint,
  }
}

export const enforceProcessEventMaxBytes = (
  event: ProcessEvent,
  options?: {
    readonly maxBytes?: number
  },
): { readonly event: ProcessEvent; readonly downgraded: boolean } => {
  const maxBytes = options?.maxBytes ?? PROCESS_EVENT_MAX_BYTES

  let downgraded = false
  let next: ProcessEvent = event

  if (event.error) {
    const normalized = normalizeErrorSummary(event.error)
    if (
      normalized.message !== event.error.message ||
      normalized.hint !== event.error.hint ||
      normalized.code !== event.error.code ||
      normalized.name !== event.error.name
    ) {
      downgraded = true
      next = { ...event, error: normalized }
    }
  }

  if (estimateEventBytes(next) <= maxBytes) {
    return { event: next, downgraded }
  }

  // Further trimming is applied to error.hint only (common trigger: multi-line hints).
  if (!next.error?.hint) {
    // Nothing left to trim; best-effort return.
    return { event: next, downgraded: true }
  }

  const hint = next.error.hint
  const steps = [512, 256, 128, 64, 32, 0]

  for (const maxLen of steps) {
    const trimmed = maxLen === 0 ? undefined : truncateChars(hint, maxLen)
    const candidate: ProcessEvent = {
      ...next,
      error: {
        ...next.error,
        hint: trimmed,
      },
    }
    if (estimateEventBytes(candidate) <= maxBytes) {
      return { event: candidate, downgraded: true }
    }
  }

  // Fallback: remove hint and shorten message (process:error must still have a message).
  const fallback: ProcessEvent = next.error
    ? ({
        ...next,
        error: {
          ...next.error,
          message: truncateChars(next.error.message, 96),
          hint: undefined,
        },
      } satisfies ProcessEvent)
    : next

  return { event: fallback, downgraded: true }
}
