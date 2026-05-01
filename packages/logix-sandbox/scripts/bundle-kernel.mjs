/**
 * Bundle the built-in Sandbox runtime:
 * - effect (pinned version, used as the built-in runtime)
 * - @logixjs/core (kernel bundle, externalized to the co-located effect bundle)
 *
 * Usage: pnpm --filter @logixjs/sandbox bundle:kernel
 */

import * as esbuild from 'esbuild'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, copyFileSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sandboxRoot = join(__dirname, '..')
const requireFromSandbox = createRequire(join(sandboxRoot, 'package.json'))

const effectCdnPlugin = {
  name: 'effect-cdn',
  setup(build) {
    build.onResolve({ filter: /^effect($|\/)/ }, (args) => {
      // Both the kernel and user code must resolve to the same co-located effect bundle to avoid duplicate instances.
      // Use relative paths so the bundle works regardless of where kernelUrl is hosted.
      if (args.path === 'effect') {
        return { path: './effect.js', external: true }
      }
      const subpath = args.path.slice('effect/'.length)
      return { path: `./effect/${subpath}.js`, external: true }
    })
  },
}

const sandboxRuntimeExternalPlugin = (options) => {
  const effectRoot = options.effectRoot ?? './effect.js'
  const effectSubpathPrefix = options.effectSubpathPrefix ?? './effect/'
  return {
    name: 'sandbox-runtime-external',
    setup(build) {
      build.onResolve({ filter: /^effect($|\/)/ }, (args) => {
        if (args.path === 'effect') {
          return { path: effectRoot, external: true }
        }
        const subpath = args.path.slice('effect/'.length)
        return { path: `${effectSubpathPrefix}${subpath}.js`, external: true }
      })

    },
  }
}

const canonicalizePascalSegment = (segment) => {
  if (!segment) return segment
  const lower = segment.toLowerCase()
  // Special case: keep the namespace aligned with existing naming (EffectOp).
  if (lower === 'effectop') return 'EffectOp'

  if (segment.includes('-')) {
    return segment
      .split('-')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join('')
  }

  // env -> Env, observability -> Observability, module -> Module, fieldKernel -> FieldKernel
  return segment[0]?.toUpperCase() + segment.slice(1)
}

const canonicalizeLogixCoreSubpath = (subpath) =>
  subpath.split('/').filter(Boolean).map(canonicalizePascalSegment).join('.')

const resolvePackageJson = (specifier) => requireFromSandbox.resolve(`${specifier}/package.json`)

const collectTopLevelDistJsSpecifiers = (dir) => {
  const out = []
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.js') && entry.name !== 'index.js') {
      out.push(entry.name.slice(0, -'.js'.length))
      continue
    }

    if (!entry.isDirectory()) {
      continue
    }

    if (entry.name === 'internal' || entry.name === 'testing') {
      continue
    }

    const indexFile = join(dir, entry.name, 'index.js')
    try {
      readFileSync(indexFile)
      out.push(entry.name)
    } catch {
      // ignore non-exported folders
    }
  }
  return out
}

