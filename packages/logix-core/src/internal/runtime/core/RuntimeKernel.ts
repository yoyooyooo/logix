import { Context, Effect, Option } from 'effect'
import { isDevEnv } from './env.js'

export type OverrideScope = 'builtin' | 'runtime_default' | 'runtime_module' | 'provider' | 'instance'

export type RuntimeServiceOverride = {
  readonly implId?: string
  readonly notes?: string
}

/**
 * RuntimeServicesOverrides: a serializable override for runtime service implementation selection.
 *
 * - The key is a stable serviceId.
 * - The value may only contain serializable fields (no functions/closures) so evidence can be produced and explained.
 */
export type RuntimeServicesOverrides = Readonly<Record<string, RuntimeServiceOverride>>

export interface RuntimeServicesRuntimeConfig {
  /** Runtime-level default overrides (runtime_default). */
  readonly services?: RuntimeServicesOverrides
  /** Per-module delta overrides by moduleId (runtime_module). */
  readonly servicesByModuleId?: Readonly<Record<string, RuntimeServicesOverrides>>
}

class RuntimeServicesRuntimeConfigTagImpl extends Context.Tag('@logix/core/RuntimeServicesRuntimeConfig')<
  RuntimeServicesRuntimeConfigTagImpl,
  RuntimeServicesRuntimeConfig
>() {}

export const RuntimeServicesRuntimeConfigTag = RuntimeServicesRuntimeConfigTagImpl

export interface RuntimeServicesProviderOverrides {
  /** Provider-scoped default overrides (provider). */
  readonly services?: RuntimeServicesOverrides
  /** Provider-scoped per-module delta overrides by moduleId (provider). */
  readonly servicesByModuleId?: Readonly<Record<string, RuntimeServicesOverrides>>
}

class RuntimeServicesProviderOverridesTagImpl extends Context.Tag('@logix/core/RuntimeServicesProviderOverrides')<
  RuntimeServicesProviderOverridesTagImpl,
  RuntimeServicesProviderOverrides
>() {}

export const RuntimeServicesProviderOverridesTag = RuntimeServicesProviderOverridesTagImpl

class RuntimeServicesInstanceOverridesTagImpl extends Context.Tag('@logix/core/RuntimeServicesInstanceOverrides')<
  RuntimeServicesInstanceOverridesTagImpl,
  RuntimeServicesOverrides
>() {}

export const RuntimeServicesInstanceOverridesTag = RuntimeServicesInstanceOverridesTagImpl

/**
 * FullCutoverGateMode: controls whether fallbacks are allowed during assembly.
 *
 * - trial: allows fallbacks (for trial-run / comparison / diagnostics).
 * - fullCutover: forbids fallbacks (any fallback or missing binding fails).
 *
 * Default: trial. If you need a strict gate, set it to fullCutover explicitly in the public Runtime defaults.
 */
export type FullCutoverGateMode = 'trial' | 'fullCutover'

class FullCutoverGateModeTagImpl extends Context.Tag('@logix/core/FullCutoverGateMode')<
  FullCutoverGateModeTagImpl,
  FullCutoverGateMode
>() {}

export const FullCutoverGateModeTag = FullCutoverGateModeTagImpl

export interface RuntimeServiceBinding {
  readonly serviceId: string
  readonly implId?: string
  readonly implVersion?: string
  readonly scope: OverrideScope
  readonly overridden: boolean
  readonly notes?: string
}

export interface RuntimeServicesEvidence {
  readonly moduleId?: string
  readonly instanceId: string
  readonly scope: OverrideScope
  readonly bindings: ReadonlyArray<RuntimeServiceBinding>
  readonly overridesApplied: ReadonlyArray<string>
}

const ORDERED_SCOPES: ReadonlyArray<OverrideScope> = [
  'builtin',
  'runtime_default',
  'runtime_module',
  'provider',
  'instance',
]

