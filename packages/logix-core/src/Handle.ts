import type { AnyModuleShape, ModuleHandle } from './internal/module.js'

/**
 * Handle（消费面）: 在 `.logic()` 内消费依赖的“可用视图”。
 *
 * - `ModuleHandle`: `yield* $.use(SomeModule)` 返回的只读句柄（read/changes/dispatch/actions）。
 * - `ServiceHandle`: `yield* $.use(ServiceTag)` 返回的 Service 实例（推荐同样提供 `.controller` 作为命令面）。
 *
 * 设计目标：
 * - 为“做成自定义 Module” vs “做成可注入 Service（Tag + Layer）”提供统一语言与判断依据；
 * - 让业务逻辑消费方式趋同：拿到 handle → read/observe → 通过 controller 发命令（若存在）。
 */

export interface WithController<C extends object = object> {
  readonly controller: C
}

export type ControllerOf<T> = T extends WithController<infer C> ? C : never

export type ServiceHandle<Svc extends object> = Svc

export const isModuleHandle = (value: unknown): value is ModuleHandle<AnyModuleShape> => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as any
  return (
    typeof v.read === 'function' &&
    typeof v.changes === 'function' &&
    typeof v.dispatch === 'function' &&
    typeof v.actions === 'object' &&
    v.actions !== null &&
    typeof v.actions$ === 'object' &&
    v.actions$ !== null
  )
}

export const hasController = (value: unknown): value is WithController => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as any
  return typeof v.controller === 'object' && v.controller !== null
}

