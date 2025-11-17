import type { StateTraitPlan, StateTraitProgram } from './model.js'

/**
 * Plan (Phase 2 skeleton).
 *
 * - build.ts already produces a minimal Plan today.
 * - Later phases will enforce topo sort / microtask batching / 0/1 commit constraints in the plan execution layer.
 */
export const getPlan = (program: StateTraitProgram<any>): StateTraitPlan => program.plan
