import { ServiceMap } from 'effect'

export type TxnOriginOverride = {
  readonly kind: string
  readonly name?: string
}

export const currentTxnOriginOverride = ServiceMap.Reference<TxnOriginOverride | undefined>(
  '@logixjs/core/TxnOriginOverride',
  { defaultValue: () => undefined },
)
