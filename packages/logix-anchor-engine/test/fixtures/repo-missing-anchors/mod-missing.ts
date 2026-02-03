import * as Logix from '@logixjs/core'
import { Schema } from 'effect'

export const ModMissingServices = Logix.Module.make('missingServices', {
  state: Schema.Struct({}),
  actions: {},
})

export const ModMissingDevSource = Logix.Module.make('missingDevSource', {
  state: Schema.Struct({}),
  actions: {},
  services: {},
  dev: {},
})

export const ModHasDevSource = Logix.Module.make('hasDevSource', {
  state: Schema.Struct({}),
  actions: {},
  services: {},
  dev: { source: { file: 'mod-missing.ts', line: 1, column: 1 } },
})

