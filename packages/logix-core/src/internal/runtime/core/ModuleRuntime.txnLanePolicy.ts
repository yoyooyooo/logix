import { Effect, Option } from 'effect'
import {
  StateTransactionConfigTag,
  StateTransactionOverridesTag,
  type StateTransactionRuntimeConfig,
  type StateTransactionOverrides,
  type TxnLanePolicyInput,
  type TxnLanePolicyTier,
  type TxnLanesPatch,
  normalizeTxnLanePolicyInput,
} from './env.js'
import { normalizeBoolean, normalizeNonNegativeNumber } from './normalize.js'

export type TxnLanePolicyScope =
  | 'provider_module'
  | 'provider_default'
  | 'runtime_module'
  | 'runtime_default'
  | 'builtin'

export type TxnLanePolicyFieldKey =
  | 'tier'
  | 'enabled'
  | 'overrideMode'
  | 'budgetMs'
  | 'debounceMs'
  | 'maxLagMs'
  | 'allowCoalesce'
  | 'yieldStrategy'
  | 'queueMode'

export type TxnLaneQueueMode = 'fifo' | 'lanes'

export type TxnLaneYieldStrategy = 'baseline' | 'inputPending'

export type TxnLanePolicyEffective = {
  readonly tier?: TxnLanePolicyTier
  readonly enabled: boolean
  readonly overrideMode?: 'forced_off' | 'forced_sync'
  readonly budgetMs: number
  readonly debounceMs: number
  readonly maxLagMs: number
  readonly allowCoalesce: boolean
  readonly yieldStrategy?: TxnLaneYieldStrategy
  readonly queueMode?: TxnLaneQueueMode
}

export type TxnLanePolicyCandidate = {
  readonly scope: TxnLanePolicyScope
  readonly present: boolean
  readonly writes?: ReadonlyArray<TxnLanePolicyFieldKey>
  readonly fingerprint?: string
}

export type TxnLanePolicyExplain = {
  readonly scope: TxnLanePolicyScope
  readonly candidates: ReadonlyArray<TxnLanePolicyCandidate>
  readonly resolvedBy?: Partial<Record<TxnLanePolicyFieldKey, TxnLanePolicyScope>>
}

export type TxnLaneEvidencePolicyV2 = {
  readonly effective: TxnLanePolicyEffective
  readonly explain: TxnLanePolicyExplain
  readonly fingerprint: string
}

export type ResolvedTxnLanePolicy = TxnLaneEvidencePolicyV2 & {
  readonly tier?: TxnLanePolicyTier
  readonly enabled: boolean
  readonly overrideMode?: 'forced_off' | 'forced_sync'
  readonly scope: TxnLanePolicyScope
  readonly budgetMs: number
  readonly debounceMs: number
  readonly maxLagMs: number
  readonly allowCoalesce: boolean
  readonly yieldStrategy: TxnLaneYieldStrategy
  readonly queueMode: TxnLaneQueueMode
}

type ModuleStateTransactionOptions =
  | {
      readonly txnLanePolicy?: TxnLanePolicyInput
      readonly txnLanes?: TxnLanesPatch
    }
  | undefined

const normalizeMs = normalizeNonNegativeNumber
const normalizeBool = normalizeBoolean

const TXN_LANE_POLICY_FIELD_KEYS: ReadonlyArray<TxnLanePolicyFieldKey> = [
  'tier',
  'enabled',
  'overrideMode',
  'budgetMs',
  'debounceMs',
  'maxLagMs',
  'allowCoalesce',
  'yieldStrategy',
  'queueMode',
]

const BUILTIN_WRITES: ReadonlyArray<TxnLanePolicyFieldKey> = [
  'tier',
  'enabled',
  'budgetMs',
  'debounceMs',
  'maxLagMs',
  'allowCoalesce',
  'yieldStrategy',
]

