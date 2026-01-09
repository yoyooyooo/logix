import fs from 'node:fs/promises'
import path from 'node:path'

type BundleMeta = {
  readonly generatedAt: string
  readonly packages: ReadonlyArray<{ readonly name: string; readonly version: string }>
  readonly stats: { readonly filesCount: number; readonly totalBytes: number }
  readonly note?: string
}

const encodePnpmPrefix = (packageName: string): string => packageName.replace('/', '+')

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.stat(filePath)
    return true
  } catch {
    return false
  }
}

const readJsonFile = async (filePath: string): Promise<any> => JSON.parse(await fs.readFile(filePath, 'utf-8'))

const listFilesRecursive = async (rootDir: string, filter: (absolutePath: string) => boolean): Promise<string[]> => {
  const out: string[] = []
  const visit = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue
        await visit(abs)
        continue
      }
      if (entry.isFile() && filter(abs)) out.push(abs)
    }
  }
  await visit(rootDir)
  return out
}

const virtualNodeModulesPath = (packageName: string, relativePath: string): string => {
  const normalized = relativePath.split(path.sep).join('/')
  return `file:///node_modules/${packageName}/${normalized}`
}

const findPnpmPackageRoot = async (repoRoot: string, packageName: string): Promise<string> => {
  const storeDir = path.join(repoRoot, 'node_modules', '.pnpm')
  const prefix = encodePnpmPrefix(packageName)

  const entries = await fs.readdir(storeDir, { withFileTypes: true })
  const candidates = entries
    .filter((e) => e.isDirectory() && e.name.startsWith(`${prefix}@`))
    .map((e) => e.name)
    .sort()
    .reverse()

  for (const dirName of candidates) {
    const candidate = path.join(storeDir, dirName, 'node_modules', ...packageName.split('/'))
    if (await exists(candidate)) return await fs.realpath(candidate)
  }

  throw new Error(`无法在 pnpm store 中定位依赖包：${packageName}`)
}

const readPackageVersion = async (pkgRoot: string): Promise<{ readonly name: string; readonly version: string }> => {
  const pkgJson = await readJsonFile(path.join(pkgRoot, 'package.json'))
  return { name: String(pkgJson.name), version: String(pkgJson.version) }
}

const toSyntheticPublishPackageJson = (pkgJson: any): any => {
  if (!pkgJson || typeof pkgJson !== 'object') return pkgJson
  if (!pkgJson.publishConfig || !pkgJson.publishConfig.exports) return pkgJson
  return {
    name: pkgJson.name,
    version: pkgJson.version,
    type: pkgJson.type,
    exports: pkgJson.publishConfig.exports,
    main: pkgJson.publishConfig.main,
    module: pkgJson.publishConfig.module,
    types: pkgJson.publishConfig.types,
  }
}

