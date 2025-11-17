import { Effect } from './effect'
import { PlanningEnv } from './services'
import { IntentRepo, Intent } from './model/intent'
import { PatternRepo, PatternMatch, matchPatternsByIntent } from './model/pattern'
import { TemplateRepo, TemplateMeta } from './model/template'

// 出码计划中的单个动作
export type PlanActionType = 'create-file' | 'update-file'

export interface PlanAction {
  type: PlanActionType
  path: string
  templateId: string
  patternId: string
  params: Record<string, unknown>
}

export interface GenerationPlan {
  intentId: string
  actions: PlanAction[]
}

export interface PlanningDeps {
  intentRepo: IntentRepo
  patternRepo: PatternRepo
  templateRepo: TemplateRepo
}

function inferTargetPaths(intent: Intent, patternId: string) {
  const featureDir = `src/features/${intent.id}/`
  switch (patternId) {
    case 'table-with-server-filter':
      return [
        `${featureDir}components/${intent.id}-table.tsx`,
        `${featureDir}stores/${intent.id}-table.store.ts`,
        `${featureDir}queries/use-${intent.id}-list.hook.ts`,
      ]
    case 'filter-bar':
      return [`${featureDir}components/${intent.id}-filters.tsx`]
    case 'toolbar-with-quick-edit':
      return [
        `${featureDir}components/${intent.id}-toolbar.tsx`,
        `${featureDir}components/${intent.id}-quick-edit.tsx`,
      ]
    case 'crud-feature-skeleton':
      return [
        `${featureDir}pages/${intent.id}.page.tsx`,
        `${featureDir}stores/${intent.id}.store.ts`,
        `${featureDir}services/${intent.id}.service.ts`,
      ]
    default:
      return [`${featureDir}${patternId}.generated.txt`]
  }
}

// 入口：根据 Intent ID 构建 Plan（PoC 级逻辑）
export const buildPlan =
  (deps: PlanningDeps, intentId: string): Effect<PlanningEnv, Error, GenerationPlan> =>
  async (env) => {
    const { intentRepo, patternRepo } = deps

    env.logger.info(`[planning] building plan for intent ${intentId}`)

    // 1. 加载 Intent
    const intent: Intent = await intentRepo.loadIntent(intentId)(env.fs)

    const explicitPatternIds = new Set((intent.patterns ?? []).map((p) => p.id))
    const matches: PatternMatch[] = await matchPatternsByIntent(intent, patternRepo)
    const selected = matches.filter((m) => explicitPatternIds.has(m.pattern.id))

    if (!selected.length) {
      env.logger.warn('[planning] no explicit patterns selected')
    }

    // 2. PoC：根据 Intent.patterns 与匹配的模式生成 Plan
    const actions: PlanAction[] = []

    for (const match of selected) {
      const intentPattern = intent.patterns?.find((p) => p.id === match.pattern.id)
      const baseParams = intentPattern?.config ?? {}
      const targets = inferTargetPaths(intent, match.pattern.id)

      for (const path of targets) {
        const action: PlanAction = {
          type: 'create-file',
          path,
          templateId: match.pattern.id,
          patternId: match.pattern.id,
          params: baseParams as Record<string, unknown>,
        }
        actions.push(action)
      }
    }

    return {
      intentId,
      actions,
    }
  }
