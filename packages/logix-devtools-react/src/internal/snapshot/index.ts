import * as Logix from '@logix/core'
import { Context, Effect, Layer, Stream } from 'effect'

/**
 * Notes:
 * - Since 003-trait-txn-lifecycle, DevtoolsHub has been moved down into @logix/core (global singleton).
 * - This file is only a thin adapter layer:
 *   - Still exports DevtoolsSnapshotStore / devtoolsSnapshotLayer for DevtoolsModule.
 *   - Still exports devtoolsLayer as a legacy compatibility entry (deprecated).
 */

export type DevtoolsSnapshot = Logix.Debug.DevtoolsSnapshot

export const clearDevtoolsEvents = Logix.Debug.clearDevtoolsEvents
export const setInstanceLabel = Logix.Debug.setInstanceLabel
export const getInstanceLabel = Logix.Debug.getInstanceLabel

export type SnapshotToken = Logix.Debug.SnapshotToken

export type DevtoolsSnapshotOverrideInfo = {
  readonly kind: 'evidence'
  readonly evidence: Logix.Observability.EvidencePackage
}

let snapshotOverride: DevtoolsSnapshot | undefined
let snapshotOverrideInfo: DevtoolsSnapshotOverrideInfo | undefined
let overrideSnapshotToken: SnapshotToken = Number.MIN_SAFE_INTEGER

const nextOverrideSnapshotToken = (): SnapshotToken => {
  overrideSnapshotToken += 1
  return overrideSnapshotToken
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const asNonNegativeInt = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const n = Math.floor(value)
  return n >= 0 ? n : undefined
}

const normalizeTxnSeqFromTxnId = (txnId: string | undefined, instanceId: string | undefined): number | undefined => {
  if (!txnId) return undefined
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = instanceId ? txnId.match(new RegExp(`^${escapeRe(instanceId)}::t(\\d+)$`)) : txnId.match(/::t(\d+)$/)
  if (!m) return undefined
  const n = Number(m[1])
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined
}

const normalizeDevtoolsSnapshot = (snapshot: DevtoolsSnapshot): DevtoolsSnapshot => {
  const events = snapshot.events.map((e, index) => {
    if (!isRecord(e)) {
      return e as any
    }

    const instanceId = asNonEmptyString(e.instanceId)
    const txnId = asNonEmptyString(e.txnId)

    const txnSeq = asNonNegativeInt(e.txnSeq) ?? normalizeTxnSeqFromTxnId(txnId, instanceId) ?? 0

    const eventSeq = asNonNegativeInt(e.eventSeq) ?? index + 1
    const eventId =
      asNonEmptyString(e.eventId) ?? (instanceId ? `${instanceId}::e${eventSeq}` : `unknown::e${eventSeq}`)

    const patched: any = { ...e, eventId, eventSeq, txnSeq }
    if (!patched.txnId && instanceId && txnSeq > 0) {
      patched.txnId = `${instanceId}::t${txnSeq}`
    }

    return patched as any
  })

  return { ...snapshot, events } as DevtoolsSnapshot
}

const listeners = new Set<() => void>()
let unsubscribeCore: (() => void) | undefined

const notify = (): void => {
  for (const listener of listeners) {
    listener()
  }
}

const ensureCoreSubscribed = (): void => {
  if (unsubscribeCore) return
  unsubscribeCore = Logix.Debug.subscribeDevtoolsSnapshot(() => {
    // When in "offline/imported" mode, ignore live snapshot updates to avoid overwriting the imported view.
    if (snapshotOverride) return
    notify()
  })
}

export const hasDevtoolsSnapshotOverride = (): boolean => snapshotOverride != null
export const getDevtoolsSnapshotOverrideInfo = (): DevtoolsSnapshotOverrideInfo | undefined => snapshotOverrideInfo

export const setDevtoolsSnapshotOverride = (snapshot: DevtoolsSnapshot, info?: DevtoolsSnapshotOverrideInfo): void => {
  snapshotOverride = normalizeDevtoolsSnapshot({
    ...snapshot,
    snapshotToken: nextOverrideSnapshotToken(),
  })
  snapshotOverrideInfo = info
  notify()
}

export const clearDevtoolsSnapshotOverride = (): void => {
  snapshotOverride = undefined
  snapshotOverrideInfo = undefined
  notify()
}

export const getDevtoolsSnapshot = (): DevtoolsSnapshot => snapshotOverride ?? Logix.Debug.getDevtoolsSnapshot()

/**
 * SnapshotToken (safe for external subscription):
 * - `DevtoolsSnapshot` keeps a stable reference and mutates in place; subscribing to the snapshot reference directly in React may miss updates.
 * - Prefer subscribing to the token (`useSyncExternalStore(subscribe, getToken, getToken)`), and re-read snapshot when token changes.
 */
export const getDevtoolsSnapshotToken = (): SnapshotToken => getDevtoolsSnapshot().snapshotToken

export const subscribeDevtoolsSnapshot = (listener: () => void): (() => void) => {
  listeners.add(listener)
  ensureCoreSubscribed()

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && unsubscribeCore) {
      unsubscribeCore()
      unsubscribeCore = undefined
    }
  }
}

export const subscribeDevtoolsSnapshotToken = subscribeDevtoolsSnapshot

/**
 * devtoolsLayer（deprecated）：
 * - Older versions required explicit Layer.replace(DebugSinks); now the core Hub appends sinks.
 * - Prefer Runtime.make(..., { devtools: true }).
 */
export const devtoolsLayer: Layer.Layer<any, never, never> = Logix.Debug.devtoolsHubLayer() as Layer.Layer<
  any,
  never,
  never
>

export interface DevtoolsSnapshotService {
  readonly get: Effect.Effect<DevtoolsSnapshot>
  readonly changes: Stream.Stream<DevtoolsSnapshot>
}

/**
 * DevtoolsSnapshotStore：
 * - Exposed as an Env Service for Devtools Runtime.
 * - Used by DevtoolsModule to subscribe to Snapshot changes and derive DevtoolsState.
 */
export class DevtoolsSnapshotStore extends Context.Tag('Logix/DevtoolsSnapshotStore')<
  DevtoolsSnapshotStore,
  DevtoolsSnapshotService
>() {}

const devtoolsSnapshotService: DevtoolsSnapshotService = {
  get: Effect.sync(() => getDevtoolsSnapshot()),
  changes: Stream.async<DevtoolsSnapshot>((emit) => {
    const listener = () => {
      emit.single(getDevtoolsSnapshot())
    }
    const unsubscribe = subscribeDevtoolsSnapshot(listener)
    return Effect.sync(unsubscribe)
  }),
}

export const devtoolsSnapshotLayer: Layer.Layer<DevtoolsSnapshotStore, never, never> = Layer.succeed(
  DevtoolsSnapshotStore,
  devtoolsSnapshotService,
)
