// Public barrel for @logixjs/core
// Recommended usage:
//   import * as Logix from '@logixjs/core'
// Then `Logix` exposes Module / State / Actions / Logic / Bound / Handle / Link / Flow / Runtime / Debug namespaces.

// Core module API: Module / ModuleRuntime / ModuleImpl / StateOf / ActionOf / Reducer, etc.
export * as Module from './Module.js'
export type * from './Module.js'
export * as ModuleTag from './ModuleTag.js'
export type { ModuleTag as ModuleTagType, ModuleRuntimeTag } from './internal/module.js'
export * as State from './State.js'
export * as Actions from './Actions.js'
export * as Action from './Action.js'

// Logic / Bound / Link: orchestration and cross-module access
export * as Logic from './Logic.js'
export * as Bound from './Bound.js'
export * as Link from './Link.js'
export * as Process from './Process.js'
export * as Handle from './Handle.js'

// Flow & DSL: fluent orchestration tools for application code
export * as Flow from './Flow.js'
export * as Workflow from './Workflow.js'
export * as MatchBuilder from './MatchBuilder.js'

// ReadQuery: protocolized state reads (selectorId/deps/lane/strict gate entry point)
export * as ReadQuery from './ReadQuery.js'

// ExternalStore: normalized external input sources (sync snapshot + subscribe)
export * as ExternalStore from './ExternalStore.js'

// StateTrait: field capabilities and StateTrait kernel (see specs/000-module-traits-runtime)
export * as StateTrait from './StateTrait.js'

// TraitLifecycle: unified lower-level interface for domain packages (Form/Query/...) (see specs/007-unify-trait-system)
export * as TraitLifecycle from './TraitLifecycle.js'

// Resource: resource specs and registry (see specs/000-module-traits-runtime/references/resource-and-query.md)
export * as Resource from './Resource.js'

// Runtime: application runtime (Logix.Runtime.make, etc.)
export * as Runtime from './Runtime.js'
export type {
  ConcurrencyLimit,
  ConcurrencyPolicy,
  ConcurrencyPolicyOverrides,
  ConcurrencyPolicyPatch,
} from './internal/runtime/core/env.js'

// Kernel: replaceable kernel contract (requested kernel family + runtime services evidence accessors)
export * as Kernel from './Kernel.js'

// ScopeRegistry: scope-bound registry isolated by runtime tree (for reusing the same scope across paths)
export * as ScopeRegistry from './ScopeRegistry.js'

// Root: explicit root provider resolution entry (ignores local overrides)
export * as Root from './Root.js'

// Env: unified runtime env detection (avoid bundler-inlined NODE_ENV)
export * as Env from './Env.js'

// Debug & Platform: debugging and platform integration
export * as Debug from './Debug.js'
export * from './Debug.js'
export type { SnapshotToken } from './Debug.js'
export { getDevtoolsSnapshotToken } from './Debug.js'
export * as Middleware from './Middleware.js'
export * as Platform from './Platform.js'

// Observability protocol: exportable evidence package and envelope across hosts (see specs/005-*)
export * as Observability from './Observability.js'

// Reflection: IR export + trial-run entry for platform/CI/agents (see specs/025-*)
export * as Reflection from './Reflection.js'

// Internal contracts: in-repo integration surface (instead of runtime.__* direct reads)
export * as InternalContracts from './internal/InternalContracts.js'
