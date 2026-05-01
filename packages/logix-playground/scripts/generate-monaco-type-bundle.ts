import fs from 'node:fs/promises'
import path from 'node:path'

type PackageMeta = {
  readonly name: string
  readonly version: string
}

type PackageMode = 'workspace-dist' | 'workspace-src' | 'pnpm'

const allowedPackages = new Set([
  '@logixjs/core',
  '@logixjs/react',
  '@logixjs/sandbox',
  '@logixjs/form',
  'effect',
  '@standard-schema/spec',
  'fast-check',
  'mutative',
  'use-sync-external-store',
  '@types/react',
  '@types/react-dom',
  'csstype',
])

const workspacePackages: Record<string, { readonly relativeRoot: string; readonly mode: PackageMode }> = {
  '@logixjs/core': { relativeRoot: 'packages/logix-core', mode: 'workspace-dist' },
  '@logixjs/react': { relativeRoot: 'packages/logix-react', mode: 'workspace-dist' },
  '@logixjs/sandbox': { relativeRoot: 'packages/logix-sandbox', mode: 'workspace-dist' },
  '@logixjs/form': { relativeRoot: 'packages/logix-form', mode: 'workspace-src' },
}

const seedPackages = [
  '@logixjs/core',
  '@logixjs/react',
  '@logixjs/sandbox',
  '@logixjs/form',
  'effect',
  '@types/react',
  '@types/react-dom',
]

const playgroundPrelude = [
  'declare namespace LogixPlaygroundPrelude {',
  '  namespace Module {',
  '    namespace Reducer {',
  '      const mutate: unknown',
  '    }',
  '    const make: unknown',
  '  }',
  '  namespace Runtime {',
  '    type ProgramRunContext<T = unknown> = unknown',
  '    const run: unknown',
  '    const openProgram: unknown',
  '    const check: unknown',
  '    const trial: unknown',
  '  }',
  '  namespace Program {',
  '    const make: unknown',
  '  }',
  '  namespace Effect {',
  '    const gen: unknown',
  '  }',
  '  namespace Schema {',
  '    const Struct: unknown',
  '    const Number: unknown',
  '    const Void: unknown',
  '  }',
  '}',
  '',
].join('\n')

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.stat(filePath)
    return true
  } catch {
    return false
  }
}

const readJson = async (filePath: string): Promise<any> => JSON.parse(await fs.readFile(filePath, 'utf-8'))

const encodePnpmPrefix = (packageName: string): string => packageName.replace('/', '+')

const listFilesRecursive = async (
  rootDir: string,
  includeFile: (absolutePath: string) => boolean,
): Promise<string[]> => {
  const files: string[] = []

  const visit = async (dir: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') await visit(absolutePath)
        continue
      }
      if (entry.isFile() && includeFile(absolutePath)) files.push(absolutePath)
    }
  }

  await visit(rootDir)
  return files.sort()
}

const findPnpmPackageRoot = async (repoRoot: string, packageName: string): Promise<string> => {
  const storeDir = path.join(repoRoot, 'node_modules', '.pnpm')
  const packageParts = packageName.split('/')
  const prefix = encodePnpmPrefix(packageName)
  const entries = await fs.readdir(storeDir, { withFileTypes: true })
  const candidates = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(`${prefix}@`))
    .map((entry) => entry.name)
    .sort()
    .reverse()

  for (const candidate of candidates) {
    const packageRoot = path.join(storeDir, candidate, 'node_modules', ...packageParts)
    if (await exists(packageRoot)) return await fs.realpath(packageRoot)
  }

  throw new Error(`Cannot locate pnpm package root for ${packageName}`)
}

const toVirtualPath = (packageName: string, relativePath: string): string =>
  `file:///node_modules/${packageName}/${relativePath.split(path.sep).join('/')}`

