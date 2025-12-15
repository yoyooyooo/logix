// TraitLifecycle core model（Phase 2 占位版）。
// - 作为 Form/Query 等领域包统一下沉的桥接协议；
// - 只定义可序列化/可比较的请求与目标表达，不锁死具体运行时实现细节。

export type FieldRef =
  | { readonly kind: "field"; readonly path: string }
  | {
      readonly kind: "list"
      readonly path: string
      readonly listIndexPath?: ReadonlyArray<number>
    }
  | {
      readonly kind: "item"
      readonly path: string
      readonly listIndexPath?: ReadonlyArray<number>
      readonly index: number
      readonly field?: string
    }
  | { readonly kind: "root" }

export type ValidateMode = "submit" | "blur" | "valueChange" | "manual"

export interface ValidateRequest {
  readonly mode: ValidateMode
  readonly target: FieldRef
}

export type ExecuteRequest =
  | { readonly kind: "source:refresh"; readonly target: FieldRef }
  | { readonly kind: "query:invalidate"; readonly request: unknown }

export type CleanupRequest =
  | { readonly kind: "field:unregister"; readonly target: FieldRef }
  | { readonly kind: "list:item:remove"; readonly target: FieldRef }
  | { readonly kind: "list:reorder"; readonly target: FieldRef }

