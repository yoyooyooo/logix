import { asSerializableErrorSummary, makeCliError, type SerializableErrorSummary } from '../errors.js'

import { assertExtensionManifestSecurity, type ExtensionCapabilityPolicy } from './capabilities.js'
import { runExtensionHook } from './executor.js'
import type { ResourceBudgetEvent, ResourceBudgetExecutor } from './resourceBudget.js'
import { migrateExtensionState, type MigrateExtensionStateResult } from './stateMigration.js'
import type { ExtensionHostRuntime, ExtensionHookContext } from './runtime.js'
import {
  makeRevalidateBaseline,
  revalidateBeforeSwap,
  type RevalidateBeforeSwapResult,
} from './revalidateBeforeSwap.js'

export type HotReloadStage =
  | 'shadow-start'
  | 'restore'
  | 'healthcheck'
  | 'revalidate-before-swap'
  | 'atomic-swap'
  | 'observe-window'
  | 'rollback'

export type HotReloadEvent = {
  readonly schemaVersion: 1
  readonly kind: 'ExtensionHotReloadEvent'
  readonly stage: HotReloadStage
  readonly status: 'started' | 'succeeded' | 'failed' | 'rolled-back'
  readonly runId: string
  readonly instanceId: string
  readonly detail?: Readonly<Record<string, string | number | boolean>>
}

type HotReloadReasonCode = 'EXT_MANIFEST_INVALID' | 'EXT_STATE_MIGRATION_FAILED' | 'EXT_HOOK_TIMEOUT'

export type HotReloadResult =
  | {
      readonly ok: true
      readonly active: ExtensionHostRuntime
      readonly previous: ExtensionHostRuntime
      readonly events: ReadonlyArray<HotReloadEvent | ResourceBudgetEvent>
    }
  | {
      readonly ok: false
      readonly failedStage: HotReloadStage
      readonly reasonCode: HotReloadReasonCode
      readonly error: SerializableErrorSummary
      readonly active: ExtensionHostRuntime
      readonly previous: ExtensionHostRuntime
      readonly rollback: { readonly attempted: boolean; readonly succeeded: boolean; readonly error?: SerializableErrorSummary }
      readonly events: ReadonlyArray<HotReloadEvent | ResourceBudgetEvent>
    }

export type HotReloadArgs = {
  readonly baseContext: Omit<ExtensionHookContext, 'hook'>
  readonly current: ExtensionHostRuntime
  readonly loadShadow: () => Promise<ExtensionHostRuntime>
  readonly budget: ResourceBudgetExecutor
  readonly resolvePolicy: () => ExtensionCapabilityPolicy | Promise<ExtensionCapabilityPolicy>
  readonly observeAfterSwap?: (active: ExtensionHostRuntime) => Promise<void>
  readonly observeWindowMs?: number
  readonly swap?: (next: ExtensionHostRuntime, previous: ExtensionHostRuntime) => Promise<void> | void
  readonly rollbackSwap?: (previous: ExtensionHostRuntime, failed: ExtensionHostRuntime) => Promise<void> | void
  readonly migrateState?: (args: {
    readonly from: ExtensionHostRuntime
    readonly to: ExtensionHostRuntime
    readonly baseContext: Omit<ExtensionHookContext, 'hook'>
    readonly budget: ResourceBudgetExecutor
    readonly onEvent?: (event: ResourceBudgetEvent) => void
  }) => Promise<MigrateExtensionStateResult>
  readonly revalidate?: (args: {
    readonly shadow: ExtensionHostRuntime
    readonly baseline: { readonly manifestDigest: string; readonly policyDigest: string }
    readonly resolvePolicy: () => ExtensionCapabilityPolicy | Promise<ExtensionCapabilityPolicy>
  }) => Promise<RevalidateBeforeSwapResult>
  readonly onEvent?: (event: HotReloadEvent | ResourceBudgetEvent) => void
}

type HotReloadFailure = Extract<HotReloadResult, { readonly ok: false }>

