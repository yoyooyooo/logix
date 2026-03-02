import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ADAPTER_TYPES = new Set(['inline-json', 'copy-file'])
const PATH_TRAVERSAL_SEGMENT_RE = /(^|[\\/])\.\.([\\/]|$)/

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true })

const asNonEmptyString = (value, hint) => {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  throw new Error(`[scenario-fixture-adapter] ${hint} 必须是非空字符串`)
}

const assertSafeRelativePath = (value, hint) => {
  const p = asNonEmptyString(value, hint)
  if (path.isAbsolute(p) || PATH_TRAVERSAL_SEGMENT_RE.test(p)) {
    throw new Error(`[scenario-fixture-adapter] ${hint} 不能包含绝对路径或 .. 路径穿越`)
  }
  return p
}

const normalizeAdapters = (adapters) => {
  if (!Array.isArray(adapters)) return []
  return adapters.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`[scenario-fixture-adapter] adapters[${index}] 必须是对象`)
    }

    const id = asNonEmptyString(item.id, `adapters[${index}].id`)
    const kind = asNonEmptyString(item.kind, `adapters[${index}].kind`)
    if (!ADAPTER_TYPES.has(kind)) {
      throw new Error(`[scenario-fixture-adapter] adapters[${index}].kind 非法：${kind}`)
    }
    const relativePath = assertSafeRelativePath(item.path, `adapters[${index}].path`)

    if (kind === 'inline-json') {
      return {
        id,
        kind,
        path: relativePath,
        payload: item.payload,
      }
    }

    return {
      id,
      kind,
      path: relativePath,
      from: assertSafeRelativePath(item.from, `adapters[${index}].from`),
    }
  })
}

export const applyScenarioFixtureAdapters = (args) => {
  const normalized = normalizeAdapters(args.adapters ?? [])
  const outFixtureDir = path.resolve(args.outDir, 'fixtures')
  ensureDir(outFixtureDir)

  const applied = normalized.map((adapter) => {
    const target = path.resolve(outFixtureDir, adapter.path)
    ensureDir(path.dirname(target))

    if (adapter.kind === 'inline-json') {
      fs.writeFileSync(target, `${JSON.stringify(adapter.payload ?? {}, null, 2)}\n`, 'utf8')
      return {
        id: adapter.id,
        kind: adapter.kind,
        status: 'applied',
        targetPath: path.relative(args.outDir, target).split(path.sep).join('/'),
      }
    }

    const source = path.resolve(args.repoRoot, adapter.from)
    if (!fs.existsSync(source)) {
      throw new Error(`[scenario-fixture-adapter] copy-file 源不存在：${adapter.from}`)
    }
    fs.copyFileSync(source, target)
    return {
      id: adapter.id,
      kind: adapter.kind,
      status: 'applied',
      sourcePath: path.relative(args.repoRoot, source).split(path.sep).join('/'),
      targetPath: path.relative(args.outDir, target).split(path.sep).join('/'),
    }
  })

  return {
    schemaVersion: 1,
    kind: 'ScenarioFixtureAdapterReport',
    applied,
  }
}

const parseArgs = (argv) => {
  let inputPath
  let outDir
  let repoRoot = process.cwd()

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    const next = argv[i + 1]
    if (token === '--input' && typeof next === 'string') inputPath = path.resolve(process.cwd(), next)
    if (token === '--outDir' && typeof next === 'string') outDir = path.resolve(process.cwd(), next)
    if (token === '--repoRoot' && typeof next === 'string') repoRoot = path.resolve(process.cwd(), next)
    if (token?.startsWith('--')) i += 1
  }

  if (!inputPath) throw new Error('[scenario-fixture-adapter] 缺少参数 --input <playbook.json>')
  if (!outDir) throw new Error('[scenario-fixture-adapter] 缺少参数 --outDir <dir>')
  return { inputPath, outDir, repoRoot }
}

const isDirectRun = () => {
  const entry = process.argv[1]
  if (!entry) return false
  return path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url))
}

if (isDirectRun()) {
  try {
    const args = parseArgs(process.argv.slice(2))
    const playbook = JSON.parse(fs.readFileSync(args.inputPath, 'utf8'))
    const report = applyScenarioFixtureAdapters({
      repoRoot: args.repoRoot,
      outDir: args.outDir,
      adapters: playbook?.fixtures?.adapters ?? [],
    })
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  } catch (error) {
    process.stderr.write(`[scenario-fixture-adapter] fatal: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  }
}