type ResolvedTxnLanePolicyCache = {
  readonly moduleRuntimeDefaultFingerprint: string
  readonly runtimeDefaultFingerprint: string
  readonly runtimeModuleFingerprint: string
  readonly providerDefaultFingerprint: string
  readonly providerModuleFingerprint: string
  readonly resolved: ResolvedTxnLanePolicy
}

export type StateTransactionRuntimeSnapshot = {
  readonly runtimeConfig: StateTransactionRuntimeConfig | undefined
  readonly providerOverrides: StateTransactionOverrides | undefined
}

export const captureStateTransactionRuntimeSnapshot = (): Effect.Effect<StateTransactionRuntimeSnapshot, never, never> =>
  Effect.gen(function* () {
    const runtimeConfigOpt = yield* Effect.serviceOption(StateTransactionConfigTag)
    const overridesOpt = yield* Effect.serviceOption(StateTransactionOverridesTag)
    const runtimeConfig = Option.isSome(runtimeConfigOpt) ? runtimeConfigOpt.value : undefined
    const providerOverrides = Option.isSome(overridesOpt) ? overridesOpt.value : undefined
    return { runtimeConfig, providerOverrides }
  })

type ParsedTxnLanePatch = {
  readonly tier?: TxnLanePolicyTier
  readonly patch?: TxnLanesPatch
}

type MutableTxnLanePolicyState = {
  enabled: boolean
  budgetMs: number
  debounceMs: number
  maxLagMs: number
  allowCoalesce: boolean
  yieldStrategy: TxnLaneYieldStrategy
  overrideMode?: 'forced_off' | 'forced_sync'
  resolvedTier: TxnLanePolicyTier
  tierExplicit: boolean
}

type TxnLanePolicyLayerInput = {
  readonly scope: Exclude<TxnLanePolicyScope, 'builtin'>
  readonly patches: ReadonlyArray<ParsedTxnLanePatch>
}

const TXN_LANE_POLICY_SCOPE_RANK: Readonly<Record<TxnLanePolicyScope, number>> = {
  builtin: 0,
  runtime_default: 1,
  runtime_module: 2,
  provider_default: 3,
  provider_module: 4,
}

const pickHigherPrecedenceScope = (
  left: TxnLanePolicyScope | undefined,
  right: TxnLanePolicyScope | undefined,
): TxnLanePolicyScope | undefined => {
  if (!left) return right
  if (!right) return left
  return TXN_LANE_POLICY_SCOPE_RANK[right] > TXN_LANE_POLICY_SCOPE_RANK[left] ? right : left
}

const resolveTierSource = (args: {
  readonly effective: TxnLanePolicyEffective
  readonly state: MutableTxnLanePolicyState
  readonly resolvedBy: Partial<Record<TxnLanePolicyFieldKey, TxnLanePolicyScope>>
}): TxnLanePolicyScope => {
  const { effective, state, resolvedBy } = args
  if (state.tierExplicit) {
    return resolvedBy.tier ?? 'builtin'
  }

  if (effective.overrideMode != null) {
    return resolvedBy.overrideMode ?? resolvedBy.enabled ?? 'builtin'
  }

  if (!effective.enabled) {
    return resolvedBy.enabled ?? 'builtin'
  }

  const throughputByBudget = effective.budgetMs >= 4
  const throughputByMaxLag = effective.maxLagMs >= 100

  if (throughputByBudget || throughputByMaxLag) {
    let source = pickHigherPrecedenceScope(
      throughputByBudget ? resolvedBy.budgetMs : undefined,
      throughputByMaxLag ? resolvedBy.maxLagMs : undefined,
    )
    if (!source) {
      source = resolvedBy.budgetMs ?? resolvedBy.maxLagMs ?? 'builtin'
    }
    return source
  }

  return pickHigherPrecedenceScope(resolvedBy.budgetMs, resolvedBy.maxLagMs) ?? 'builtin'
}