const mapReasonCode = (summary: SerializableErrorSummary, fallback: HotReloadReasonCode): HotReloadReasonCode => {
  if (summary.code === 'EXT_HOOK_TIMEOUT') return 'EXT_HOOK_TIMEOUT'
  if (summary.code === 'EXT_STATE_MIGRATION_FAILED') return 'EXT_STATE_MIGRATION_FAILED'
  if (summary.code === 'EXT_MANIFEST_INVALID') return 'EXT_MANIFEST_INVALID'
  return fallback
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const withTimeout = async <T>(task: Promise<T>, timeoutMs: number, stage: HotReloadStage): Promise<T> => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return task
  return await Promise.race([
    task,
    (async () => {
      await sleep(timeoutMs)
      throw makeCliError({
        code: 'EXT_HOOK_TIMEOUT',
        message: `[Logix][CLI] ${stage} 超时（timeoutMs=${timeoutMs}）`,
      })
    })(),
  ])
}

const runHookWithBudget = async <T>(args: {
  readonly runtime: ExtensionHostRuntime
  readonly hook: 'setup' | 'healthcheck' | 'teardown'
  readonly baseContext: Omit<ExtensionHookContext, 'hook'>
  readonly budget: ResourceBudgetExecutor
  readonly onEvent?: (event: ResourceBudgetEvent) => void
}): Promise<{ readonly executedHook: boolean; readonly value: T | undefined }> => {
  const result = await args.budget.runWithBudget({
    label: `${args.runtime.manifest.extensionId}:${args.hook}`,
    recorder: args.onEvent,
    task: async () =>
      runExtensionHook<T>({
        runtime: args.runtime,
        hook: args.hook,
        context: args.baseContext,
      }),
  })

  return {
    executedHook: result.value.executedHook,
    value: result.value.value,
  }
}

const toHotReloadFailure = (args: {
  readonly stage: HotReloadStage
  readonly fallback: HotReloadReasonCode
  readonly cause: unknown
  readonly active: ExtensionHostRuntime
  readonly previous: ExtensionHostRuntime
  readonly events: ReadonlyArray<HotReloadEvent | ResourceBudgetEvent>
  readonly rollback?: { readonly attempted: boolean; readonly succeeded: boolean; readonly error?: SerializableErrorSummary }
}): HotReloadFailure => {
  const summary = asSerializableErrorSummary(args.cause)
  return {
    ok: false,
    failedStage: args.stage,
    reasonCode: mapReasonCode(summary, args.fallback),
    error: summary,
    active: args.active,
    previous: args.previous,
    rollback: args.rollback ?? { attempted: false, succeeded: false },
    events: args.events,
  }
}

