import type * as LogixCore from "@logix/core"
import type { Schema } from "effect/Schema"

import type { FormCore } from "./domain"

// 地址设置表单：演示数组字段与 array/* Action 的类型使用。

export namespace AddressForm {
  export interface AddressLine {
    id: string
    label: string
    detail: string
  }

  export interface Values {
    defaultCountry: string
    addresses: AddressLine[]
  }

  export type State = FormCore.FormState<Values>

  export interface ActionMap extends Record<string, FormCore.AnySchema> {
    "field/change": Schema<{ path: string; value: unknown }>
    "field/blur": Schema<{ path: string }>
    "field/focus": Schema<{ path: string }>
    "array/append": Schema<{ path: string; value: unknown }>
    "array/remove": Schema<{ path: string; index: number }>
    "form/submit": Schema<{ trigger?: string }>
  }

  export type Shape = FormCore.FormShape<Values, ActionMap>

  export type ModuleInstance = LogixCore.ModuleInstance<"AddressForm", Shape>
}

export declare const AddressFormModule: AddressForm.ModuleInstance
