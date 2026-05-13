import { Effect, Schema } from 'effect'
import * as Logix from '../src/index.js'

const Child = Logix.Module.make('Child', {
  state: Schema.Struct({ value: Schema.Number }),
  actions: {},
})

const Parent = Logix.Module.make('Parent', {
  state: Schema.Struct({ ready: Schema.Boolean }),
  actions: {},
})

const ChildProgram = Logix.Program.make(Child, {
  initial: { value: 0 },
  logics: [],
})

const ParentLogic = Parent.logic('parent-ready', ($) => Effect.void)

Logix.Program.make(Parent, {
  initial: { ready: false },
  capabilities: {
    imports: [ChildProgram],
  },
  logics: [ParentLogic],
})

// @ts-expect-error id is required
Parent.logic(($) => Effect.void)

Logix.Program.make(Parent, {
  initial: { ready: false },
  // @ts-expect-error top-level imports is removed from public config
  capabilities: {
    imports: [ChildProgram],
  },
  logics: [ParentLogic],
})

// @ts-expect-error public Module.implement is removed
Parent.implement({ initial: { ready: false } })

import type { TrialOptions, TrialReport } from '../src/Runtime.js'

declare const _trialOptions: TrialOptions
declare const _trialReport: TrialReport
void _trialOptions
void _trialReport

// @ts-expect-error old public TrialRun names are removed
import type { TrialRunModuleOptions } from '../src/Runtime.js'
void (0 as unknown as TrialRunModuleOptions)

// @ts-expect-error deprecated type aliases are removed from public surface
type _Legacy = Logix.Module.ModuleDef<any, any>