const maxScope = (a: OverrideScope, b: OverrideScope): OverrideScope => {
  const ai = ORDERED_SCOPES.indexOf(a)
  const bi = ORDERED_SCOPES.indexOf(b)
  return (ai >= bi ? a : b) as OverrideScope
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeOverride = (value: unknown): RuntimeServiceOverride | undefined => {
  if (!isPlainRecord(value)) return undefined

  const implIdRaw = value.implId
  const notesRaw = value.notes

  return {
    implId: typeof implIdRaw === 'string' && implIdRaw.length > 0 ? implIdRaw : undefined,
    notes: typeof notesRaw === 'string' && notesRaw.length > 0 ? notesRaw : undefined,
  }
}

export const resolveRuntimeServicesOverrides = (args: {
  readonly moduleId: string | undefined
}): Effect.Effect<
  {
    readonly runtimeDefault?: RuntimeServicesOverrides
    readonly runtimeModule?: RuntimeServicesOverrides
    readonly provider?: RuntimeServicesOverrides
    readonly providerModule?: RuntimeServicesOverrides
    readonly instance?: RuntimeServicesOverrides
  },
  never,
  any
> =>
  Effect.gen(function* () {
    const runtimeConfigOpt = yield* Effect.serviceOption(RuntimeServicesRuntimeConfigTag)
    const providerOverridesOpt = yield* Effect.serviceOption(RuntimeServicesProviderOverridesTag)
    const instanceOverridesOpt = yield* Effect.serviceOption(RuntimeServicesInstanceOverridesTag)

    const runtimeConfig = Option.isSome(runtimeConfigOpt) ? runtimeConfigOpt.value : undefined
    const providerOverrides = Option.isSome(providerOverridesOpt) ? providerOverridesOpt.value : undefined
    const instanceOverrides = Option.isSome(instanceOverridesOpt) ? instanceOverridesOpt.value : undefined

    const moduleId = args.moduleId

    const runtimeModule =
      moduleId && runtimeConfig?.servicesByModuleId ? runtimeConfig.servicesByModuleId[moduleId] : undefined

    const providerModule =
      moduleId && providerOverrides?.servicesByModuleId ? providerOverrides.servicesByModuleId[moduleId] : undefined

    return {
      runtimeDefault: runtimeConfig?.services,
      runtimeModule,
      provider: providerOverrides?.services,
      providerModule,
      instance: instanceOverrides,
    }
  })

export interface RuntimeServiceImpl<Service> {
  readonly implId: string
  readonly implVersion: string
  readonly make: Effect.Effect<Service, never, any>
  readonly notes?: string
}

/**
 * RuntimeServicesRegistry：
 * - Used to inject additional serviceId → impls (e.g. implementations provided by core-ng).
 * - A non-serializable contract used only during assembly; selection evidence is still carried by
 *   RuntimeServicesOverrides + RuntimeServicesEvidence.
 */
export interface RuntimeServicesRegistry {
  readonly implsByServiceId: Readonly<Record<string, ReadonlyArray<RuntimeServiceImpl<any>>>>
}

class RuntimeServicesRegistryTagImpl extends Context.Tag('@logix/core/RuntimeServicesRegistry')<
  RuntimeServicesRegistryTagImpl,
  RuntimeServicesRegistry
>() {}

export const RuntimeServicesRegistryTag = RuntimeServicesRegistryTagImpl

export interface RuntimeServiceSelection<Service> {
  readonly binding: RuntimeServiceBinding
  readonly impl: RuntimeServiceImpl<Service>
  readonly overridesApplied: ReadonlyArray<string>
}

export const selectRuntimeService = <Service>(
  serviceId: string,
  impls: ReadonlyArray<RuntimeServiceImpl<Service>>,
  overrides: {
    readonly runtimeDefault?: RuntimeServicesOverrides
    readonly runtimeModule?: RuntimeServicesOverrides
    readonly provider?: RuntimeServicesOverrides
    readonly providerModule?: RuntimeServicesOverrides
    readonly instance?: RuntimeServicesOverrides
  },
): RuntimeServiceSelection<Service> => {
  const builtin = impls[0]
  if (!builtin) {
    throw new Error(`[Logix] RuntimeKernel registry missing builtin impl for: ${serviceId}`)
  }

  let desired: { readonly scope: OverrideScope; readonly override: RuntimeServiceOverride } | undefined
  const consider = (scope: OverrideScope, patch: RuntimeServicesOverrides | undefined): void => {
    const next = patch ? normalizeOverride(patch[serviceId]) : undefined
    if (!next || !next.implId) return
    desired = { scope, override: next }
  }

  // priority: builtin < runtime_default < runtime_module < provider < instance
  consider('runtime_default', overrides.runtimeDefault)
  consider('runtime_module', overrides.runtimeModule)
  consider('provider', overrides.provider)
  consider('provider', overrides.providerModule)
  consider('instance', overrides.instance)

  if (!desired) {
    return {
      impl: builtin,
      binding: {
        serviceId,
        implId: builtin.implId,
        implVersion: builtin.implVersion,
        scope: 'builtin',
        overridden: false,
        notes: builtin.notes,
      },
      overridesApplied: [],
    }
  }

  const desiredImplId = desired.override.implId!
  const selected = impls.find((i) => i.implId === desiredImplId)
  const impl = selected ?? builtin

  const didFallback = selected == null
  const fallbackNote = didFallback
    ? `Unknown implId "${desiredImplId}", falling back to builtin "${builtin.implId}"`
    : undefined

  const notes = [desired.override.notes, impl.notes, fallbackNote]
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .join('; ')

  return {
    impl,
    binding: {
      serviceId,
      implId: impl.implId,
      implVersion: impl.implVersion,
      scope: desired.scope,
      overridden: true,
      notes: notes.length > 0 ? notes : undefined,
    },
    overridesApplied: [
      didFallback
        ? `${desired.scope}:${serviceId}=${desiredImplId} (fallback=${builtin.implId})`
        : `${desired.scope}:${serviceId}=${desiredImplId}`,
    ],
  }
}

export const makeRuntimeServicesEvidence = (args: {
  readonly moduleId: string | undefined
  readonly instanceId: string
  readonly bindings: ReadonlyArray<RuntimeServiceBinding>
  readonly overridesApplied: ReadonlyArray<string>
}): RuntimeServicesEvidence => {
  let scope: OverrideScope = 'builtin'
  for (const b of args.bindings) {
    scope = maxScope(scope, b.scope)
  }

  return {
    moduleId: args.moduleId,
    instanceId: args.instanceId,
    scope,
    bindings: args.bindings,
    overridesApplied: args.overridesApplied,
  }
}

const RUNTIME_SERVICES_EVIDENCE = Symbol.for('@logix/core/runtimeServicesEvidence')

const defineHidden = (target: object, key: symbol, value: unknown): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    configurable: true,
    writable: false,
  })
}

