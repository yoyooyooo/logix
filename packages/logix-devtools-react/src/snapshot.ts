import * as Logix from "@logix/core"
import { Context, Effect, Layer, Stream } from "effect"

/**
 * 说明：
 * - 自 003-trait-txn-lifecycle 起，DevtoolsHub 已下沉到 @logix/core（全局单例）。
 * - 本文件仅作为薄适配层：
 *   - 继续导出 DevtoolsSnapshotStore / devtoolsSnapshotLayer 供 DevtoolsModule 使用；
 *   - 继续导出 devtoolsLayer 作为历史兼容入口（deprecated）。
 */

export type DevtoolsSnapshot = Logix.Debug.DevtoolsSnapshot

export const getDevtoolsSnapshot = Logix.Debug.getDevtoolsSnapshot
export const subscribeDevtoolsSnapshot = Logix.Debug.subscribeDevtoolsSnapshot
export const clearDevtoolsEvents = Logix.Debug.clearDevtoolsEvents
export const setInstanceLabel = Logix.Debug.setInstanceLabel
export const getInstanceLabel = Logix.Debug.getInstanceLabel

/**
 * devtoolsLayer（deprecated）：
 * - 旧版需要显式 Layer.replace(DebugSinks)，现已改为 core Hub 追加 sinks；
 * - 推荐直接使用 Runtime.make(..., { devtools: true })。
 */
export const devtoolsLayer: Layer.Layer<any, never, never> =
  Logix.Debug.devtoolsHubLayer() as Layer.Layer<any, never, never>

export interface DevtoolsSnapshotService {
  readonly get: Effect.Effect<DevtoolsSnapshot>
  readonly changes: Stream.Stream<DevtoolsSnapshot>
}

/**
 * DevtoolsSnapshotStore：
 * - 作为 Env Service 暴露给 Devtools Runtime 使用；
 * - 供 DevtoolsModule 订阅 Snapshot 变化并派生 DevtoolsState。
 */
export class DevtoolsSnapshotStore extends Context.Tag(
  "Logix/DevtoolsSnapshotStore",
)<DevtoolsSnapshotStore, DevtoolsSnapshotService>() {}

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

export const devtoolsSnapshotLayer: Layer.Layer<
  DevtoolsSnapshotStore,
  never,
  never
> = Layer.succeed(DevtoolsSnapshotStore, devtoolsSnapshotService)
