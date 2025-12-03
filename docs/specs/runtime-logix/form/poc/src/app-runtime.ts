import type { Layer } from "effect/Layer"
import type { ManagedRuntime } from "effect/ManagedRuntime"

import type { UserProfileForm } from "./user-profile"
import type { AddressForm } from "./address-form"
import type { GlobalSearchForm } from "./global-search"

// AppRuntime 侧只关心「模块集合」，不关心这些模块是不是 Form。

export namespace AppRuntime {
  export type Modules =
    | UserProfileForm.ModuleInstance
    | AddressForm.ModuleInstance
    | GlobalSearchForm.ModuleInstance

  export type ModulesLayer = Layer<Modules, never, never>

  export type Runtime<R = never> = ManagedRuntime<R, never>
}