const formatScope = (moduleId: unknown, instanceId: unknown): string => {
  const m = typeof moduleId === 'string' && moduleId.length > 0 ? moduleId : 'unknown'
  const i = typeof instanceId === 'string' && instanceId.length > 0 ? instanceId : 'unknown'
  return `moduleId=${m}, instanceId=${i}`
}

export const setRuntimeServicesEvidence = (runtime: object, evidence: RuntimeServicesEvidence): void => {
  defineHidden(runtime, RUNTIME_SERVICES_EVIDENCE, evidence)
}

export const getRuntimeServicesEvidence = (runtime: object): RuntimeServicesEvidence => {
  const scope = runtime as { readonly moduleId?: unknown; readonly instanceId?: unknown }
  const evidence = (runtime as any)[RUNTIME_SERVICES_EVIDENCE] as RuntimeServicesEvidence | undefined
  if (!evidence) {
    const msg = isDevEnv()
      ? [
          '[MissingRuntimeServicesEvidence] Runtime services evidence not installed on ModuleRuntime instance.',
          `scope: ${formatScope(scope.moduleId, scope.instanceId)}`,
          'fix:',
          '- Ensure ModuleRuntime.make assembles RuntimeKernel and attaches evidence (020 US2).',
          '- If you created a mock runtime for tests, attach evidence or avoid calling evidence-only APIs.',
        ].join('\n')
      : 'Runtime services evidence not installed'
    throw new Error(msg)
  }

  const runtimeInstanceId = scope.instanceId
  if (
    typeof runtimeInstanceId === 'string' &&
    runtimeInstanceId.length > 0 &&
    runtimeInstanceId !== evidence.instanceId
  ) {
    throw new Error(
      isDevEnv()
        ? [
            '[InconsistentRuntimeServicesEvidence] Runtime services evidence instanceId mismatch.',
            `runtime: ${formatScope(scope.moduleId, runtimeInstanceId)}`,
            `evidence: ${formatScope(evidence.moduleId, evidence.instanceId)}`,
          ].join('\n')
        : 'Runtime services evidence mismatch',
    )
  }

  return evidence
}
