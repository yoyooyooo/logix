import { Effect } from '../effect'
import { FileSystem } from '../services'

// ===== Intent 类型（简化版） =====

export interface IntentSceneLayoutRegion {
  id: string
  label: string
  role: 'filter-bar' | 'toolbar' | 'data-table' | string
}

export interface IntentScene {
  type: 'list-page' | 'workbench' | string
  layout?: {
    regions: IntentSceneLayoutRegion[]
  }
}

export interface IntentEntityField {
  name: string
  type: string
}

export interface IntentEntity {
  name: string
  fields: IntentEntityField[]
}

export interface IntentApiParam {
  name: string
  type: string
  optional?: boolean
}

export interface IntentApi {
  name: string
  path: string
  method: string
  query?: IntentApiParam[]
  body?: IntentApiParam[]
  returns?: string
}

export interface IntentPatternConfig {
  id: string
  target?: string
  config?: Record<string, unknown>
}

export interface Intent {
  id: string
  title: string
  description?: string
  goals?: string[]
  scene: IntentScene
  patterns?: IntentPatternConfig[]
  domain: {
    entities: IntentEntity[]
    apis: IntentApi[]
  }
}

// ===== Intent 读写骨架 =====

export interface IntentRepo {
  loadIntent(id: string): Effect<FileSystem, Error, Intent>
}

export const makeIntentRepo = (baseDir: string): IntentRepo => {
  const filePath = (id: string) =>
    `${baseDir.replace(/\/$/, '')}/intents/${id}.intent.yaml`

  return {
    loadIntent: (id) => async (fs) => {
      const path = filePath(id)
      const raw = await fs.read(path)
      // 解析 YAML（PoC：依赖仓库已有的 yaml 包）
      const { parse } = await import('yaml')
      const obj = parse(raw) as Intent
      return obj
    },
  }
}
