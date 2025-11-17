import { Effect } from './effect'
import { ExecutionEnv } from './services'
import { GenerationPlan } from './planning'

// 根据 Plan 实际生成 / 修改代码（PoC 级实现）
export const executePlan =
  (plan: GenerationPlan): Effect<ExecutionEnv, Error, void> =>
  async (env) => {
    env.logger.info(
      `[execution] executing plan for intent ${plan.intentId}, actions=${plan.actions.length}`
    )

    for (const action of plan.actions) {
      env.logger.info(
        `[execution] ${action.type} ${action.path} using template ${action.templateId}`
      )

      // 1. 调用代码生成器生成文件内容
      const generatedFiles = await env.codegen.generate(
        action.templateId,
        action.params
      )

      // 2. 写入文件系统（这里只简单覆盖）
      for (const file of generatedFiles) {
        await env.fs.write(file.path, file.content)
        env.logger.info(`[execution] wrote ${file.path}`)
      }
    }
  }