const readTxnLanesPatch = (
  patch: TxnLanesPatch | TxnLanePolicyInput | StateTransactionOverrides | undefined,
): ParsedTxnLanePatch => {
  if (!patch || typeof patch !== 'object') return {}

  const fromTier =
    normalizeTxnLanePolicyInput((patch as any).txnLanePolicy) ??
    normalizeTxnLanePolicyInput((patch as any).tier != null ? patch : undefined)
  if (fromTier) {
    return { tier: fromTier.tier, patch: fromTier.patch }
  }

  const raw = (patch as any).txnLanes != null ? (patch as any).txnLanes : patch
  if (!raw || typeof raw !== 'object') return {}
  const fromRawTier =
    normalizeTxnLanePolicyInput((raw as any).txnLanePolicy) ??
    normalizeTxnLanePolicyInput((raw as any).tier != null ? raw : undefined)
  if (fromRawTier) {
    return { tier: fromRawTier.tier, patch: raw as TxnLanesPatch }
  }
  return { patch: raw as TxnLanesPatch }
}

const collectPatchWrites = (parsed: ParsedTxnLanePatch): ReadonlyArray<TxnLanePolicyFieldKey> => {
  const raw = parsed.patch
  if (!raw) return []

  const writes = new Set<TxnLanePolicyFieldKey>()
  if (parsed.tier != null) {
    writes.add('tier')
  }
  if (parsed.tier === 'interactive' || parsed.tier === 'throughput') {
    // Tier-first interactive/throughput means override kill-switch is explicitly cleared.
    writes.add('overrideMode')
  }
  const nextEnabled = normalizeBool((raw as any).enabled)
  if (nextEnabled != null) writes.add('enabled')

  const nextOverrideMode = (raw as any).overrideMode
  if (nextOverrideMode === 'forced_off' || nextOverrideMode === 'forced_sync') {
    writes.add('overrideMode')
  }

  const nextBudgetMs = normalizeMs((raw as any).budgetMs)
  if (nextBudgetMs != null) writes.add('budgetMs')

  const nextDebounceMs = normalizeMs((raw as any).debounceMs)
  if (nextDebounceMs != null) writes.add('debounceMs')

  const nextMaxLagMs = normalizeMs((raw as any).maxLagMs)
  if (nextMaxLagMs != null) writes.add('maxLagMs')

  const nextAllowCoalesce = normalizeBool((raw as any).allowCoalesce)
  if (nextAllowCoalesce != null) writes.add('allowCoalesce')

  const nextYieldStrategy = (raw as any).yieldStrategy
  if (nextYieldStrategy === 'baseline' || nextYieldStrategy === 'inputPending') {
    writes.add('yieldStrategy')
  }

  return TXN_LANE_POLICY_FIELD_KEYS.filter((key) => writes.has(key))
}

const createMutableState = (): MutableTxnLanePolicyState => ({
  enabled: true,
  budgetMs: 1,
  debounceMs: 0,
  maxLagMs: 50,
  allowCoalesce: true,
  yieldStrategy: 'baseline',
  overrideMode: undefined,
  resolvedTier: 'interactive',
  tierExplicit: false,
})

