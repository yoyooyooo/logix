import type * as LogixCore from "@logix/core"
import type { Effect } from "effect/Effect"
import type { Schema } from "effect/Schema"

import type { FormCore } from "./domain"

// 用户资料表单：仅类型与模块声明，不含实现。

export namespace UserProfileForm {
  export interface Values {
    username: string
    email: string
    phone: string
    country: string
    city: string
    marketingOptIn: boolean
  }

  export interface Services {
    readonly checkUsername: (username: string) => Effect<boolean, never, never>
  }

  export type State = FormCore.FormState<Values>

  export interface ActionMap extends Record<string, FormCore.AnySchema> {
    "field/change": Schema<{ path: string; value: unknown }>
    "field/blur": Schema<{ path: string }>
    "field/focus": Schema<{ path: string }>
    "form/submit": Schema<{ trigger?: string }>
  }

  export type Shape = FormCore.FormShape<Values, ActionMap>

  export type ModuleInstance = LogixCore.Logix.ModuleInstance<"UserProfileForm", Shape>
}

export declare const UserProfileFormModule: UserProfileForm.ModuleInstance
