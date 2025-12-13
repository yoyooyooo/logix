import type { StateTraitProgram } from "../../state-trait.js"
import { isDevEnv } from "../runtime/core/env.js"

// 仅用于 Debug/Devtools：按 moduleId 记录 StateTraitProgram。
// - 不参与运行时行为决策；
// - 默认在生产环境中不存储任何 Program，避免额外内存占用。

const programsById = new Map<string, StateTraitProgram<any>>()

export const registerModuleProgram = (
  moduleId: string,
  program: StateTraitProgram<any>,
): void => {
  if (!isDevEnv()) {
    // 生产环境默认不做注册，避免长生命周期的 Program 索引；
    // 如需在生产环境启用 Devtools，可后续通过环境变量或编译配置调整策略。
    return
  }
  programsById.set(moduleId, program)
}

export const getModuleProgramById = (
  moduleId: string,
): StateTraitProgram<any> | undefined => programsById.get(moduleId)
