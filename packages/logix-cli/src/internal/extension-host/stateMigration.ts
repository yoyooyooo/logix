import { asSerializableErrorSummary, makeCliError, type SerializableErrorSummary } from '../errors.js'
import type { JsonValue } from '../result.js'

import { runExtensionHook } from './executor.js'
import type { ResourceBudgetEvent, ResourceBudgetExecutor } from './resourceBudget.js'
import type { ExtensionHostRuntime, ExtensionHookContext } from './runtime.js'

export type ExtensionStateSnapshotV1 = {
  readonly schemaVersion: 'ext-state.v1'
  readonly kind: 'ExtensionStateSnapshot'
  readonly extensionId: string
  readonly revision: string
  readonly instanceId: string
  readonly persistedState: JsonValue | null
}

export type MigrateExtensionStateArgs = {
  readonly from: ExtensionHostRuntime
  readonly to: ExtensionHostRuntime
  readonly baseContext: Omit<ExtensionHookContext, 'hook'>
  readonly budget: ResourceBudgetExecutor
  readonly onEvent?: (event: ResourceBudgetEvent) => void
}

export type MigrateExtensionStateResult =
  | {
      readonly ok: true
      readonly snapshot?: ExtensionStateSnapshotV1
      readonly events: ReadonlyArray<ResourceBudgetEvent>
    }
  | {
      readonly ok: false
      readonly reasonCode: 'EXT_STATE_MIGRATION_FAILED' | 'EXT_HOOK_TIMEOUT'
      readonly error: SerializableErrorSummary
      readonly events: ReadonlyArray<ResourceBudgetEvent>
    }

const toJsonValueOrNull = (value: unknown): JsonValue | null => {
  if (typeof value === 'undefined') return null
  try {
    return JSON.parse(JSON.stringify(value)) as JsonValue
  } catch {
    return null
  }
}

const mapMigrationReason = (summary: SerializableErrorSummary): 'EXT_STATE_MIGRATION_FAILED' | 'EXT_HOOK_TIMEOUT' =>
  summary.code === 'EXT_HOOK_TIMEOUT' ? 'EXT_HOOK_TIMEOUT' : 'EXT_STATE_MIGRATION_FAILED'

const makeMigrationFailure = (
  cause: unknown,
  events: ReadonlyArray<ResourceBudgetEvent>,
): MigrateExtensionStateResult => {
  const summary = asSerializableErrorSummary(cause)
  return {
    ok: false,
    reasonCode: mapMigrationReason(summary),
    error: summary,
    events,
  }
}

export const snapshotExtensionState = async (args: {
  readonly runtime: ExtensionHostRuntime
  readonly baseContext: Omit<ExtensionHookContext, 'hook'>
  readonly budget: ResourceBudgetExecutor
  readonly onEvent?: (event: ResourceBudgetEvent) => void
}): Promise<MigrateExtensionStateResult> => {
  const events: ResourceBudgetEvent[] = []
  const recorder = (event: ResourceBudgetEvent): void => {
    events.push(event)
    args.onEvent?.(event)
  }

  try {
    const result = await args.budget.runWithBudget({
      label: `${args.runtime.manifest.extensionId}:snapshot`,
      recorder,
      task: async () =>
        runExtensionHook({
          runtime: args.runtime,
          hook: 'snapshot',
          context: args.baseContext,
        }),
    })

    if (!result.value.executedHook) {
      return {
        ok: true,
        events,
      }
    }

    return {
      ok: true,
      snapshot: {
        schemaVersion: 'ext-state.v1',
        kind: 'ExtensionStateSnapshot',
        extensionId: args.runtime.manifest.extensionId,
        revision: args.runtime.manifest.revision,
        instanceId: args.baseContext.instanceId,
        persistedState: toJsonValueOrNull(result.value.value),
      },
      events,
    }
  } catch (cause) {
    return makeMigrationFailure(
      makeCliError({
        code: 'EXT_STATE_MIGRATION_FAILED',
        message: '[Logix][CLI] 扩展 state snapshot 失败',
        cause,
      }),
      events,
    )
  }
}

export const restoreExtensionState = async (args: {
  readonly runtime: ExtensionHostRuntime
  readonly snapshot?: ExtensionStateSnapshotV1
  readonly baseContext: Omit<ExtensionHookContext, 'hook'>
  readonly budget: ResourceBudgetExecutor
  readonly onEvent?: (event: ResourceBudgetEvent) => void
}): Promise<MigrateExtensionStateResult> => {
  const events: ResourceBudgetEvent[] = []
  const recorder = (event: ResourceBudgetEvent): void => {
    events.push(event)
    args.onEvent?.(event)
  }

  if (!args.snapshot) {
    return {
      ok: true,
      events,
    }
  }

  try {
    await args.budget.runWithBudget({
      label: `${args.runtime.manifest.extensionId}:restore`,
      recorder,
      task: async () =>
        runExtensionHook({
          runtime: args.runtime,
          hook: 'restore',
          context: {
            ...args.baseContext,
            payload: args.snapshot,
          },
        }),
    })

    return {
      ok: true,
      snapshot: args.snapshot,
      events,
    }
  } catch (cause) {
    return makeMigrationFailure(
      makeCliError({
        code: 'EXT_STATE_MIGRATION_FAILED',
        message: '[Logix][CLI] 扩展 state restore 失败',
        cause,
      }),
      events,
    )
  }
}

export const migrateExtensionState = async (args: MigrateExtensionStateArgs): Promise<MigrateExtensionStateResult> => {
  const snapshot = await snapshotExtensionState({
    runtime: args.from,
    baseContext: args.baseContext,
    budget: args.budget,
    onEvent: args.onEvent,
  })

  if (!snapshot.ok) {
    return snapshot
  }

  const restore = await restoreExtensionState({
    runtime: args.to,
    snapshot: snapshot.snapshot,
    baseContext: args.baseContext,
    budget: args.budget,
    onEvent: args.onEvent,
  })

  if (!restore.ok) {
    return {
      ...restore,
      events: [...snapshot.events, ...restore.events],
    }
  }

  return {
    ok: true,
    ...(snapshot.snapshot ? { snapshot: snapshot.snapshot } : null),
    events: [...snapshot.events, ...restore.events],
  }
}