const applyParsedPatch = (
  state: MutableTxnLanePolicyState,
  parsed: ParsedTxnLanePatch,
): ReadonlyArray<TxnLanePolicyFieldKey> => {
  const raw = parsed.patch
  if (!raw) return []

  const writes = new Set<TxnLanePolicyFieldKey>()

  if (parsed.tier) {
    state.resolvedTier = parsed.tier
    state.tierExplicit = true
    writes.add('tier')
    if (parsed.tier === 'interactive' || parsed.tier === 'throughput') {
      if (state.overrideMode != null) {
        state.overrideMode = undefined
        writes.add('overrideMode')
      }
    }
  }

  const nextEnabled = normalizeBool((raw as any).enabled)
  if (nextEnabled != null) {
    state.enabled = nextEnabled
    writes.add('enabled')
  }

  const nextOverrideMode = (raw as any).overrideMode
  if (nextOverrideMode === 'forced_off' || nextOverrideMode === 'forced_sync') {
    state.overrideMode = nextOverrideMode
    writes.add('overrideMode')
  }

  const nextBudgetMs = normalizeMs((raw as any).budgetMs)
  if (nextBudgetMs != null) {
    state.budgetMs = nextBudgetMs
    writes.add('budgetMs')
  }

  const nextDebounceMs = normalizeMs((raw as any).debounceMs)
  if (nextDebounceMs != null) {
    state.debounceMs = nextDebounceMs
    writes.add('debounceMs')
  }

  const nextMaxLagMs = normalizeMs((raw as any).maxLagMs)
  if (nextMaxLagMs != null) {
    state.maxLagMs = nextMaxLagMs
    writes.add('maxLagMs')
  }

  const nextAllowCoalesce = normalizeBool((raw as any).allowCoalesce)
  if (nextAllowCoalesce != null) {
    state.allowCoalesce = nextAllowCoalesce
    writes.add('allowCoalesce')
  }

  const nextYieldStrategy = (raw as any).yieldStrategy
  if (nextYieldStrategy === 'baseline' || nextYieldStrategy === 'inputPending') {
    state.yieldStrategy = nextYieldStrategy
    writes.add('yieldStrategy')
  }

  return TXN_LANE_POLICY_FIELD_KEYS.filter((key) => writes.has(key))
}

const toEffectivePolicy = (state: MutableTxnLanePolicyState): TxnLanePolicyEffective => {
  const effectiveEnabled = state.overrideMode ? false : state.enabled
  const queueMode: TxnLaneQueueMode = effectiveEnabled ? 'lanes' : 'fifo'
  return {
    enabled: effectiveEnabled,
    ...(state.overrideMode ? { overrideMode: state.overrideMode } : {}),
    budgetMs: state.budgetMs,
    debounceMs: state.debounceMs,
    maxLagMs: state.maxLagMs,
    allowCoalesce: state.allowCoalesce,
    yieldStrategy: state.yieldStrategy,
    queueMode,
  }
}

const policyFingerprint = (effective: TxnLanePolicyEffective): string =>
  [
    'v1',
    `ov=${effective.overrideMode ?? ''}`,
    `en=${effective.enabled ? 1 : 0}`,
    `q=${effective.queueMode ?? ''}`,
    `b=${effective.budgetMs}`,
    `d=${effective.debounceMs}`,
    `l=${effective.maxLagMs}`,
    `c=${effective.allowCoalesce ? 1 : 0}`,
    `y=${effective.yieldStrategy ?? ''}`,
  ].join('|')

const buildCandidate = (scope: TxnLanePolicyScope, patches: ReadonlyArray<ParsedTxnLanePatch>): TxnLanePolicyCandidate => {
  if (scope === 'builtin') {
    const builtinEffective = toEffectivePolicy(createMutableState())
    return {
      scope,
      present: true,
      writes: BUILTIN_WRITES,
      fingerprint: policyFingerprint(builtinEffective),
    }
  }

  const present = patches.some((item) => item.patch != null)
  if (!present) {
    return { scope, present: false }
  }

  const state = createMutableState()
  const writes = new Set<TxnLanePolicyFieldKey>()
  for (const parsed of patches) {
    for (const key of collectPatchWrites(parsed)) {
      writes.add(key)
    }
    applyParsedPatch(state, parsed)
  }

  const effective = toEffectivePolicy(state)
  return {
    scope,
    present: true,
    ...(writes.size > 0 ? { writes: TXN_LANE_POLICY_FIELD_KEYS.filter((key) => writes.has(key)) } : {}),
    fingerprint: policyFingerprint(effective),
  }
}

