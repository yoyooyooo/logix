import type { Context, Stream, SubscriptionRef } from 'effect'
import type { ReadQueryCompiled } from './runtime/core/ReadQuery.js'

export type ExternalStoreDescriptor =
  | {
      readonly kind: 'manual'
      readonly storeId: string
    }
  | {
      readonly kind: 'service'
      readonly storeId: string
      readonly tagId: string
      readonly tag: Context.Tag<any, any>
      readonly map: (service: any) => {
        readonly getSnapshot: () => any
        readonly getServerSnapshot?: () => any
        readonly subscribe: (listener: () => void) => () => void
      }
    }
  | {
      readonly kind: 'subscriptionRef'
      readonly storeId: string
      readonly ref: SubscriptionRef.SubscriptionRef<any>
    }
  | {
      readonly kind: 'stream'
      readonly storeId: string
      readonly stream: Stream.Stream<any, any, any>
      readonly initial: unknown
      readonly initialHint: 'initial' | 'current'
    }
  | {
      readonly kind: 'module'
      readonly storeId: string
      readonly module: unknown
      readonly moduleId: string
      /**
       * Optional instance anchor when the caller passes a concrete ModuleRuntime handle.
       * - When omitted, the runtime resolves it from the module tag during install.
       */
      readonly instanceId?: string
      /**
       * Full compiled ReadQuery (includes select/equals); may carry non-serializable closures.
       * Static IR export MUST use `readQuery.staticIr` (JSON-friendly) and ignore non-serializable parts.
       */
      readonly readQuery: ReadQueryCompiled<any, any>
    }

export const EXTERNAL_STORE_DESCRIPTOR = Symbol.for('@logixjs/core/externalStoreDescriptor')

const defineHidden = (target: object, key: symbol, value: unknown): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    configurable: true,
    writable: false,
  })
}

export const attachExternalStoreDescriptor = (store: object, descriptor: ExternalStoreDescriptor): void => {
  defineHidden(store, EXTERNAL_STORE_DESCRIPTOR, descriptor)
}

export const getExternalStoreDescriptor = (store: unknown): ExternalStoreDescriptor | undefined => {
  if (!store || (typeof store !== 'object' && typeof store !== 'function')) return undefined
  return (store as any)[EXTERNAL_STORE_DESCRIPTOR] as ExternalStoreDescriptor | undefined
}
