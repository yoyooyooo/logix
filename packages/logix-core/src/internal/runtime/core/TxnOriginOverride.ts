import { FiberRef } from 'effect'

export type TxnOriginOverride = {
  readonly kind: string
  readonly name?: string
  readonly details?: unknown
}

export const currentTxnOriginOverride = FiberRef.unsafeMake<TxnOriginOverride | undefined>(undefined)
