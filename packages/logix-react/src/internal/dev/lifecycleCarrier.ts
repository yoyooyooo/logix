import { Effect, Layer } from 'effect'
import type { ManagedRuntime } from 'effect'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import {
  createReactHotLifecycleBinding,
  disposeHostBindingsForRuntime,
  getReactRuntimeInstanceId,
} from '../provider/runtimeHotLifecycle.js'

export type LogixDevLifecycleHostKind = 'react' | 'vite' | 'vitest' | (string & {})

export interface LogixDevLifecycleCarrierOptions {
  readonly carrierId?: string
  readonly hostKind?: LogixDevLifecycleHostKind
}

export interface LogixDevLifecycleRuntimeArgs {
  readonly ownerId: string
  readonly runtimeInstanceId?: string
  readonly cleanup?: () => Effect.Effect<void, never, never>
}

export interface LogixDevLifecycleBindRuntimeArgs extends LogixDevLifecycleRuntimeArgs {
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
}

export interface LogixDevLifecycleResetArgs {
  readonly ownerId: string
  readonly nextRuntime?: ManagedRuntime.ManagedRuntime<any, any>
  readonly nextRuntimeInstanceId?: string
  readonly reason?: RuntimeContracts.HotLifecycleReason
  readonly hostCleanupSummary?: RuntimeContracts.HostBindingCleanupSummary
}

export interface LogixDevLifecycleDisposeArgs {
  readonly ownerId: string
  readonly reason?: RuntimeContracts.HotLifecycleReason
  readonly hostCleanupSummary?: RuntimeContracts.HostBindingCleanupSummary
}

export interface LogixDevLifecycleRuntimeBinding {
  readonly ownerId: string
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly runtimeInstanceId: string
  readonly owner: RuntimeContracts.RuntimeHotLifecycleOwner
  readonly layer: Layer.Layer<any, never, never>
  readonly reset: (
    args: Omit<LogixDevLifecycleResetArgs, 'ownerId'>,
  ) => Effect.Effect<RuntimeContracts.RuntimeHotLifecycleTransition, never, never>
  readonly dispose: (
    args?: Omit<LogixDevLifecycleDisposeArgs, 'ownerId'>,
  ) => Effect.Effect<RuntimeContracts.RuntimeHotLifecycleTransition, never, never>
}

export interface LogixDevLifecycleCarrier {
  readonly carrierId: string
  readonly hostKind: LogixDevLifecycleHostKind
  readonly layerForRuntime: (args: LogixDevLifecycleRuntimeArgs) => Layer.Layer<any, never, never>
  readonly bindRuntime: (args: LogixDevLifecycleBindRuntimeArgs) => LogixDevLifecycleRuntimeBinding
  readonly reset: (
    args: LogixDevLifecycleResetArgs,
  ) => Effect.Effect<RuntimeContracts.RuntimeHotLifecycleTransition | undefined, never, never>
  readonly dispose: (
    args: LogixDevLifecycleDisposeArgs,
  ) => Effect.Effect<RuntimeContracts.RuntimeHotLifecycleTransition | undefined, never, never>
  readonly getOwner: (ownerId: string) => RuntimeContracts.RuntimeHotLifecycleOwner | undefined
}

interface OwnerRecord {
  readonly ownerId: string
  readonly runtime?: ManagedRuntime.ManagedRuntime<any, any>
  readonly owner: RuntimeContracts.RuntimeHotLifecycleOwner
  readonly layer: Layer.Layer<any, never, never>
  readonly runtimeInstanceId: string
  readonly setRuntime: (runtime: ManagedRuntime.ManagedRuntime<any, any>) => void
  readonly setCleanup: (cleanup: (() => Effect.Effect<void, never, never>) | undefined) => void
}

const GLOBAL_CARRIER_KEY = Symbol.for('@logixjs/react/dev-lifecycle-carrier')

let runtimeInstanceSeq = 0

