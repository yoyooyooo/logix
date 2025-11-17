import type { AnyModuleShape, ModuleShape } from './internal/module.js'
import type * as Logic from './Logic.js'
import * as FlowRuntime from './internal/runtime/FlowRuntime.js'

// Flow: public API for business flow orchestration (wraps internal/runtime/FlowRuntime kernel).

export type Env<Sh extends AnyModuleShape, R = unknown> = Logic.Env<Sh, R>

export type Api<Sh extends ModuleShape<any, any>, R = never> = FlowRuntime.Api<Sh, R>

export const make = FlowRuntime.make
