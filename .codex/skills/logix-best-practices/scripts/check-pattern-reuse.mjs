import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const parseArgs = (argv) => {
  const args = new Map()
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const next = argv[index + 1]
    if (next && !next.startsWith('--')) {
      args.set(key, next)
      index++
    } else {
      args.set(key, 'true')
    }
  }
  return args
}

const usage = () => {
  // eslint-disable-next-line no-console
  console.error('Usage:')
  // eslint-disable-next-line no-console
  console.error(
    '  node check-pattern-reuse.mjs --patterns-dir src/patterns --consumer-dirs src/features,src/scenarios --min 2 --allowlist confirm,notification',
  )
  // eslint-disable-next-line no-console
  console.error('  node check-pattern-reuse.mjs --config pattern-reuse.config.json')
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'))

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  const configPath = args.get('config')
  const config = configPath ? await readJson(path.resolve(process.cwd(), configPath)) : {}

  const patternsDir = path.resolve(process.cwd(), args.get('patterns-dir') ?? config.patternsDir ?? '')
  const consumerDirsRaw = args.get('consumer-dirs') ?? config.consumerDirs ?? ''
  const consumerDirs = String(consumerDirsRaw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => path.resolve(process.cwd(), p))

  const minConsumers = Number(args.get('min') ?? config.minConsumers ?? 2)
  const allowlist = new Set(
    String(args.get('allowlist') ?? (Array.isArray(config.allowlist) ? config.allowlist.join(',') : config.allowlist ?? ''))
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )

  if (!configPath && (!args.get('patterns-dir') || consumerDirs.length === 0)) {
    usage()
    process.exitCode = 2
    return
  }

  const patternFiles = (await readdir(patternsDir, { withFileTypes: true }))
    .filter((e) => e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts'))
    .map((e) => path.join(patternsDir, e.name))
    .sort((a, b) => a.localeCompare(b))

  const patternNames = patternFiles.map((file) => path.basename(file, '.ts'))
  const consumerFiles = (
    await Promise.all(
      consumerDirs.map(async (dir) => {
        const files = await listFilesRecursively(dir)
        return files.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
      }),
    )
  )
    .flat()
    .filter((file) => !file.startsWith(patternsDir + path.sep))
    .sort((a, b) => a.localeCompare(b))

  const consumerContents = new Map()
  await Promise.all(
    consumerFiles.map(async (file) => {
      consumerContents.set(file, await readFile(file, 'utf8'))
    }),
  )

  const consumersByPattern = new Map(patternNames.map((name) => [name, new Set()]))

  for (const consumerFile of consumerFiles) {
    const content = consumerContents.get(consumerFile) ?? ''
    for (const patternName of patternNames) {
      const re = new RegExp(String.raw`patterns/${escapeRegExp(patternName)}(\.(?:js|ts|tsx))?\b`, 'g')
      if (re.test(content)) {
        consumersByPattern.get(patternName)?.add(consumerFile)
      }
    }
  }

  const violations = []
  const allowlistedButBelowMin = []

  for (const patternName of patternNames) {
    const consumers = Array.from(consumersByPattern.get(patternName) ?? [])
    const count = consumers.length
    if (count >= minConsumers) continue

    if (allowlist.has(patternName)) {
      allowlistedButBelowMin.push({ patternName, count, consumers })
      continue
    }

    violations.push({ patternName, count, consumers })
  }

  const rel = (file) => path.relative(process.cwd(), file).replaceAll(path.sep, '/')

  if (violations.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`[pattern-reuse] 发现 ${violations.length} 个 Pattern 未满足最小复用（min=${minConsumers}）：`)
    for (const v of violations) {
      // eslint-disable-next-line no-console
      console.error(`- ${v.patternName}: consumers=${v.count}`)
      for (const consumer of v.consumers) {
        // eslint-disable-next-line no-console
        console.error(`  - ${rel(consumer)}`)
      }
    }

    // eslint-disable-next-line no-console
    console.error('')
    // eslint-disable-next-line no-console
    console.error('修复方式：')
    // eslint-disable-next-line no-console
    console.error(`1) 让该 Pattern 至少被 ${minConsumers} 个 consumers 引用；或`)
    // eslint-disable-next-line no-console
    console.error('2) 加入 allowlist（临时豁免），并在后续补齐真实复用。')
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
        console.log(`  - ${rel(consumer)}`)
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `[pattern-reuse] ok (patterns=${patternNames.length}, consumersFiles=${consumerFiles.length}, min=${minConsumers})`,
  )
}

await main()

