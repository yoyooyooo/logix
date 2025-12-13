import { Effect } from "effect"
import type { Event, Sink } from "./DebugSink.js"

/**
 * DevtoolsHub：
 * - 进程/页面级的 Debug 事件聚合器（全局单例）。
 *
 * 注意：该 Hub 仅在显式启用 devtoolsHubLayer 时才会被挂入 Debug sinks，
 * 但 Snapshot API 本身始终可用（未启用时返回空快照）。
 *
 * 性能说明：
 * - Devtools 的 Debug 事件在高频场景会非常密集（EffectOp / Trait / StateTxn 等）；
 * - 旧实现会在每条事件到来时复制 ringBuffer 与 Map 来构造“不可变快照”，成本为 O(bufferSize)；
 * - 当前实现改为：Snapshot 直接引用内部的 Map/Array（只读约定），并在微任务中批量通知订阅者；
 *   这样避免 per-event 拷贝，显著降低对业务渲染/输入的主线程干扰。
 */

export interface DevtoolsSnapshot {
  readonly instances: ReadonlyMap<string, number>
  readonly events: ReadonlyArray<Event>
  readonly latestStates: ReadonlyMap<string, unknown>
}

export interface DevtoolsHubOptions {
  readonly bufferSize?: number
}

// ---- Global mutable state (singleton) ----

const instances = new Map<string, number>()
const latestStates = new Map<string, unknown>()
const instanceLabels = new Map<string, string>()

let bufferSize = 500
const ringBuffer: Event[] = []

// Snapshot 直接引用内部结构（只读约定），避免高频场景下的拷贝成本。
const currentSnapshot: DevtoolsSnapshot = {
  instances,
  events: ringBuffer,
  latestStates,
}

const listeners = new Set<() => void>()

let notifyScheduled = false
const scheduleNotify = () => {
  if (notifyScheduled) return
  notifyScheduled = true
  queueMicrotask(() => {
    notifyScheduled = false
    for (const listener of listeners) {
      listener()
    }
  })
}

let devtoolsEnabled = false

export const configureDevtoolsHub = (options?: DevtoolsHubOptions) => {
  devtoolsEnabled = true
  if (typeof options?.bufferSize === "number" && Number.isFinite(options.bufferSize)) {
    const next = Math.floor(options.bufferSize)
    bufferSize = next > 0 ? next : bufferSize
    // 若缩小 bufferSize，裁剪旧事件窗口。
    if (ringBuffer.length > bufferSize) {
      ringBuffer.splice(0, ringBuffer.length - bufferSize)
    }
    scheduleNotify()
  }
}

export const isDevtoolsEnabled = (): boolean => devtoolsEnabled

// ---- Snapshot public helpers ----

export const getDevtoolsSnapshot = (): DevtoolsSnapshot => currentSnapshot

export const subscribeDevtoolsSnapshot = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const clearDevtoolsEvents = (): void => {
  ringBuffer.length = 0
  scheduleNotify()
}

export const setInstanceLabel = (runtimeId: string, label: string): void => {
  instanceLabels.set(runtimeId, label)
  scheduleNotify()
}

export const getInstanceLabel = (runtimeId: string): string | undefined =>
  instanceLabels.get(runtimeId)

// ---- Hub Sink ----

export const devtoolsHubSink: Sink = {
  record: (event: Event) =>
    Effect.sync(() => {
      // trace:instanceLabel：为 runtime 实例设置易读名称。
      if (event.type === "trace:instanceLabel") {
        const runtimeId = (event as any).runtimeId as string | undefined
        const data = (event as any).data
        const label =
          data && typeof data === "object" && "label" in data
            ? String((data as any).label)
            : undefined
        if (runtimeId && label) {
          instanceLabels.set(runtimeId, label)
        }
      }

      // 实例计数：按 runtimeLabel::moduleId 维度维护活跃实例数量。
      if (event.type === "module:init" || event.type === "module:destroy") {
        const moduleId = (event as any).moduleId ?? "unknown"
        const runtimeLabel = (event as any).runtimeLabel ?? "unknown"
        const key = `${runtimeLabel}::${moduleId}`
        const prev = instances.get(key) ?? 0
        if (event.type === "module:init") {
          instances.set(key, prev + 1)
        } else {
          const next = prev - 1
          if (next <= 0) {
            instances.delete(key)
          } else {
            instances.set(key, next)
          }
        }
      }

      // latestStates：按 runtimeLabel::moduleId::runtimeId 记录最新 state:update 快照。
      if (event.type === "state:update") {
        const moduleId = (event as any).moduleId ?? "unknown"
        const runtimeLabel = (event as any).runtimeLabel ?? "unknown"
        const runtimeId = (event as any).runtimeId ?? "unknown"
        const key = `${runtimeLabel}::${moduleId}::${runtimeId}`
        latestStates.set(key, (event as any).state)
      }

      // module:destroy 时清理实例标签。
      if (event.type === "module:destroy") {
        const runtimeId = (event as any).runtimeId as string | undefined
        if (runtimeId) {
          instanceLabels.delete(runtimeId)
        }
      }

      // ring buffer：保留最近 bufferSize 条 Debug.Event。
      if (bufferSize > 0) {
        if (ringBuffer.length >= bufferSize) {
          ringBuffer.shift()
        }
        ringBuffer.push(event)
      }

      scheduleNotify()
    }),
}
