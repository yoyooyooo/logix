import type { Primitive } from '../protocol'

export type StableIdentityEvidence = {
  readonly instanceId: Primitive
  readonly txnSeq: Primitive
  readonly opSeq: Primitive
}

export const assertStableIdentityEvidence = (evidence: StableIdentityEvidence): void => {
  const values = [evidence.instanceId, evidence.txnSeq, evidence.opSeq]
  for (const value of values) {
    if (value == null) {
      throw new Error('Missing stable identity evidence: instanceId/txnSeq/opSeq')
    }
  }
}

export type TransactionEvent = {
  readonly tag: string
  readonly ioInTxn?: boolean
}

export const assertNoIoInTransactionWindow = (events: ReadonlyArray<TransactionEvent>): void => {
  const offender = events.find((event) => event.ioInTxn === true)
  if (offender) {
    throw new Error(`transaction window IO violation: ${offender.tag}`)
  }
}

export const buildSlimEvidence = (evidence: Readonly<Record<string, Primitive>>): Readonly<Record<string, Primitive>> => {
  const out: Record<string, Primitive> = {}
  for (const [key, value] of Object.entries(evidence)) {
    if (value == null) continue
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value
    }
  }
  return out
}
