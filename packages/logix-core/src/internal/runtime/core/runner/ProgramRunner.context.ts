import type { ManagedRuntime, Scope } from 'effect'
import type { ActionOf, AnyModuleShape, BoundApi, ModuleRuntime, StateOf } from '../module.js'

export interface ProgramRunContext<Sh extends AnyModuleShape> {
  readonly scope: Scope.CloseableScope
  readonly runtime: ManagedRuntime.ManagedRuntime<any, never>
  readonly module: ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>
  readonly $: BoundApi<Sh, never>
}
