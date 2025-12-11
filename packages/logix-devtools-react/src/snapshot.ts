import * as Logix from "@logix/core"
import { Effect, Layer } from "effect"

// DevTools 状态结构：模块实例计数 + 最近事件窗口
export interface DevtoolsSnapshot {
  readonly instances: ReadonlyMap<string, number>
  readonly events: ReadonlyArray<Logix.Debug.Event>
  readonly latestStates: ReadonlyMap<string, unknown>
}

// 基于 Debug 提供的工具组合出一个 DevTools 专用 Snapshot Store
const instanceCounter = Logix.Debug.makeModuleInstanceCounterSink()
const ringBuffer = Logix.Debug.makeRingBufferSink(500)
const latestStates = new Map<string, unknown>()
const instanceLabels = new Map<string, string>()

let currentSnapshot: DevtoolsSnapshot = {
  instances: instanceCounter.getSnapshot(),
  events: ringBuffer.getSnapshot(),
  latestStates: new Map(),
}

const listeners = new Set<() => void>()

// 为避免在 React render 阶段同步触发订阅回调（导致 “Cannot update a component while rendering另一个组件”），
// 这里将通知调度到微任务队列中批量触发。
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

const recomputeSnapshot = () => {
  currentSnapshot = {
    instances: instanceCounter.getSnapshot(),
    events: ringBuffer.getSnapshot(),
    latestStates: new Map(latestStates),
  }
  scheduleNotify()
}

const devtoolsSink: Logix.Debug.Sink = {
  record: (event: Logix.Debug.Event) =>
    Effect.gen(function* () {
      // trace:instanceLabel 事件：用于为指定 ModuleRuntime 实例设置更友好的显示名称。
      if (event.type === "trace:instanceLabel") {
        const runtimeId =
          "runtimeId" in event && event.runtimeId
            ? event.runtimeId
            : undefined
        const label =
          typeof (event as any).data === "object" &&
          event.data !== null &&
          "label" in (event as any).data
            ? String((event as any).data.label)
            : undefined
        if (runtimeId && label) {
          instanceLabels.set(runtimeId, label)
        }
      }

      if (event.type === "state:update") {
        const moduleId =
          "moduleId" in event && event.moduleId
            ? event.moduleId
            : "unknown"
        const runtimeLabel =
          "runtimeLabel" in event && event.runtimeLabel
            ? event.runtimeLabel
            : "unknown"
        const runtimeId =
          "runtimeId" in event && event.runtimeId
            ? event.runtimeId
            : "unknown"
        const key = `${runtimeLabel}::${moduleId}::${runtimeId}`
        latestStates.set(key, event.state)
      }
      if (event.type === "module:destroy") {
        const runtimeId =
          "runtimeId" in event && event.runtimeId
            ? event.runtimeId
            : undefined
        if (runtimeId) {
          instanceLabels.delete(runtimeId)
        }
      }
      // 将事件传递给内部两个 Sink
      yield* instanceCounter.sink.record(event)
      yield* ringBuffer.sink.record(event)
      yield* Effect.sync(recomputeSnapshot)
    }),
}

/** 供 DevtoolsModule 读取的只读 Snapshot */
export const getDevtoolsSnapshot = (): DevtoolsSnapshot => currentSnapshot

/** 供 DevtoolsModule 订阅 Snapshot 变更 */
export const subscribeDevtoolsSnapshot = (
  listener: () => void,
): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 清空当前事件窗口（供 DevtoolsModule 的 clearEvents Action 使用） */
export const clearDevtoolsEvents = (): void => {
  ringBuffer.clear()
  recomputeSnapshot()
}

/** 为指定 ModuleRuntime 实例设置一个易读的显示名称（基于 runtime.id）。 */
export const setInstanceLabel = (runtimeId: string, label: string): void => {
  instanceLabels.set(runtimeId, label)
  scheduleNotify()
}

/** 供 UI 消费的实例标签读取函数，若未设置则返回 undefined。 */
export const getInstanceLabel = (runtimeId: string): string | undefined =>
  instanceLabels.get(runtimeId)

/**
 * devtoolsLayer：
 * - 使用 Debug.replace 将 DebugSink 集合替换为仅包含 DevTools Sink；
 * - 适合作为“启用 DevTools”的显式 Layer，由调用方自行决定是否叠加其他 Debug 能力。
 */
export const devtoolsLayer: Layer.Layer<any, never, never> =
  Logix.Debug.replace([devtoolsSink]) as Layer.Layer<any, never, never>
