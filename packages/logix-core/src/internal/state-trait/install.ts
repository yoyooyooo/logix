import { Effect } from "effect"
import type { BoundApi } from "../runtime/core/module.js"
import * as SourceRuntime from "./source.js"
import type {
  StateTraitProgram,
  StateTraitPlanStep,
  StateTraitEntry,
} from "./model.js"

const buildEntryIndex = <S>(
  entries: ReadonlyArray<StateTraitEntry<S, string>>,
): Map<string, Array<StateTraitEntry<S, string>>> => {
  const index = new Map<string, Array<StateTraitEntry<S, string>>>()
  for (const entry of entries) {
    const list = index.get(entry.fieldPath) ?? []
    list.push(entry)
    index.set(entry.fieldPath, list)
  }
  return index
}

/**
 * 在给定 Bound API 上安装 StateTraitProgram 描述的行为。
 *
 * - Phase 2 最小实现：
 *   - 为 computed 字段注册 watcher：当 State 变化时重算目标字段；
 *   - 为 link 字段注册 watcher：当源字段变化时同步目标字段；
 *   - 为 source 字段预留刷新入口（暂不触发外部调用）。
 *
 * 说明：
 * - 所有 watcher 都通过 Bound API `$` 安装，不直接依赖 ModuleRuntime；
 * - 每个 PlanStep 对应一个长生命周期 Effect，通过 forkScoped 挂载到 Runtime Scope。
 */
export const install = <S>(
  bound: BoundApi<any, any>,
  program: StateTraitProgram<S>,
): Effect.Effect<void, never, any> => {
  // 优先将 Program 注册到 Runtime（收敛引擎在事务提交前统一执行 computed/link/check）。
  const registerProgram =
    (bound as any)
      .__registerStateTraitProgram as
    | ((p: StateTraitProgram<S>) => void)
    | undefined

  if (registerProgram) {
    registerProgram(program)
  }

  const entryIndex = buildEntryIndex(program.entries as any)

  const installStep = (
    step: StateTraitPlanStep,
  ): Effect.Effect<void, never, any> => {
    if (!step.targetFieldPath) {
      return Effect.void
    }

    if (step.kind !== "source-refresh") {
      // computed/link/check 已由 Runtime 内核在事务窗口内处理；install 阶段仅保留 source.refresh 入口。
      return Effect.void
    }

    const candidates = entryIndex.get(step.targetFieldPath)
    if (!candidates || candidates.length === 0) {
      // Plan 中引用了不存在的 Spec：视为构建阶段的 bug，这里直接忽略该步骤。
      return Effect.void
    }

    const entry = candidates.find((e) => e.kind === "source")

    if (!entry) {
      return Effect.void
    }

    return SourceRuntime.installSourceRefresh(
      bound,
      step,
      entry as any,
    )
  }

  return Effect.forEach(program.plan.steps, (step) => installStep(step)).pipe(Effect.asVoid)
}
