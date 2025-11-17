import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
  console.error('  node scaffold-feature-first.mjs --out /abs/path/to/your-repo/src')
  // eslint-disable-next-line no-console
  console.error('  node scaffold-feature-first.mjs --out ./src --dry-run')
  // eslint-disable-next-line no-console
  console.error('  node scaffold-feature-first.mjs --out ./src --force')
}

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

const fileExists = async (filePath) => {
  try {
    const s = await stat(filePath)
    return s.isFile()
  } catch {
    return false
  }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const outArg = args.get('out')
  const dryRun = args.get('dry-run') === 'true'
  const force = args.get('force') === 'true'

  if (!outArg) {
    usage()
    process.exitCode = 2
    return
  }

  const scriptPath = fileURLToPath(import.meta.url)
  const skillRoot = path.resolve(path.dirname(scriptPath), '..')
  const templateRoot = path.join(skillRoot, 'assets/feature-first-customer-search/src')

  const outDir = path.resolve(process.cwd(), outArg)
  const templateFiles = (await listFilesRecursively(templateRoot)).sort((a, b) => a.localeCompare(b))

  const plan = []
  const collisions = []

  for (const file of templateFiles) {
    const rel = path.relative(templateRoot, file)
    const dest = path.join(outDir, rel)
    const exists = await fileExists(dest)
    if (exists && !force) {
      collisions.push(dest)
      continue
    }
    plan.push({ from: file, to: dest })
  }

  if (collisions.length > 0 && !force) {
    // eslint-disable-next-line no-console
    console.error(`[scaffold] 目标目录存在 ${collisions.length} 个同名文件（未开启 --force），已取消。`)
    for (const c of collisions.slice(0, 50)) {
      // eslint-disable-next-line no-console
      console.error(`- ${path.relative(process.cwd(), c).replaceAll(path.sep, '/')}`)
    }
    if (collisions.length > 50) {
      // eslint-disable-next-line no-console
      console.error(`... (${collisions.length - 50} more)`)
    }
    process.exitCode = 1
    return
  }

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(`[scaffold] dry-run: 将复制 ${plan.length} 个文件到 ${outDir}`)
    for (const item of plan.slice(0, 50)) {
      // eslint-disable-next-line no-console
      console.log(`- ${path.relative(process.cwd(), item.to).replaceAll(path.sep, '/')}`)
    }
    if (plan.length > 50) {
      // eslint-disable-next-line no-console
      console.log(`... (${plan.length - 50} more)`)
    }
    return
  }

  await mkdir(outDir, { recursive: true })

  for (const item of plan) {
    await mkdir(path.dirname(item.to), { recursive: true })
    const content = await readFile(item.from)
    await writeFile(item.to, content)
  }

  // eslint-disable-next-line no-console
  console.log(`[scaffold] ok: 复制 ${plan.length} 个文件到 ${outDir}`)
}

await main()

