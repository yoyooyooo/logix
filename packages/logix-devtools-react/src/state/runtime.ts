import * as Logix from '@logix/core'
import { Layer } from 'effect'
import { devtoolsSnapshotLayer } from '../snapshot.js'
import { DevtoolsLogic } from './logic.js'
import { DevtoolsModule } from './module.js'
import { emptyDevtoolsState } from './model.js'
import { loadLayoutFromStorage, loadSettingsFromStorage } from './storage.js'

const initial = {
  ...emptyDevtoolsState,
  layout: loadLayoutFromStorage() ?? emptyDevtoolsState.layout,
  settings: loadSettingsFromStorage() ?? emptyDevtoolsState.settings,
}

const DevtoolsImpl = DevtoolsModule.implement({
  initial,
  logics: [DevtoolsLogic],
})

export const devtoolsRuntime = Logix.Runtime.make(DevtoolsImpl, {
  // 为 DevtoolsModule 提供 DevtoolsSnapshotStore Service，
  // 以便在 Logic 中通过 Tag 订阅 Snapshot 变化。
  layer: devtoolsSnapshotLayer as Layer.Layer<any, never, never>,
})

export const devtoolsModuleRuntime = devtoolsRuntime.runSync(DevtoolsModule)