async function bundle() {
  const effectPkg = JSON.parse(readFileSync(resolvePackageJson('effect'), 'utf8'))
  const effectVersion = effectPkg.version ?? 'unknown'
  const effectDistDir = join(dirname(resolvePackageJson('effect')), 'dist')

  console.log('📦 开始为 Sandbox 打包内置运行环境...')
  console.log(`   effect 版本: ${effectVersion}`)

  const outDir = join(sandboxRoot, 'public/sandbox')
  mkdirSync(outDir, { recursive: true })
  const publicRoot = join(sandboxRoot, 'public')
  mkdirSync(publicRoot, { recursive: true })
  rmSync(join(outDir, 'chunks'), { recursive: true, force: true })
  rmSync(join(outDir, 'logix-core'), { recursive: true, force: true })

  // 1) Bundle effect (browser ESM, single-file entry).
  const effectSubpaths = [
    ...new Set(
      [
        ...Object.keys(effectPkg.exports ?? {})
          .filter((key) => key.startsWith('./') && !key.includes('*'))
          .map((key) => key.slice(2)),
        ...collectTopLevelDistJsSpecifiers(effectDistDir),
      ].filter((key) => key.length > 0 && key !== 'package.json' && key !== '.index' && key !== 'testing'),
    ),
  ].sort((a, b) => a.localeCompare(b))

  const effectEntryPoints = Object.fromEntries([
    ['effect', 'effect'],
    ...effectSubpaths.map((subpath) => [`effect/${subpath}`, `effect/${subpath}`]),
  ])

  await esbuild.build({
    entryPoints: effectEntryPoints,
    bundle: true,
    format: 'esm',
    absWorkingDir: sandboxRoot,
    platform: 'browser',
    target: 'es2020',
    splitting: true,
    minify: false,
    sourcemap: 'inline',
    outdir: outDir,
    entryNames: '[dir]/[name]',
    chunkNames: 'chunks/[name]-[hash]',
    banner: {
      js: `// effect runtime bundle for @logixjs/sandbox (v${effectVersion})\n`,
    },
  })
  console.log(`✅ 打包完成: public/sandbox/effect.js (+ effect:${effectSubpaths.length} subpaths)`)

  // 2) Bundle the @logixjs/core kernel (externalized to ./effect.js).
  const entry = join(sandboxRoot, '../logix-core/src/index.ts')

  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    absWorkingDir: sandboxRoot,
    target: 'es2020',
    minify: false,
    sourcemap: 'inline',
    outfile: join(outDir, 'logix-core.js'),
    loader: { '.ts': 'ts' },
    plugins: [effectCdnPlugin],
    banner: {
      js: `// @logixjs/core kernel bundle for @logixjs/sandbox
// effect is loaded from the co-located ./effect.js (v${effectVersion})
`,
    },
  })

  console.log('✅ 打包完成: public/sandbox/logix-core.js')

  // 2.5) Bundle @logixjs/core subpath modules (supports import "@logixjs/core/Runtime" / "@logixjs/core/ControlPlane", etc.)
  // Naming alignment with effect: subpath modules use PascalCase; non-canonical forms are rejected by the sandbox compiler.
  // To avoid mutable relative paths, all subpath outputs go to public/sandbox/logix-core/*.js (flatten multi-level paths with ".").
  // Example:
  // - @logixjs/core/Runtime          -> /sandbox/logix-core/Runtime.js
  // - @logixjs/core/ControlPlane     -> /sandbox/logix-core/ControlPlane.js
  const logixCoreSrcDir = join(sandboxRoot, '../logix-core/src')
  const logixCorePkg = JSON.parse(readFileSync(resolvePackageJson('@logixjs/core'), 'utf8'))
  const walkTsFiles = (dir, relBase = '') => {
    const out = []
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const abs = join(dir, entry.name)
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        if (rel === 'internal' || rel.startsWith('internal/')) {
          continue
        }
        out.push(...walkTsFiles(abs, rel))
        continue
      }
      if (entry.isFile() && entry.name.endsWith('.ts')) {
        out.push(rel)
      }
    }
    return out
  }

  const logixCoreFiles = walkTsFiles(logixCoreSrcDir)
  const logixCoreEntryPoints = {}
  for (const rel of logixCoreFiles) {
    if (rel === 'index.ts') {
      continue
    }

    const noExt = rel.slice(0, -'.ts'.length)
    const specifierSubpath = noExt.endsWith('/index') ? noExt.slice(0, -'/index'.length) : noExt
    if (!specifierSubpath) {
      continue
    }

    const canonical = canonicalizeLogixCoreSubpath(specifierSubpath)
    logixCoreEntryPoints[`logix-core/${canonical}`] = join(logixCoreSrcDir, rel)
  }

  for (const [exportPath, sourcePath] of Object.entries(logixCorePkg.exports ?? {})) {
    if (!exportPath.startsWith('./repo-internal/') || typeof sourcePath !== 'string') {
      continue
    }
    if (!sourcePath.startsWith('./src/internal/') || !sourcePath.endsWith('.ts')) {
      continue
    }

    const specifierSubpath = exportPath.slice('./'.length)
    logixCoreEntryPoints[`logix-core/${specifierSubpath.replaceAll('/', '.')}`] = join(
      sandboxRoot,
      '../logix-core',
      sourcePath.slice('./'.length),
    )
  }

  const logixCoreSpecifiers = Object.keys(logixCoreEntryPoints)
    .map((key) => key.slice('logix-core/'.length))
    .map((fileKey) => fileKey.replaceAll('.', '/'))
    .sort((a, b) => a.localeCompare(b))

  writeFileSync(
    join(outDir, 'logix-core.manifest.json'),
    JSON.stringify(
      {
        kind: '@logixjs/core-subpath-manifest',
        version: 1,
        generatedAt: new Date().toISOString(),
        specifiers: logixCoreSpecifiers,
      },
      null,
      2,
    ),
    'utf8',
  )

  // Clean old outputs to avoid polluting the artifact directory with stale casing/naming variants.
  rmSync(join(outDir, 'logix-core'), { recursive: true, force: true })

  await esbuild.build({
    entryPoints: logixCoreEntryPoints,
    bundle: true,
    format: 'esm',
    absWorkingDir: sandboxRoot,
    platform: 'browser',
    target: 'es2020',
    splitting: true,
    minify: false,
    sourcemap: 'inline',
    outdir: outDir,
    entryNames: '[dir]/[name]',
    chunkNames: 'chunks/[name]-[hash]',
    plugins: [
      sandboxRuntimeExternalPlugin({
        effectRoot: '../effect.js',
        effectSubpathPrefix: '../effect/',
      }),
    ],
    banner: {
      js: `// @logixjs/core subpath bundles for @logixjs/sandbox\n`,
    },
  })
  console.log(`✅ 打包完成: public/sandbox/logix-core/* (entries=${Object.keys(logixCoreEntryPoints).length})`)

  // 3) Bundle the Sandbox Worker (runs in a browser Worker and must be loadable via /sandbox/worker.js).
  const workerEntry = join(sandboxRoot, 'src/internal/worker/sandbox.worker.ts')
  await esbuild.build({
    entryPoints: [workerEntry],
    bundle: true,
    format: 'esm',
    absWorkingDir: sandboxRoot,
    platform: 'browser',
    target: 'es2020',
    minify: false,
    sourcemap: 'inline',
    outfile: join(outDir, 'worker.js'),
    loader: { '.ts': 'ts' },
    banner: {
      js: `// sandbox worker bundle for @logixjs/sandbox\n`,
    },
  })
  console.log('✅ 打包完成: public/sandbox/worker.js')

  // Copy esbuild.wasm into the public root so the Worker can load it via /esbuild.wasm.
  const wasmSource = join(sandboxRoot, 'node_modules/esbuild-wasm/esbuild.wasm')
  const wasmTarget = join(publicRoot, 'esbuild.wasm')
  try {
    copyFileSync(wasmSource, wasmTarget)
    console.log('✅ 拷贝 esbuild-wasm 到 public/esbuild.wasm')
  } catch (err) {
    console.warn('⚠️ Failed to copy esbuild-wasm. Make sure dependencies are installed:', err)
  }
  console.log(`   Warnings: ${result.warnings.length}`)
  console.log(`   Errors: ${result.errors.length}`)
}

bundle().catch((err) => {
  console.error('❌ Kernel bundle failed:', err)
  process.exit(1)
})
