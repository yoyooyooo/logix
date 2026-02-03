import type { ControlAck, ControlCommand } from './control.js'
import { makeControlAck } from './control.js'
import type { ObservationEnvelope } from './envelope.js'
import { aggregateObservationEnvelopes, type AggregatedSnapshot } from './aggregate.js'

export interface ObservationAggregator {
  readonly append: (events: ReadonlyArray<ObservationEnvelope>) => void
  readonly applyControlCommand: (command: ControlCommand) => ControlAck
  readonly snapshot: () => AggregatedSnapshot
  readonly clear: () => void
}

export const makeObservationAggregator = (options: {
  readonly runId: string
  readonly protocolVersion: string
}): ObservationAggregator => {
  const runId = options.runId
  const protocolVersion = options.protocolVersion

  const bySeq = new Map<number, ObservationEnvelope>()
  let paused = false

  const append = (events: ReadonlyArray<ObservationEnvelope>) => {
    if (paused) return
    for (const e of events) {
      if (e.runId !== runId || e.protocolVersion !== protocolVersion) continue
      if (!bySeq.has(e.seq)) {
        bySeq.set(e.seq, e)
      }
    }
  }

  const clear = () => {
    bySeq.clear()
  }

  const applyControlCommand = (command: ControlCommand): ControlAck => {
    if (command.protocolVersion !== protocolVersion) {
      return makeControlAck({
        protocolVersion: command.protocolVersion,
        commandSeq: command.commandSeq,
        accepted: false,
        runId,
        reason: 'protocol_version_mismatch',
      })
    }
    if (command.runId && command.runId !== runId) {
      return makeControlAck({
        protocolVersion,
        commandSeq: command.commandSeq,
        accepted: false,
        runId,
        reason: 'run_id_mismatch',
      })
    }

    switch (command.type) {
      case 'clear':
        clear()
        return makeControlAck({ protocolVersion, commandSeq: command.commandSeq, accepted: true, runId })
      case 'pause':
        paused = true
        return makeControlAck({ protocolVersion, commandSeq: command.commandSeq, accepted: true, runId })
      case 'resume':
        paused = false
        return makeControlAck({ protocolVersion, commandSeq: command.commandSeq, accepted: true, runId })
    }
  }

  const snapshot = (): AggregatedSnapshot =>
    aggregateObservationEnvelopes({
      runId,
      protocolVersion,
      events: Array.from(bySeq.values()),
    })

  return {
    append,
    applyControlCommand,
    snapshot,
    clear,
  }
}

