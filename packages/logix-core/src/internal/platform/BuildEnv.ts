import { ConfigProvider, Effect, Layer } from 'effect'
import * as ConstructionGuard from './ConstructionGuard.js'
import {
  RuntimeHost,
  type RuntimeHostKind,
  type RuntimeHostService,
  defaultLayer as defaultRuntimeHostLayer,
  make as makeRuntimeHost,
  layer as runtimeHostLayer,
} from './RuntimeHost.js'

export type BuildEnvConfigValue = string | number | boolean

export interface BuildEnvOptions {
  readonly runtimeHost?: RuntimeHostService
  readonly runtimeHostKind?: RuntimeHostKind
  /**
   * Flat key/value config for mocking feature flags / env variables (values are coerced to string).
   */
  readonly config?: Record<string, BuildEnvConfigValue | undefined>
  /**
   * Advanced: inject a ConfigProvider directly (higher priority than config).
   */
  readonly configProvider?: ConfigProvider.ConfigProvider
}

const toConfigProviderFromRecord = (
  record: Record<string, BuildEnvConfigValue | undefined> | undefined,
): ConfigProvider.ConfigProvider => {
  const entries = Object.entries(record ?? {}).flatMap(([k, v]) => {
    if (!k || v === undefined) {
      return []
    }
    return [[k, String(v)] as const]
  })
  return ConfigProvider.fromUnknown(Object.fromEntries(entries))
}

export const layer = (options: BuildEnvOptions = {}): Layer.Layer<RuntimeHost, never, never> => {
  const runtimeHost = options.runtimeHost
    ? runtimeHostLayer(options.runtimeHost)
    : options.runtimeHostKind
      ? runtimeHostLayer(makeRuntimeHost(options.runtimeHostKind))
      : defaultRuntimeHostLayer

  const configProvider = options.configProvider ? options.configProvider : toConfigProviderFromRecord(options.config)

  const config = ConfigProvider.layer(configProvider)

  return Layer.mergeAll(runtimeHost, config) as Layer.Layer<RuntimeHost, never, never>
}

export const run = <A, E>(
  builder: Effect.Effect<A, E, RuntimeHost>,
  options: BuildEnvOptions = {},
): Effect.Effect<A, E | ConstructionGuard.ConstructionGuardError, never> =>
  builder.pipe(Effect.provide(layer(options)), ConstructionGuard.guardBuildTime)
