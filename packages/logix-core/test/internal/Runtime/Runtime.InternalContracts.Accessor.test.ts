import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import type { RuntimeInternals } from '../../../src/internal/runtime/core/RuntimeInternals.js'
import {
  getBoundInternals,
  getRuntimeInternals,
  setBoundInternals,
  setRuntimeInternals,
} from '../../../src/internal/runtime/core/runtimeInternalsAccessor.js'

const makeInternals = (instanceId: string): RuntimeInternals => ({
  moduleId: 'M',
  instanceId,
  concurrency: {
    resolveConcurrencyPolicy: () =>
      Effect.succeed({
        concurrencyLimit: 16,
        losslessBackpressureCapacity: 0,
        allowUnbounded: false,
        pressureWarningThreshold: { backlogCount: 0, backlogDurationMs: 0 },
        warningCooldownMs: 0,
        configScope: 'builtin',
        concurrencyLimitScope: 'builtin',
        requestedConcurrencyLimit: 16,
        requestedConcurrencyLimitScope: 'builtin',
        allowUnboundedScope: 'builtin',
      }),
  },
  txnLanes: {
    resolveTxnLanePolicy: () =>
      Effect.succeed({
        enabled: false,
        configScope: 'builtin',
        budgetMs: 8,
        debounceMs: 16,
        maxLagMs: 200,
        allowCoalesce: true,
        yieldStrategy: 'baseline',
        queueMode: 'fifo',
      }),
  },
  lifecycle: {
    registerInitRequired: () => {},
    registerStart: () => {},
    registerDestroy: () => {},
    registerOnError: () => {},
    registerPlatformSuspend: () => {},
    registerPlatformResume: () => {},
    registerPlatformReset: () => {},
  },
  imports: {
    kind: 'imports-scope',
    get: () => undefined,
  },
  txn: {
    instrumentation: 'light',
    registerReducer: () => {},
    runWithStateTransaction: () => Effect.void,
    updateDraft: () => {},
    recordStatePatch: () => {},
    recordReplayEvent: () => {},
    applyTransactionSnapshot: () => Effect.void,
  },
  traits: {
    rowIdStore: {},
    getListConfigs: () => [],
    registerSourceRefresh: () => {},
    getSourceRefreshHandler: () => undefined,
    registerStateTraitProgram: () => {},
    enqueueStateTraitValidateRequest: () => {},
    registerModuleTraitsContribution: () => {},
    freezeModuleTraits: () => {},
    getModuleTraitsContributions: () => [],
    getModuleTraitsSnapshot: () => undefined,
    setModuleTraitsSnapshot: () => {},
  },
  devtools: {
    registerConvergeStaticIr: () => {},
  },
})

describe('RuntimeInternals accessor', () => {
  it('getRuntimeInternals throws when missing', () => {
    const runtime = { moduleId: 'M', instanceId: 'i-1' }
    expect(() => getRuntimeInternals(runtime)).toThrowError(/MissingRuntimeInternals/)
  })

  it('getRuntimeInternals returns installed internals', () => {
    const runtime = { moduleId: 'M', instanceId: 'i-1' }
    const internals = makeInternals('i-1')
    setRuntimeInternals(runtime, internals)
    expect(getRuntimeInternals(runtime)).toBe(internals)
  })

  it('getRuntimeInternals throws on instanceId mismatch', () => {
    const runtime = { moduleId: 'M', instanceId: 'i-2' }
    setRuntimeInternals(runtime, makeInternals('i-1'))
    expect(() => getRuntimeInternals(runtime)).toThrowError(/InconsistentRuntimeInternals/)
  })

  it('getBoundInternals throws when missing', () => {
    const bound = {}
    expect(() => getBoundInternals(bound)).toThrowError(/MissingBoundInternals/)
  })

  it('getBoundInternals returns installed internals', () => {
    const bound = {}
    const internals = makeInternals('i-1')
    setBoundInternals(bound, internals)
    expect(getBoundInternals(bound)).toBe(internals)
  })
})
