// TraitLifecycle core model (Phase 2 placeholder).
// - A bridging protocol that feature packages (Form/Query, etc.) can depend on uniformly.
// - Defines only serializable/comparable request and target representations, without locking in runtime implementation details.

export type FieldRef =
  | { readonly kind: 'field'; readonly path: string }
  | {
      readonly kind: 'list'
      readonly path: string
      readonly listIndexPath?: ReadonlyArray<number>
    }
  | {
      readonly kind: 'item'
      readonly path: string
      readonly listIndexPath?: ReadonlyArray<number>
      readonly index: number
      readonly field?: string
    }
  | { readonly kind: 'root' }

export type ValidateMode = 'submit' | 'blur' | 'valueChange' | 'manual'

export interface ValidateRequest {
  readonly mode: ValidateMode
  readonly target: FieldRef
}

export type ExecuteRequest =
  | { readonly kind: 'source:refresh'; readonly target: FieldRef }
  | { readonly kind: 'query:invalidate'; readonly request: unknown }

export type CleanupRequest =
  | { readonly kind: 'field:unregister'; readonly target: FieldRef }
  | { readonly kind: 'list:item:remove'; readonly target: FieldRef }
  | { readonly kind: 'list:reorder'; readonly target: FieldRef }
