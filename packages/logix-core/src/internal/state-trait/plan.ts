import type { StateTraitPlan, StateTraitProgram } from "./model.js"

/**
 * Plan（Phase 2 骨架）。
 *
 * - 当前 build.ts 已生成一个最小 Plan；
 * - 后续 Phase 会把 topo sort / microtask batching / 0/1 commit 等约束落在 Plan 执行层。
 */
export const getPlan = (
  program: StateTraitProgram<any>,
): StateTraitPlan => program.plan

