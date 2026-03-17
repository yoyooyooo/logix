import { Effect, Option, ServiceMap } from 'effect'
import { isDevEnv } from './env.js'
import {
  makeRuntimeServicesEvidence as makeRuntimeServicesEvidenceImpl,
  selectRuntimeService as selectRuntimeServiceImpl,
  type RuntimeServicesOverrideLayers,
} from './RuntimeKernel.selection.js'

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

class RuntimeServicesRuntimeConfigTagImpl extends ServiceMap.Service<
  RuntimeServicesRuntimeConfigTagImpl,
  RuntimeServicesRuntimeConfig
>()('@logixjs/core/RuntimeServicesRuntimeConfig') {}

export const RuntimeServicesRuntimeConfigTag = RuntimeServicesRuntimeConfigTagImpl

export interface RuntimeServicesProviderOverrides {
  /** Provider-scoped default overrides (provider). */
  readonly services?: RuntimeServicesOverrides
  /** Provider-scoped per-module delta overrides by moduleId (provider). */
  readonly servicesByModuleId?: Readonly<Record<string, RuntimeServicesOverrides>>
}

class RuntimeServicesProviderOverridesTagImpl extends ServiceMap.Service<
  RuntimeServicesProviderOverridesTagImpl,
  RuntimeServicesProviderOverrides
>()('@logixjs/core/RuntimeServicesProviderOverrides') {}

export const RuntimeServicesProviderOverridesTag = RuntimeServicesProviderOverridesTagImpl

class RuntimeServicesInstanceOverridesTagImpl extends ServiceMap.Service<
  RuntimeServicesInstanceOverridesTagImpl,
  RuntimeServicesOverrides
>()('@logixjs/core/RuntimeServicesInstanceOverrides') {}

export const RuntimeServicesInstanceOverridesTag = RuntimeServicesInstanceOverridesTagImpl

/**
 * FullCutoverGateMode: controls whether fallbacks are allowed during assembly.
 *
 * - trial: allows fallbacks (for trial-run / comparison / diagnostics).
 * - fullCutover: forbids fallbacks (any fallback or missing binding fails).
 *
 * Default: fullCutover. trial must be opted in explicitly.
 */
export type FullCutoverGateMode = 'trial' | 'fullCutover'

class FullCutoverGateModeTagImpl extends ServiceMap.Service<
  FullCutoverGateModeTagImpl,
  FullCutoverGateMode
>()('@logixjs/core/FullCutoverGateMode') {}

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

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeRuntimeServiceOverride = (value: unknown): RuntimeServiceOverride | undefined => {
  if (!isPlainRecord(value)) return undefined

  const implIdRaw = value.implId
  const notesRaw = value.notes

  const implId = typeof implIdRaw === 'string' && implIdRaw.length > 0 ? implIdRaw : undefined
  const notes = typeof notesRaw === 'string' && notesRaw.length > 0 ? notesRaw : undefined
  if (!implId && !notes) return undefined

  return Object.freeze({
    ...(implId ? { implId } : {}),
    ...(notes ? { notes } : {}),
  }) as RuntimeServiceOverride
}

const freezeRuntimeServicesOverrides = (
  value: RuntimeServicesOverrides | undefined,
): RuntimeServicesOverrides | undefined => {
  if (!isPlainRecord(value)) return undefined

  const out: Record<string, RuntimeServiceOverride> = {}
  for (const [serviceId, rawOverride] of Object.entries(value)) {
    if (serviceId.length === 0) continue
    const normalized = normalizeRuntimeServiceOverride(rawOverride)
    if (!normalized) continue
    out[serviceId] = normalized
  }

  if (Object.keys(out).length === 0) return undefined
  return Object.freeze(out) as RuntimeServicesOverrides
}

const freezeRuntimeServicesOverridesAtModule = (args: {
  readonly moduleId: string | undefined
  readonly byModuleId: Readonly<Record<string, RuntimeServicesOverrides>> | undefined
}): RuntimeServicesOverrides | undefined => {
  if (!args.moduleId || args.moduleId.length === 0) return undefined
  if (!isPlainRecord(args.byModuleId)) return undefined
  return freezeRuntimeServicesOverrides(args.byModuleId[args.moduleId])
}

export const resolveRuntimeServicesOverrides = (args: {
  readonly moduleId: string | undefined
}): Effect.Effect<RuntimeServicesOverrideLayers, never, any> =>
  Effect.gen(function* () {
    const runtimeConfigOpt = yield* Effect.serviceOption(RuntimeServicesRuntimeConfigTag)
    const providerOverridesOpt = yield* Effect.serviceOption(RuntimeServicesProviderOverridesTag)
    const instanceOverridesOpt = yield* Effect.serviceOption(RuntimeServicesInstanceOverridesTag)

    const runtimeConfig = Option.isSome(runtimeConfigOpt) ? runtimeConfigOpt.value : undefined
    const providerOverrides = Option.isSome(providerOverridesOpt) ? providerOverridesOpt.value : undefined
    const instanceOverrides = Option.isSome(instanceOverridesOpt) ? instanceOverridesOpt.value : undefined

    const moduleId = args.moduleId
    const runtimeDefaults = freezeRuntimeServicesOverrides(runtimeConfig?.services)
    const runtimeModule = freezeRuntimeServicesOverridesAtModule({
      moduleId,
      byModuleId: runtimeConfig?.servicesByModuleId,
    })
    const providerDefaults = freezeRuntimeServicesOverrides(providerOverrides?.services)
    const providerModule = freezeRuntimeServicesOverridesAtModule({
      moduleId,
      byModuleId: providerOverrides?.servicesByModuleId,
    })
    const instance = freezeRuntimeServicesOverrides(instanceOverrides)

    return Object.freeze({
      runtimeDefault: runtimeDefaults,
      runtimeModule,
      provider: providerDefaults,
      providerModule,
      instance,
    }) as RuntimeServicesOverrideLayers
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

class RuntimeServicesRegistryTagImpl extends ServiceMap.Service<
  RuntimeServicesRegistryTagImpl,
  RuntimeServicesRegistry
>()('@logixjs/core/RuntimeServicesRegistry') {}

export const RuntimeServicesRegistryTag = RuntimeServicesRegistryTagImpl

export interface RuntimeServiceSelection<Service> {
  readonly binding: RuntimeServiceBinding
  readonly impl: RuntimeServiceImpl<Service>
  readonly overridesApplied: ReadonlyArray<string>
}

export const selectRuntimeService = selectRuntimeServiceImpl

export const makeRuntimeServicesEvidence = makeRuntimeServicesEvidenceImpl

const RUNTIME_SERVICES_EVIDENCE = Symbol.for('@logixjs/core/runtimeServicesEvidence')

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
