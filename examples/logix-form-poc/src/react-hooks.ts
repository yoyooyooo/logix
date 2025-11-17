import type { FormCore } from './domain'

// React 层只做：ModuleRuntime 的投影 + DOM 事件适配。
// 这里仅声明 Hook 类型，不提供实现。

export namespace FormReact {
  export interface FormController<TValues> {
    readonly getState: () => FormCore.FormState<TValues>
    readonly dispatch: (action: FormCore.FormAction) => void
  }

  export interface ChangeEventLike {
    readonly target: { readonly value: unknown }
  }

  export interface UseFieldReturn<TValue> {
    value: TValue
    isTouched: boolean
    isDirty: boolean
    isValidating: boolean
    error?: string
    issues: FormCore.FormIssue[]
    onChange: (value: TValue | ChangeEventLike) => void
    onBlur: () => void
    onFocus: () => void
  }

  export interface UseFieldArrayReturn<TItem> {
    fields: Array<{ id: string } & TItem>
    append: (value: TItem) => void
    prepend: (value: TItem) => void
    remove: (index: number) => void
    swap: (indexA: number, indexB: number) => void
    move: (from: number, to: number) => void
    replace: (values: TItem[]) => void
  }

  export declare function useForm<TValues>(module: unknown): FormController<TValues>

  export declare function useField<TValues, TValue>(
    controller: FormController<TValues>,
    path: string,
  ): UseFieldReturn<TValue>

  export declare function useFieldArray<TValues, TItem>(
    controller: FormController<TValues>,
    path: string,
  ): UseFieldArrayReturn<TItem>
}
