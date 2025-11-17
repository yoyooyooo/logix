import { Intent } from './intent'

// 这里只建模我们关心的一部分 Pattern 元数据，
// 完整字段可参考 patterns/table-with-server-filter.pattern.yaml。

export interface PatternRole {
  id: string
  label: string
  description?: string
}

export interface PatternApplicability {
  goodFor?: string[]
  badFor?: string[]
  requiredSceneType?: string[]
}

export interface PatternMeta {
  id: string
  name: string
  summary?: string
  applicability?: PatternApplicability
  composition?: {
    roles?: PatternRole[]
  }
  // paramsSchema / uiSchema 在 UI 层使用，这里略去细节
}

// ==== Pattern 仓库与匹配骨架 ====

export interface PatternRepo {
  getById(id: string): Promise<PatternMeta | null>
  listAll(): Promise<PatternMeta[]>
}

export interface PatternMatch {
  pattern: PatternMeta
  score: number
  reason?: string
}

// 最简单的规则匹配：只看 scene.type 与 requiredSceneType
export async function matchPatternsByIntent(
  intent: Intent,
  repo: PatternRepo
): Promise<PatternMatch[]> {
  const all = await repo.listAll()
  const sceneType = intent.scene.type

  const matches: PatternMatch[] = all.map((p) => {
    const required = p.applicability?.requiredSceneType
    if (!required || required.length === 0) {
      return { pattern: p, score: 0.5, reason: '无 scene.type 限制' }
    }
    if (required.includes(sceneType)) {
      return {
        pattern: p,
        score: 1,
        reason: `scene.type = ${sceneType} 命中 requiredSceneType`,
      }
    }
    return {
      pattern: p,
      score: 0,
      reason: `scene.type = ${sceneType} 不在 requiredSceneType 内`,
    }
  })

  return matches.filter((m) => m.score > 0).sort((a, b) => b.score - a.score)
}
