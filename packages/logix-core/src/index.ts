// Public barrel for @logixjs/core
// Recommended usage:
//   import * as Logix from '@logixjs/core'
// Then `Logix` exposes Module / Program / Runtime as the canonical root mainline.
// Logic authoring stays on one builder path: declaration work in `Module.logic(...)`, returned effect for run.

// Core module API: Module namespace remains the canonical home for module-related types and helpers.
export * as Module from './Module.js'
export type {
  AnySchema,
  AnyModuleShape,
  ModuleShape,
  ModuleLogic,
  ModuleRuntime,
  ModuleRuntimeOfShape,
  ModuleHandle,
  MutatorsFromMap,
  ReducersFromMap,
  StateChangeWithMeta,
  StateCommitMeta,
  StateCommitMode,
  StateCommitPriority,
  ReadonlySubscriptionRef,
} from './Module.js'
export type { ModuleRuntimeTag } from './internal/module.js'

// Program / Runtime: canonical assembly and execution path
export * as Program from './Program.js'

// Runtime: canonical runtime facade (Logix.Runtime.make / Runtime.check / Runtime.trial / Runtime.run)
export * as Runtime from './Runtime.js'
export type {
  SchedulingPolicyLimit,
  SchedulingPolicySurface,
  SchedulingPolicySurfaceOverrides,
  SchedulingPolicySurfacePatch,
} from './internal/runtime/core/env.js'

export * as ControlPlane from './ControlPlane.js'