export const hotReload = async (args: HotReloadArgs): Promise<HotReloadResult> => {
  const events: Array<HotReloadEvent | ResourceBudgetEvent> = []

  const emit = (event: HotReloadEvent | ResourceBudgetEvent): void => {
    events.push(event)
    args.onEvent?.(event)
  }

  const emitStage = (stage: HotReloadStage, status: HotReloadEvent['status'], detail?: HotReloadEvent['detail']): void => {
    emit({
      schemaVersion: 1,
      kind: 'ExtensionHotReloadEvent',
      stage,
      status,
      runId: args.baseContext.runId,
      instanceId: args.baseContext.instanceId,
      ...(detail ? { detail } : null),
    })
  }

  let active = args.current
  const previous = args.current
  let shadow: ExtensionHostRuntime | undefined
  let swapped = false

  try {
    emitStage('shadow-start', 'started')
    shadow = await args.loadShadow()
    const initialPolicy = await args.resolvePolicy()
    assertExtensionManifestSecurity(shadow.manifest, initialPolicy)
    await runHookWithBudget({
      runtime: shadow,
      hook: 'setup',
      baseContext: args.baseContext,
      budget: args.budget,
      onEvent: (event) => emit(event),
    })
    emitStage('shadow-start', 'succeeded', { revision: shadow.manifest.revision })

    emitStage('restore', 'started')
    const migration = await (args.migrateState ?? migrateExtensionState)({
      from: previous,
      to: shadow,
      baseContext: args.baseContext,
      budget: args.budget,
      onEvent: (event) => emit(event),
    })
    if (!migration.ok) {
      emitStage('restore', 'failed', { reasonCode: migration.reasonCode })
      return toHotReloadFailure({
        stage: 'restore',
        fallback: migration.reasonCode,
        cause: makeCliError({
          code: migration.reasonCode,
          message: migration.error.message,
          cause: migration.error,
        }),
        active: previous,
        previous,
        events,
      })
    }
    emitStage('restore', 'succeeded', { migrated: Boolean(migration.snapshot) })

    emitStage('healthcheck', 'started')
    const healthcheck = await runHookWithBudget<boolean>({
      runtime: shadow,
      hook: 'healthcheck',
      baseContext: args.baseContext,
      budget: args.budget,
      onEvent: (event) => emit(event),
    })
    if (healthcheck.executedHook && healthcheck.value === false) {
      throw makeCliError({
        code: 'EXT_MANIFEST_INVALID',
        message: '[Logix][CLI] 扩展 healthcheck 返回 false',
      })
    }
    emitStage('healthcheck', 'succeeded')

    emitStage('revalidate-before-swap', 'started')
    const baseline = makeRevalidateBaseline({
      manifest: shadow.manifest,
      policy: initialPolicy,
    })
    const revalidated = await (args.revalidate ?? revalidateBeforeSwap)({
      shadow,
      baseline,
      resolvePolicy: args.resolvePolicy,
    })
    if (!revalidated.ok) {
      emitStage('revalidate-before-swap', 'failed', { drift: revalidated.drift })
      return toHotReloadFailure({
        stage: 'revalidate-before-swap',
        fallback: revalidated.reasonCode,
        cause: makeCliError({
          code: revalidated.reasonCode,
          message: revalidated.error.message,
          cause: revalidated.error,
        }),
        active: previous,
        previous,
        events,
      })
    }
    emitStage('revalidate-before-swap', 'succeeded')

    emitStage('atomic-swap', 'started')
    if (args.swap) {
      await args.swap(shadow, previous)
    }
    active = shadow
    swapped = true
    emitStage('atomic-swap', 'succeeded', {
      fromRevision: previous.manifest.revision,
      toRevision: shadow.manifest.revision,
    })

    emitStage('observe-window', 'started')
    if (args.observeAfterSwap) {
      await withTimeout(args.observeAfterSwap(shadow), args.observeWindowMs ?? 0, 'observe-window')
    }
    emitStage('observe-window', 'succeeded')

    return {
      ok: true,
      active,
      previous,
      events,
    }
  } catch (cause) {
    if (!shadow) {
      emitStage('shadow-start', 'failed')
      return toHotReloadFailure({
        stage: 'shadow-start',
        fallback: 'EXT_MANIFEST_INVALID',
        cause,
        active: previous,
        previous,
        events,
      })
    }

    if (!swapped) {
      emitStage('healthcheck', 'failed')
      return toHotReloadFailure({
        stage: 'healthcheck',
        fallback: 'EXT_HOOK_TIMEOUT',
        cause,
        active: previous,
        previous,
        events,
      })
    }

    emitStage('rollback', 'started')
    try {
      if (args.rollbackSwap) {
        await args.rollbackSwap(previous, shadow)
      } else if (args.swap) {
        await args.swap(previous, shadow)
      }
      active = previous
      emitStage('rollback', 'rolled-back', {
        toRevision: previous.manifest.revision,
      })
      return toHotReloadFailure({
        stage: 'observe-window',
        fallback: 'EXT_MANIFEST_INVALID',
        cause,
        active,
        previous,
        events,
        rollback: { attempted: true, succeeded: true },
      })
    } catch (rollbackCause) {
      const rollbackError = asSerializableErrorSummary(rollbackCause)
      emitStage('rollback', 'failed')
      return toHotReloadFailure({
        stage: 'observe-window',
        fallback: 'EXT_MANIFEST_INVALID',
        cause,
        active,
        previous,
        events,
        rollback: { attempted: true, succeeded: false, error: rollbackError },
      })
    }
  } finally {
    if (shadow && shadow !== active) {
      try {
        await runHookWithBudget({
          runtime: shadow,
          hook: 'teardown',
          baseContext: args.baseContext,
          budget: args.budget,
          onEvent: (event) => emit(event),
        })
      } catch {
        // best-effort
      }
    }
  }
}

export class ExtensionHotReloadController {
  constructor(private active: ExtensionHostRuntime) {}

  getActiveRuntime(): ExtensionHostRuntime {
    return this.active
  }

  async reload(
    args: Omit<HotReloadArgs, 'current' | 'swap' | 'rollbackSwap'>,
  ): Promise<HotReloadResult> {
    const result = await hotReload({
      ...args,
      current: this.active,
      swap: async (next) => {
        this.active = next
      },
      rollbackSwap: async (previous) => {
        this.active = previous
      },
    })

    if (result.ok) {
      this.active = result.active
    } else {
      this.active = result.active
    }

    return result
  }
}
