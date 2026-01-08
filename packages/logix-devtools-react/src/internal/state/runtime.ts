import * as Logix from '@logixjs/core'
import { Layer } from 'effect'
import { devtoolsSnapshotLayer } from '../snapshot/index.js'
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
  // Provides DevtoolsSnapshotStore Service for DevtoolsModule,
  // so Logic can subscribe to Snapshot changes via Tag.
  layer: devtoolsSnapshotLayer as Layer.Layer<any, never, never>,
})

export const devtoolsModuleRuntime = devtoolsRuntime.runSync(DevtoolsModule.tag)
