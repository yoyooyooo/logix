import { Schema } from "effect"
import type * as LogixCore from "@logix/core"

// 基础 Form 类型出口（库级别）。
// 仅包含接口与类型别名，不包含任何具体实现。

export namespace FormCore {
  export interface FormIssue {
    code: string
    message: string
    severity: "error" | "warning" | "info"
    path: string
  }

  export interface FieldState {
    touched: boolean
    dirty: boolean
    validating: boolean
    focused: boolean
    issues: FormIssue[]
  }

  export interface UIState {
    fields: Record<string, FieldState>
    meta: {
      isValid: boolean
      isSubmitting: boolean
      isValidating: boolean
      isDirty: boolean
      submitCount: number
      allIssues: FormIssue[]
    }
  }

  export interface FormState<TValues> {
    values: TValues
    ui: UIState
    config?: FormConfig<TValues>
  }

  export type ValidationMode = "onChange" | "onBlur" | "onSubmit" | "all"

  export interface FormConfig<TValues> {
    readonly initialValues: TValues
    readonly schema?: Schema.Schema<TValues, any, any>
    readonly mode?: ValidationMode
    readonly reValidateMode?: ValidationMode
    readonly debounceMs?: number
  }

  export type FormAction =
    | { _tag: "field/change"; payload: { path: string; value: unknown } }
    | { _tag: "field/blur"; payload: { path: string } }
    | { _tag: "field/focus"; payload: { path: string } }
    | { _tag: "array/append"; payload: { path: string; value: unknown } }
    | { _tag: "array/prepend"; payload: { path: string; value: unknown } }
    | { _tag: "array/remove"; payload: { path: string; index: number } }
    | {
        _tag: "array/swap"
        payload: { path: string; indexA: number; indexB: number }
      }
    | {
        _tag: "array/move"
        payload: { path: string; from: number; to: number }
      }
    | { _tag: "form/submit"; payload?: { trigger?: string } }
    | { _tag: "form/reset"; payload?: { values?: unknown } }
    | { _tag: "form/validate"; payload?: { paths?: string[] } }
    | { _tag: "form/setValues"; payload: { values: unknown } }

  export type AnySchema = Schema.Schema<any, any, any>

  export type SchemaOf<T> = Schema.Schema<T, any, any>

  export type FormShape<
    TValues,
    TActionMap extends Record<string, AnySchema>
  > = LogixCore.Shape<SchemaOf<FormState<TValues>>, TActionMap>
}
