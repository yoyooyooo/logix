import { Context, Layer } from 'effect'

export type RuntimeHostKind = 'node' | 'browser' | 'unknown'

export interface RuntimeHostService {
  readonly kind: RuntimeHostKind
  readonly isNode: boolean
  readonly isBrowser: boolean
}

const detectKind = (): RuntimeHostKind => {
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

  if (isBrowser) return 'browser'

  const isNode = typeof process !== 'undefined' && typeof (process as any)?.versions?.node === 'string'

  if (isNode) return 'node'

  return 'unknown'
}

export const make = (kind: RuntimeHostKind): RuntimeHostService => ({
  kind,
  isNode: kind === 'node',
  isBrowser: kind === 'browser',
})

export class RuntimeHost extends Context.Tag('@logix/RuntimeHost')<RuntimeHost, RuntimeHostService>() {}

export const layer = (service: RuntimeHostService): Layer.Layer<RuntimeHost, never, never> =>
  Layer.succeed(RuntimeHost, service)

export const mock = (kind: RuntimeHostKind): Layer.Layer<RuntimeHost, never, never> => layer(make(kind))

export const defaultLayer: Layer.Layer<RuntimeHost, never, never> = layer(make(detectKind()))