const main = async () => {
  const argv = process.argv.slice(2)
  const force = argv.includes('--force')

  const exampleRoot = path.resolve(process.cwd())
  const repoRoot = path.resolve(exampleRoot, '../..')

  const outDir = path.join(exampleRoot, 'src/components/editor/types')
  const metaOut = path.join(outDir, 'monacoTypeBundle.generated.meta.ts')
  const filesOut = path.join(outDir, 'monacoTypeBundle.generated.files.ts')
  const entryOut = path.join(outDir, 'monacoTypeBundle.generated.ts')
  const publicOut = path.join(exampleRoot, 'public', 'monacoTypeBundle.generated.files.json')

  if (
    !force &&
    (await exists(metaOut)) &&
    (await exists(filesOut)) &&
    (await exists(entryOut)) &&
    (await exists(publicOut))
  ) {
    return
  }

  const allow = new Set<string>([
    // runtime / core
    'effect',
    '@standard-schema/spec',
    'fast-check',

    // logix
    '@logixjs/core',
    '@logixjs/react',
    '@logixjs/sandbox',
    '@logixjs/form',
    'mutative',
    'use-sync-external-store',

    // tsx / jsx types
    '@types/react',
    '@types/react-dom',
    'csstype',
  ])

  const workspaceDistPackages = new Set<string>(['@logixjs/core', '@logixjs/react', '@logixjs/sandbox'])
  const workspaceSrcPackages = new Set<string>(['@logixjs/form'])

  const workspaceRoots: Record<string, string> = {
    '@logixjs/core': path.join(repoRoot, 'packages/logix-core'),
    '@logixjs/react': path.join(repoRoot, 'packages/logix-react'),
    '@logixjs/sandbox': path.join(repoRoot, 'packages/logix-sandbox'),
    '@logixjs/form': path.join(repoRoot, 'packages/logix-form'),
  }

  const seeds = [
    'effect',
    '@logixjs/core',
    '@logixjs/react',
    '@logixjs/sandbox',
    '@logixjs/form',
    '@types/react',
    '@types/react-dom',
  ]

  const visited = new Set<string>()
  const queue = [...seeds]

  const metaPackages: Array<{ readonly name: string; readonly version: string }> = []
  const files: Record<string, string> = {}

  while (queue.length > 0) {
    const name = queue.shift()!
    if (visited.has(name)) continue
    visited.add(name)
    if (!allow.has(name)) continue

    const isWorkspaceDist = workspaceDistPackages.has(name)
    const isWorkspaceSrc = workspaceSrcPackages.has(name)

    const pkgRoot = isWorkspaceDist || isWorkspaceSrc ? workspaceRoots[name] : await findPnpmPackageRoot(repoRoot, name)
    const pkgJsonPath = path.join(pkgRoot, 'package.json')
    const pkgJson = await readJsonFile(pkgJsonPath)
    metaPackages.push({ name: String(pkgJson.name), version: String(pkgJson.version) })

    const deps = {
      ...(pkgJson.dependencies ?? {}),
      ...(pkgJson.peerDependencies ?? {}),
    }
    for (const depName of Object.keys(deps)) {
      if (allow.has(depName) && !visited.has(depName)) queue.push(depName)
    }

    const virtualPackageJson =
      isWorkspaceDist && pkgJson.publishConfig ? toSyntheticPublishPackageJson(pkgJson) : (pkgJson as any)
    files[virtualNodeModulesPath(name, 'package.json')] = JSON.stringify(virtualPackageJson, null, 2)

    if (isWorkspaceDist) {
      const distDir = path.join(pkgRoot, 'dist')
      if (await exists(distDir)) {
        const typeFiles = await listFilesRecursive(distDir, (abs) => abs.endsWith('.d.ts') || abs.endsWith('.d.cts'))
        for (const abs of typeFiles.sort()) {
          const rel = path.relative(pkgRoot, abs)
          files[virtualNodeModulesPath(name, rel)] = await fs.readFile(abs, 'utf-8')
        }
      } else {
        const srcDir = path.join(pkgRoot, 'src')
        const srcFiles = await listFilesRecursive(
          srcDir,
          (abs) => abs.endsWith('.ts') || abs.endsWith('.tsx') || abs.endsWith('.d.ts') || abs.endsWith('.d.cts'),
        )
        for (const abs of srcFiles.sort()) {
          const rel = path.relative(pkgRoot, abs)
          files[virtualNodeModulesPath(name, rel)] = await fs.readFile(abs, 'utf-8')
        }
      }
      continue
    }

    if (isWorkspaceSrc) {
      const srcDir = path.join(pkgRoot, 'src')
      const srcFiles = await listFilesRecursive(srcDir, (abs) => abs.endsWith('.ts') || abs.endsWith('.tsx'))
      for (const abs of srcFiles.sort()) {
        const rel = path.relative(pkgRoot, abs)
        files[virtualNodeModulesPath(name, rel)] = await fs.readFile(abs, 'utf-8')
      }
      continue
    }

    const distDts = path.join(pkgRoot, 'dist', 'dts')
    if (await exists(distDts)) {
      const typeFiles = await listFilesRecursive(distDts, (abs) => abs.endsWith('.d.ts') || abs.endsWith('.d.cts'))
      for (const abs of typeFiles.sort()) {
        const rel = path.relative(pkgRoot, abs)
        files[virtualNodeModulesPath(name, rel)] = await fs.readFile(abs, 'utf-8')
      }
      continue
    }

    const allTypeFiles = await listFilesRecursive(pkgRoot, (abs) => abs.endsWith('.d.ts') || abs.endsWith('.d.cts'))
    for (const abs of allTypeFiles.sort()) {
      const rel = path.relative(pkgRoot, abs)
      files[virtualNodeModulesPath(name, rel)] = await fs.readFile(abs, 'utf-8')
    }
  }

  metaPackages.sort((a, b) => a.name.localeCompare(b.name))

  let totalBytes = 0
  for (const content of Object.values(files)) totalBytes += Buffer.byteLength(content, 'utf-8')

  const meta: BundleMeta = {
    generatedAt: new Date().toISOString(),
    packages: metaPackages,
    stats: { filesCount: Object.keys(files).length, totalBytes },
    note: '示例项目范围内的 Monaco TS extraLibs（不承诺任意第三方依赖）',
  }

  await fs.mkdir(outDir, { recursive: true })

  const metaSource =
    `// @ts-nocheck\n` + `export const monacoTypeBundleMeta = ${JSON.stringify(meta, null, 2)} as const\n`

  const filesSource = `// @ts-nocheck\n` + `export const monacoTypeBundleFiles = ${JSON.stringify(files)} as const\n`

  const entrySource = `// @ts-nocheck
import type { MonacoTypeBundle } from './monacoTypeBundle'
import { monacoTypeBundleFiles } from './monacoTypeBundle.generated.files'
import { monacoTypeBundleMeta } from './monacoTypeBundle.generated.meta'

export const monacoTypeBundle: MonacoTypeBundle = {
  meta: monacoTypeBundleMeta as any,
  files: monacoTypeBundleFiles as any,
}
`

  await fs.mkdir(path.dirname(publicOut), { recursive: true })

  await Promise.all([
    fs.writeFile(metaOut, metaSource),
    fs.writeFile(filesOut, filesSource),
    fs.writeFile(entryOut, entrySource),
    fs.writeFile(publicOut, JSON.stringify(files)),
  ])
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
