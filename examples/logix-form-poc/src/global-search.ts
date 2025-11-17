import type * as LogixCore from '@logix/core'
import type { Schema } from 'effect/Schema'

import type { FormCore } from './domain'

// 全局搜索栏表单：挂在 AppRuntime 上的轻量表单。

export namespace GlobalSearchForm {
  export type StatusFilter = 'all' | 'active' | 'archived'

  export interface Values {
    keyword: string
    status: StatusFilter
  }

  export type State = FormCore.FormState<Values>

  export interface ActionMap extends Record<string, FormCore.AnySchema> {
    'field/change': Schema<{ path: string; value: unknown }>
    'field/blur': Schema<{ path: string }>
    'form/submit': Schema<{ trigger?: string }>
  }

  export type Shape = FormCore.FormShape<Values, ActionMap>

  export type ModuleTag = LogixCore.ModuleTagType<'GlobalSearchForm', Shape>
}

export declare const GlobalSearchFormModule: GlobalSearchForm.ModuleTag