const patchFingerprint = (patch: TxnLanesPatch | TxnLanePolicyInput | StateTransactionOverrides | undefined): string => {
  const parsed = readTxnLanesPatch(patch)
  const raw = parsed.patch
  if (!raw) return ''
  return [
    String(parsed.tier ?? ''),
    String(raw.enabled ?? ''),
    String(raw.overrideMode ?? ''),
    String(raw.budgetMs ?? ''),
    String(raw.debounceMs ?? ''),
    String(raw.maxLagMs ?? ''),
    String(raw.allowCoalesce ?? ''),
    String(raw.yieldStrategy ?? ''),
  ].join('|')
}

export const makeResolveTxnLanePolicy = (args: {
  /** Raw options.moduleId (may be undefined), used to query overrides maps. */
  readonly moduleId: string | undefined
  readonly stateTransaction: ModuleStateTransactionOptions
}): ((snapshot?: StateTransactionRuntimeSnapshot) => Effect.Effect<ResolvedTxnLanePolicy>) => {
  const moduleRuntimeDefaultPatch = args.stateTransaction?.txnLanePolicy ?? args.stateTransaction?.txnLanes

  let cache: ResolvedTxnLanePolicyCache | undefined
  const snapshotCache = new WeakMap<StateTransactionRuntimeSnapshot, ResolvedTxnLanePolicy>()

  return (snapshot?: StateTransactionRuntimeSnapshot) =>
    Effect.gen(function* () {
      if (snapshot) {
        const cachedFromSnapshot = snapshotCache.get(snapshot)
        if (cachedFromSnapshot) {
          return cachedFromSnapshot
        }
      }

      const captured = snapshot ?? (yield* captureStateTransactionRuntimeSnapshot())
      const runtimeConfig = captured.runtimeConfig
      const providerOverrides = captured.providerOverrides

      const moduleId = args.moduleId
      const runtimeModulePatch =
        moduleId && (runtimeConfig?.txnLanePolicyOverridesByModuleId || runtimeConfig?.txnLanesOverridesByModuleId)
          ? runtimeConfig.txnLanePolicyOverridesByModuleId?.[moduleId] ?? runtimeConfig.txnLanesOverridesByModuleId?.[moduleId]
          : undefined
      const providerModulePatch =
        moduleId && (providerOverrides?.txnLanePolicyOverridesByModuleId || providerOverrides?.txnLanesOverridesByModuleId)
          ? providerOverrides.txnLanePolicyOverridesByModuleId?.[moduleId] ??
            providerOverrides.txnLanesOverridesByModuleId?.[moduleId]
          : undefined

      const moduleRuntimeDefaultFingerprint = patchFingerprint(moduleRuntimeDefaultPatch)
      const runtimeDefaultFingerprint = patchFingerprint(runtimeConfig)
      const runtimeModuleFingerprint = patchFingerprint(runtimeModulePatch)
      const providerDefaultFingerprint = patchFingerprint(providerOverrides)
      const providerModuleFingerprint = patchFingerprint(providerModulePatch)

      if (
        cache &&
        cache.moduleRuntimeDefaultFingerprint === moduleRuntimeDefaultFingerprint &&
        cache.runtimeDefaultFingerprint === runtimeDefaultFingerprint &&
        cache.runtimeModuleFingerprint === runtimeModuleFingerprint &&
        cache.providerDefaultFingerprint === providerDefaultFingerprint &&
        cache.providerModuleFingerprint === providerModuleFingerprint
      ) {
        if (snapshot) {
          snapshotCache.set(snapshot, cache.resolved)
        }
        return cache.resolved
      }

      const runtimeDefaultParsed = readTxnLanesPatch(runtimeConfig)
      const moduleRuntimeDefaultParsed = readTxnLanesPatch(moduleRuntimeDefaultPatch)
      const runtimeModuleParsed = readTxnLanesPatch(runtimeModulePatch)
      const providerDefaultParsed = readTxnLanesPatch(providerOverrides)
      const providerModuleParsed = readTxnLanesPatch(providerModulePatch)

      const layers: ReadonlyArray<TxnLanePolicyLayerInput> = [
        {
          scope: 'runtime_default',
          patches: [moduleRuntimeDefaultParsed, runtimeDefaultParsed],
        },
        {
          scope: 'runtime_module',
          patches: [runtimeModuleParsed],
        },
        {
          scope: 'provider_default',
          patches: [providerDefaultParsed],
        },
        {
          scope: 'provider_module',
          patches: [providerModuleParsed],
        },
      ]

      const state = createMutableState()
      const resolvedBy: Partial<Record<TxnLanePolicyFieldKey, TxnLanePolicyScope>> = {}
      for (const key of BUILTIN_WRITES) {
        resolvedBy[key] = 'builtin'
      }
      let scope: TxnLanePolicyScope = 'builtin'

      for (const layer of layers) {
        let layerChanged = false
        for (const parsed of layer.patches) {
          const writes = applyParsedPatch(state, parsed)
          if (writes.length > 0) {
            layerChanged = true
            for (const key of writes) {
              resolvedBy[key] = layer.scope
            }
          }
        }
        if (layerChanged) {
          scope = layer.scope
        }
      }

      const effective = toEffectivePolicy(state)
      const candidates: ReadonlyArray<TxnLanePolicyCandidate> = [
        buildCandidate('provider_module', [providerModuleParsed]),
        buildCandidate('provider_default', [providerDefaultParsed]),
        buildCandidate('runtime_module', [runtimeModuleParsed]),
        buildCandidate('runtime_default', [moduleRuntimeDefaultParsed, runtimeDefaultParsed]),
        buildCandidate('builtin', []),
      ]

      const effectiveEnabled = effective.enabled
      const inferredTier: TxnLanePolicyTier =
        effective.overrideMode === 'forced_off'
          ? 'off'
          : effective.overrideMode === 'forced_sync'
            ? 'sync'
            : !effectiveEnabled
              ? 'off'
              : state.tierExplicit
                ? state.resolvedTier
                : effective.budgetMs >= 4 || effective.maxLagMs >= 100
                  ? 'throughput'
                  : 'interactive'
      resolvedBy.tier = resolveTierSource({ effective, state, resolvedBy })
      resolvedBy.queueMode =
        effective.overrideMode != null
          ? (resolvedBy.overrideMode ?? resolvedBy.enabled ?? 'builtin')
          : (resolvedBy.enabled ?? 'builtin')
      const effectiveWithTier: TxnLanePolicyEffective = {
        ...effective,
        tier: inferredTier,
      }
      const resolved: ResolvedTxnLanePolicy = Object.defineProperties(
        {
          effective: effectiveWithTier,
          explain: {
            scope,
            candidates,
            resolvedBy,
          },
          fingerprint: policyFingerprint(effective),
        } as TxnLaneEvidencePolicyV2,
        {
          tier: { value: inferredTier, enumerable: false },
          enabled: { value: effective.enabled, enumerable: false },
          overrideMode: { value: effective.overrideMode, enumerable: false },
          scope: { value: scope, enumerable: false },
          budgetMs: { value: effective.budgetMs, enumerable: false },
          debounceMs: { value: effective.debounceMs, enumerable: false },
          maxLagMs: { value: effective.maxLagMs, enumerable: false },
          allowCoalesce: { value: effective.allowCoalesce, enumerable: false },
          yieldStrategy: { value: effective.yieldStrategy ?? 'baseline', enumerable: false },
          queueMode: { value: effective.queueMode ?? 'fifo', enumerable: false },
        },
      ) as ResolvedTxnLanePolicy

      cache = {
        moduleRuntimeDefaultFingerprint,
        runtimeDefaultFingerprint,
        runtimeModuleFingerprint,
        providerDefaultFingerprint,
        providerModuleFingerprint,
        resolved,
      }
      if (snapshot) {
        snapshotCache.set(snapshot, resolved)
      }

      return resolved
    })
}
