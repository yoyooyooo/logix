import type {
  OverrideScope,
  RuntimeServiceBinding,
  RuntimeServiceImpl,
  RuntimeServiceOverride,
  RuntimeServiceSelection,
  RuntimeServicesEvidence,
  RuntimeServicesOverrides,
} from './RuntimeKernel.js'

export interface RuntimeServicesOverrideLayers {
  readonly runtimeDefault?: RuntimeServicesOverrides
  readonly runtimeModule?: RuntimeServicesOverrides
  readonly provider?: RuntimeServicesOverrides
  readonly providerModule?: RuntimeServicesOverrides
  readonly instance?: RuntimeServicesOverrides
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

export const selectRuntimeService = <Service>(
  serviceId: string,
  impls: ReadonlyArray<RuntimeServiceImpl<Service>>,
  overrides: RuntimeServicesOverrideLayers,
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

  consider('runtime_default', overrides.runtimeDefault)
  consider('runtime_module', overrides.runtimeModule)
  consider('provider', overrides.provider)
  consider('provider', overrides.providerModule)
  consider('instance', overrides.instance)

  if (!desired) {
    const binding = Object.freeze({
      serviceId,
      implId: builtin.implId,
      implVersion: builtin.implVersion,
      scope: 'builtin',
      overridden: false,
      notes: builtin.notes,
    }) as RuntimeServiceBinding

    return Object.freeze({
      impl: builtin,
      binding,
      overridesApplied: Object.freeze([] as Array<string>) as ReadonlyArray<string>,
    }) as RuntimeServiceSelection<Service>
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

  const binding = Object.freeze({
    serviceId,
    implId: impl.implId,
    implVersion: impl.implVersion,
    scope: desired.scope,
    overridden: true,
    notes: notes.length > 0 ? notes : undefined,
  }) as RuntimeServiceBinding

  const overridesApplied = Object.freeze([
    didFallback
      ? `${desired.scope}:${serviceId}=${desiredImplId} (fallback=${builtin.implId})`
      : `${desired.scope}:${serviceId}=${desiredImplId}`,
  ]) as ReadonlyArray<string>

  return Object.freeze({
    impl,
    binding,
    overridesApplied,
  }) as RuntimeServiceSelection<Service>
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

  const bindings = Object.freeze(
    args.bindings.map((binding) =>
      Object.freeze({
        serviceId: binding.serviceId,
        ...(binding.implId ? { implId: binding.implId } : {}),
        ...(binding.implVersion ? { implVersion: binding.implVersion } : {}),
        scope: binding.scope,
        overridden: binding.overridden,
        ...(binding.notes ? { notes: binding.notes } : {}),
      }) as RuntimeServiceBinding,
    ),
  ) as ReadonlyArray<RuntimeServiceBinding>

  const overridesApplied = Object.freeze([...args.overridesApplied]) as ReadonlyArray<string>

  return Object.freeze({
    moduleId: args.moduleId,
    instanceId: args.instanceId,
    scope,
    bindings,
    overridesApplied,
  }) as RuntimeServicesEvidence
}
