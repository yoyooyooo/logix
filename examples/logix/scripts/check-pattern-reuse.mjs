import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const packageRoot = path.resolve(path.dirname(scriptPath), '..')

const relativeToPkg = (filePath) => path.relative(packageRoot, filePath).replaceAll(path.sep, '/')

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'))

const listFilesRecursively = async (dirPath) => {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) return listFilesRecursively(fullPath)
      if (entry.isFile()) return [fullPath]
      return []
    }),
  )
  return files.flat()
}

const main = async () => {
  const configPath = path.join(packageRoot, 'pattern-reuse.config.json')
  const config = await readJson(configPath)

  const minConsumers = Number(config.minConsumers ?? 2)
  const allowlist = new Set(Array.isArray(config.allowlist) ? config.allowlist : [])

  const patternsDir = path.join(packageRoot, 'src/patterns')
  const scenariosDir = path.join(packageRoot, 'src/scenarios')

  const patternFiles = (await readdir(patternsDir, { withFileTypes: true }))
    .filter((e) => e.isFile() && e.name.endsWith('.ts'))
    .map((e) => path.join(patternsDir, e.name))
    .sort((a, b) => a.localeCompare(b))

  const patternNames = patternFiles.map((file) => path.basename(file, '.ts'))

  const scenarioFiles = (await listFilesRecursively(scenariosDir))
    .filter((file) => file.endsWith('.ts'))
    .sort((a, b) => a.localeCompare(b))

  const scenarioContents = new Map()
  await Promise.all(
    scenarioFiles.map(async (file) => {
      scenarioContents.set(file, await readFile(file, 'utf8'))
    }),
  )

  const consumerMap = new Map(patternNames.map((name) => [name, []]))

  for (const scenarioFile of scenarioFiles) {
    const content = scenarioContents.get(scenarioFile) ?? ''
    for (const patternName of patternNames) {
      const re = new RegExp(String.raw`patterns/${patternName}\.(js|ts)\b`, 'g')
      if (re.test(content)) {
        consumerMap.get(patternName)?.push(scenarioFile)
      }
    }
  }

  const violations = []
  const allowlistedButBelowMin = []

  for (const patternName of patternNames) {
    const consumers = consumerMap.get(patternName) ?? []
    const count = consumers.length

    if (count >= minConsumers) continue

    if (allowlist.has(patternName)) {
      allowlistedButBelowMin.push({ patternName, count, consumers })
      continue
    }

    violations.push({ patternName, count, consumers })
  }

  if (violations.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`[pattern-reuse] 发现 ${violations.length} 个 Pattern 未满足最小复用（min=${minConsumers}）：`)
    for (const v of violations) {
      // eslint-disable-next-line no-console
      console.error(`- ${v.patternName}: consumers=${v.count}`)
      for (const consumer of v.consumers) {
        // eslint-disable-next-line no-console
        console.error(`  - ${relativeToPkg(consumer)}`)
      }
    }

    // eslint-disable-next-line no-console
    console.error('')
    // eslint-disable-next-line no-console
    console.error('修复方式：')
    // eslint-disable-next-line no-console
    console.error(`1) 让该 Pattern 至少被 ${minConsumers} 个场景引用；或`)
    // eslint-disable-next-line no-console
    console.error(`2) 把它加入 allowlist：${relativeToPkg(configPath)}`)

    process.exitCode = 1
    return
  }

  if (allowlistedButBelowMin.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[pattern-reuse] allowlist（允许 < ${minConsumers} consumers）：`)
    for (const item of allowlistedButBelowMin) {
      // eslint-disable-next-line no-console
      console.log(`- ${item.patternName}: consumers=${item.count}`)
      for (const consumer of item.consumers) {
        // eslint-disable-next-line no-console
        console.log(`  - ${relativeToPkg(consumer)}`)
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[pattern-reuse] ok (patterns=${patternNames.length}, scenarios=${scenarioFiles.length}, min=${minConsumers})`)
}

await main()

