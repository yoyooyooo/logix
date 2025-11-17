import path from 'node:path'
import { runEffect } from './effect'
import { buildPlan, GenerationPlan } from './planning'
import { executePlan } from './execution'
import { PlanningEnv, ExecutionEnv, FileSystem, Logger, CodeGen } from './services'
import { makeIntentRepo } from './model/intent'
import { PatternRepo, PatternMeta } from './model/pattern'
import { TemplateRepo, TemplateMeta } from './model/template'

// ==== 非生产级简单实现，只用于 PoC ====

const nodeFs: FileSystem = {
  read: async (filePath) => {
    const fs = await import('fs/promises')
    return fs.readFile(filePath, 'utf8')
  },
  write: async (filePath, content) => {
    const fs = await import('fs/promises')
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf8')
  },
  exists: async (filePath) => {
    const fs = await import('fs/promises')
    try {
      await fs.stat(filePath)
      return true
    } catch {
      return false
    }
  },
}

const consoleLogger: Logger = {
  info: (msg) => console.log(msg),
  warn: (msg) => console.warn(msg),
  error: (msg) => console.error(msg),
}

const dummyCodeGen: CodeGen = {
  async generate(templateId, params) {
    // 这里只是示意：真实实现会根据 templateId + params 选择模板并渲染内容。
    const content = `// generated from template ${templateId}\n// params: ${JSON.stringify(
      params,
      null,
      2
    )}\n`
    return [
      {
        path: `./.generated/${templateId}.txt`,
        content,
      },
    ]
  },
}

// 简化版 PatternRepo / TemplateRepo：实际项目中应从 patterns/ 与 templates/ 目录动态加载。

const basePatternMetas: PatternMeta[] = [
  {
    id: 'table-with-server-filter',
    name: '服务端筛选表格',
    applicability: {
      requiredSceneType: ['list-page', 'workbench'],
    },
  },
  {
    id: 'filter-bar',
    name: '筛选区',
    applicability: {
      requiredSceneType: ['list-page', 'workbench'],
    },
  },
  {
    id: 'toolbar-with-quick-edit',
    name: '工具栏 + 快速编辑',
    applicability: {
      requiredSceneType: ['list-page'],
    },
  },
  {
    id: 'crud-feature-skeleton',
    name: 'CRUD 特性骨架',
    applicability: {
      requiredSceneType: ['list-page'],
    },
  },
]

const inMemoryPatternRepo: PatternRepo = {
  async getById(id: string): Promise<PatternMeta | null> {
    return basePatternMetas.find((m) => m.id === id) ?? null
  },
  async listAll(): Promise<PatternMeta[]> {
    return basePatternMetas
  },
}

const inMemoryTemplateRepo: TemplateRepo = {
  async getByPattern(patternId: string): Promise<TemplateMeta[]> {
    return [] // TODO: 读取匹配该模式的模板定义
  },
}

// ==== CLI 入口：从命令行触发生成 ====

async function main() {
  const intentId = process.argv[2]
  if (!intentId) {
    console.error('Usage: node cli.js <intent-id>')
    process.exit(1)
  }

  const repoBaseDir = path.resolve(
    process.cwd(),
    'docs/specs/intent-driven-ai-coding/v1'
  )
  const intentRepo = makeIntentRepo(repoBaseDir)

  const planningEnv: PlanningEnv = {
    fs: nodeFs,
    logger: consoleLogger,
  }

  const executionEnv: ExecutionEnv = {
    fs: nodeFs,
    logger: consoleLogger,
    codegen: dummyCodeGen,
  }

  const plan: GenerationPlan = await runEffect(
    buildPlan(
      {
        intentRepo,
        patternRepo: inMemoryPatternRepo,
        templateRepo: inMemoryTemplateRepo,
      },
      intentId
    ),
    planningEnv
  )

  await runEffect(executePlan(plan), executionEnv)
}

// PoC：直接执行 main；若未来需要作为模块调用，可再拆分
// eslint-disable-next-line no-console
main().catch((err) => {
  console.error(err)
  process.exit(1)
})