const nextRuntimeInstanceId = (ownerId: string): string => {
  runtimeInstanceSeq += 1
  return `${ownerId}::runtime:${runtimeInstanceSeq}`
}

const getGlobalStore = (): Record<PropertyKey, unknown> => globalThis as unknown as Record<PropertyKey, unknown>

export const getInstalledLogixDevLifecycleCarrier = (): LogixDevLifecycleCarrier | undefined => {
  const value = getGlobalStore()[GLOBAL_CARRIER_KEY]
  return value && typeof value === 'object' ? (value as LogixDevLifecycleCarrier) : undefined
}

export const installLogixDevLifecycleCarrier = (
  carrierOrOptions: LogixDevLifecycleCarrier | LogixDevLifecycleCarrierOptions = {},
): LogixDevLifecycleCarrier => {
  const installed = getInstalledLogixDevLifecycleCarrier()
  if (!('layerForRuntime' in carrierOrOptions) && installed) {
    return installed
  }

  const carrier =
    'layerForRuntime' in carrierOrOptions
      ? carrierOrOptions
      : createLogixDevLifecycleCarrier(carrierOrOptions)

  getGlobalStore()[GLOBAL_CARRIER_KEY] = carrier
  return carrier
}

export const clearInstalledLogixDevLifecycleCarrier = (): void => {
  delete getGlobalStore()[GLOBAL_CARRIER_KEY]
}