const toSyntheticPublishPackageJson = (pkgJson: any): any => {
  if (!pkgJson || typeof pkgJson !== 'object' || !pkgJson.publishConfig?.exports) return pkgJson
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

const addPackageFiles = async (
  packageName: string,
  packageRoot: string,
  mode: PackageMode,
  files: Record<string, string>,
): Promise<void> => {
  const pkgJsonPath = path.join(packageRoot, 'package.json')
  const pkgJson = await readJson(pkgJsonPath)
  const packageJson = mode === 'workspace-dist' ? toSyntheticPublishPackageJson(pkgJson) : pkgJson
  files[toVirtualPath(packageName, 'package.json')] = JSON.stringify(packageJson, null, 2)

  if (mode === 'workspace-dist') {
    const distDir = path.join(packageRoot, 'dist')
    const sourceDir = path.join(packageRoot, 'src')
    const rootDir = (await exists(distDir)) ? distDir : sourceDir
    const typeFiles = await listFilesRecursive(
      rootDir,
      (absolutePath) =>
        absolutePath.endsWith('.d.ts') ||
        absolutePath.endsWith('.d.cts') ||
        (!absolutePath.includes(`${path.sep}dist${path.sep}`) &&
          (absolutePath.endsWith('.ts') || absolutePath.endsWith('.tsx'))),
    )
    for (const absolutePath of typeFiles) {
      const relativePath = path.relative(packageRoot, absolutePath)
      files[toVirtualPath(packageName, relativePath)] = await fs.readFile(absolutePath, 'utf-8')
    }
    return
  }

  if (mode === 'workspace-src') {
    const sourceDir = path.join(packageRoot, 'src')
    const typeFiles = await listFilesRecursive(
      sourceDir,
      (absolutePath) => absolutePath.endsWith('.ts') || absolutePath.endsWith('.tsx') || absolutePath.endsWith('.d.ts'),
    )
    for (const absolutePath of typeFiles) {
      const relativePath = path.relative(packageRoot, absolutePath)
      files[toVirtualPath(packageName, relativePath)] = await fs.readFile(absolutePath, 'utf-8')
    }
    return
  }

  const preferredTypeRoot = path.join(packageRoot, 'dist', 'dts')
  const rootDir = (await exists(preferredTypeRoot)) ? preferredTypeRoot : packageRoot
  const typeFiles = await listFilesRecursive(
    rootDir,
    (absolutePath) => absolutePath.endsWith('.d.ts') || absolutePath.endsWith('.d.cts'),
  )
  for (const absolutePath of typeFiles) {
    const relativePath = path.relative(packageRoot, absolutePath)
    files[toVirtualPath(packageName, relativePath)] = await fs.readFile(absolutePath, 'utf-8')
  }
}

const main = async (): Promise<void> => {
  const packageRoot = process.cwd()
  const repoRoot = path.resolve(packageRoot, '../..')
  const outFile = path.join(packageRoot, 'src/internal/editor/types/monacoTypeBundle.generated.ts')

  const queue = [...seedPackages]
  const visited = new Set<string>()
  const files: Record<string, string> = {
    'file:///__logix_playground_prelude__.d.ts': playgroundPrelude,
  }
  const packages: PackageMeta[] = []

  while (queue.length > 0) {
    const packageName = queue.shift()
    if (!packageName || visited.has(packageName) || !allowedPackages.has(packageName)) continue
    visited.add(packageName)

    const workspacePackage = workspacePackages[packageName]
    const mode = workspacePackage?.mode ?? 'pnpm'
    const packageDir = workspacePackage
      ? path.join(repoRoot, workspacePackage.relativeRoot)
      : await findPnpmPackageRoot(repoRoot, packageName)
    const pkgJson = await readJson(path.join(packageDir, 'package.json'))

    packages.push({ name: String(pkgJson.name), version: String(pkgJson.version) })
    const dependencies = { ...(pkgJson.dependencies ?? {}), ...(pkgJson.peerDependencies ?? {}) }
    for (const dependencyName of Object.keys(dependencies)) {
      if (allowedPackages.has(dependencyName) && !visited.has(dependencyName)) queue.push(dependencyName)
    }

    await addPackageFiles(packageName, packageDir, mode, files)
  }

  packages.sort((a, b) => a.name.localeCompare(b.name))

  const stats = {
    filesCount: Object.keys(files).length,
    totalBytes: Object.values(files).reduce((sum, content) => sum + Buffer.byteLength(content, 'utf-8'), 0),
  }
  const generatedAt = new Date().toISOString()

  await fs.mkdir(path.dirname(outFile), { recursive: true })
  await fs.writeFile(
    outFile,
    [
      '/* eslint-disable @typescript-eslint/ban-ts-comment */',
      '// @ts-nocheck',
      'export const monacoTypeBundleFiles: Readonly<Record<string, string>> = ',
      `${JSON.stringify(files)} as const`,
      '',
      'export const monacoTypeBundleMeta = ',
      `${JSON.stringify({ generatedAt, packages, stats }, null, 2)} as const`,
      '',
    ].join('\n'),
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