export const createLogixDevLifecycleCarrier = (
  options: LogixDevLifecycleCarrierOptions = {},
): LogixDevLifecycleCarrier => {
  const records = new Map<string, OwnerRecord>()
  const carrierId = options.carrierId ?? '@logixjs/react:dev-lifecycle'
  const hostKind = options.hostKind ?? 'react'

  const createRecord = (args: LogixDevLifecycleRuntimeArgs): OwnerRecord => {
    const existing = records.get(args.ownerId)
    const runtimeInstanceId = args.runtimeInstanceId ?? nextRuntimeInstanceId(args.ownerId)
    if (existing && existing.runtimeInstanceId === runtimeInstanceId) {
      return existing
    }

    let currentRuntime: ManagedRuntime.ManagedRuntime<any, any> | undefined
    let currentCleanup = args.cleanup
    const owner = RuntimeContracts.createHotLifecycleOwner({
      ownerId: args.ownerId,
      runtimeInstanceId,
      cleanup: () =>
        Effect.gen(function* () {
          if (currentCleanup) {
            yield* currentCleanup()
          }
          if (currentRuntime) {
            yield* Effect.tryPromise(() => currentRuntime!.dispose()).pipe(Effect.catchCause(() => Effect.void))
          }
        }) as Effect.Effect<void, never, never>,
    })
    const record: OwnerRecord = {
      ownerId: args.ownerId,
      owner,
      layer: RuntimeContracts.provideRuntimeHotLifecycleOwner(owner),
      runtimeInstanceId,
      get runtime() {
        return currentRuntime
      },
      setRuntime: (runtime) => {
        currentRuntime = runtime
      },
      setCleanup: (cleanup) => {
        currentCleanup = cleanup
      },
    }
    records.set(args.ownerId, record)

    if (existing && existing.owner !== owner) {
      void Effect.runPromise(
        existing.owner.reset({
          nextRuntimeInstanceId: runtimeInstanceId,
          reason: 'hot-update',
          hostCleanupSummary: existing.runtime ? disposeHostBindingsForRuntime(existing.runtime) : undefined,
        }),
      ).catch(() => undefined)
    }

    return record
  }

  const ensureRecord = (args: LogixDevLifecycleRuntimeArgs): OwnerRecord => {
    const existing = records.get(args.ownerId)
    if (existing && (args.runtimeInstanceId === undefined || existing.runtimeInstanceId === args.runtimeInstanceId)) {
      return existing
    }
    return createRecord(args)
  }

  const bindRuntime = (args: LogixDevLifecycleBindRuntimeArgs): LogixDevLifecycleRuntimeBinding => {
    const existing = records.get(args.ownerId)
    const record =
      existing && existing.runtime && existing.runtime !== args.runtime && args.runtimeInstanceId === undefined
        ? createRecord(args)
        : ensureRecord(args)
    RuntimeContracts.bindRuntimeHotLifecycleOwner(args.runtime as unknown as object, record.owner)

    record.setRuntime(args.runtime)
    record.setCleanup(args.cleanup)
    records.set(args.ownerId, record)

    const reactBinding = createReactHotLifecycleBinding({
      runtime: args.runtime,
      ownerId: args.ownerId,
      runtimeInstanceId: record.runtimeInstanceId,
      cleanup: args.cleanup,
    })
    RuntimeContracts.bindRuntimeHotLifecycleOwner(args.runtime as unknown as object, reactBinding.owner)

    return {
      ownerId: args.ownerId,
      runtime: args.runtime,
      runtimeInstanceId: record.runtimeInstanceId,
      owner: reactBinding.owner,
      layer: record.layer,
      reset: (resetArgs) => {
        const targetRuntimeInstanceId = resetArgs.nextRuntime
          ? getReactRuntimeInstanceId(
              resetArgs.nextRuntime,
              resetArgs.nextRuntimeInstanceId ?? nextRuntimeInstanceId(args.ownerId),
            )
          : (resetArgs.nextRuntimeInstanceId ?? nextRuntimeInstanceId(args.ownerId))
        if (resetArgs.nextRuntime) {
          RuntimeContracts.bindRuntimeHotLifecycleOwner(resetArgs.nextRuntime as unknown as object, reactBinding.owner)
        }
        return reactBinding.owner.reset({
          nextRuntimeInstanceId: targetRuntimeInstanceId,
          reason: resetArgs.reason ?? 'hot-update',
          hostCleanupSummary: resetArgs.hostCleanupSummary ?? disposeHostBindingsForRuntime(args.runtime),
        })
      },
      dispose: (disposeArgs) =>
        reactBinding.owner.dispose({
          reason: disposeArgs?.reason ?? 'dispose-without-successor',
          hostCleanupSummary: disposeArgs?.hostCleanupSummary ?? disposeHostBindingsForRuntime(args.runtime),
        }),
    }
  }

  const carrier: LogixDevLifecycleCarrier = {
    carrierId,
    hostKind,
    layerForRuntime: (args) => createRecord(args).layer,
    bindRuntime,
    reset: (args) => {
      const record = records.get(args.ownerId)
      if (!record) return Effect.succeed(undefined)
      const targetRuntimeInstanceId = args.nextRuntime
        ? getReactRuntimeInstanceId(args.nextRuntime, args.nextRuntimeInstanceId ?? nextRuntimeInstanceId(args.ownerId))
        : (args.nextRuntimeInstanceId ?? nextRuntimeInstanceId(args.ownerId))
      if (args.nextRuntime) {
        RuntimeContracts.bindRuntimeHotLifecycleOwner(args.nextRuntime as unknown as object, record.owner)
      }
      return record.owner.reset({
        nextRuntimeInstanceId: targetRuntimeInstanceId,
        reason: args.reason ?? 'hot-update',
        hostCleanupSummary:
          args.hostCleanupSummary ?? (record.runtime ? disposeHostBindingsForRuntime(record.runtime) : undefined),
      })
    },
    dispose: (args) => {
      const record = records.get(args.ownerId)
      if (!record) return Effect.succeed(undefined)
      return record.owner
        .dispose({
          reason: args.reason ?? 'dispose-without-successor',
          hostCleanupSummary:
            args.hostCleanupSummary ?? (record.runtime ? disposeHostBindingsForRuntime(record.runtime) : undefined),
        })
        .pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              records.delete(args.ownerId)
            }),
          ),
        )
    },
    getOwner: (ownerId) => records.get(ownerId)?.owner,
  }

  return carrier
}
