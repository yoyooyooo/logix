/**
 * 打包 Sandbox 的内置运行环境：
 * - effect（固定版本，作为内置运行时）
 * - @logix/core（Kernel bundle，external 到同目录的 effect）
 *
 * 使用方法: pnpm --filter @logix/sandbox bundle:kernel
 */

import * as esbuild from 'esbuild'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, copyFileSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sandboxRoot = join(__dirname, '..')

// 版本信息仅用于 banner 展示（真正版本由 pnpm override/lock 决定）
const EFFECT_VERSION = '3.19.13'

const effectCdnPlugin = {
  name: 'effect-cdn',
  setup(build) {
    build.onResolve({ filter: /^effect($|\/)/ }, (args) => {
      // Kernel 与用户代码都统一引用同目录下的内置 effect bundle，避免多份 effect 实例。
      // 这里使用相对路径，保证无论 kernelUrl 部署到哪，都能加载同目录的 effect.js。
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
  const platformPath = options.platformPath ?? './@effect/platform.js'

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

      build.onResolve({ filter: /^@effect\/platform$/ }, () => ({
        path: platformPath,
        external: true,
      }))
    },
  }
}

const canonicalizePascalSegment = (segment) => {
  if (!segment) return segment
  const lower = segment.toLowerCase()
  // 特例：保持与现有命名空间一致（EffectOp）
  if (lower === 'effectop') return 'EffectOp'

  if (segment.includes('-')) {
    return segment
      .split('-')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join('')
  }

  // env -> Env, observability -> Observability, Module -> Module, stateTrait -> StateTrait
  return segment[0]?.toUpperCase() + segment.slice(1)
}

const canonicalizeLogixCoreSubpath = (subpath) =>
  subpath.split('/').filter(Boolean).map(canonicalizePascalSegment).join('.')

async function bundle() {
  console.log('📦 开始为 Sandbox 打包内置运行环境...')
  console.log(`   effect 版本(预期): ${EFFECT_VERSION}`)

  const outDir = join(sandboxRoot, 'public/sandbox')
  mkdirSync(outDir, { recursive: true })
  const publicRoot = join(sandboxRoot, 'public')
  mkdirSync(publicRoot, { recursive: true })

  // 1) 打包 effect（浏览器 ESM，单文件）
  const effectPkg = JSON.parse(readFileSync(join(sandboxRoot, 'node_modules/effect/package.json'), 'utf8'))
  const effectSubpaths = Object.keys(effectPkg.exports ?? {})
    .filter((key) => key.startsWith('./') && !key.includes('*'))
    .map((key) => key.slice(2))
    .filter((key) => key.length > 0 && key !== 'package.json' && key !== '.index')

  const platformPkg = JSON.parse(readFileSync(join(sandboxRoot, 'node_modules/@effect/platform/package.json'), 'utf8'))
  const platformSubpaths = Object.keys(platformPkg.exports ?? {})
    .filter((key) => key.startsWith('./') && !key.includes('*'))
    .map((key) => key.slice(2))
    .filter((key) => key.length > 0 && key !== 'package.json')

  const effectEntryPoints = Object.fromEntries([
    ['effect', 'effect'],
    ...effectSubpaths.map((subpath) => [`effect/${subpath}`, `effect/${subpath}`]),
    // @effect/platform（root + 全子路径；其他 @effect/* 仍可走 sandbox compiler 的 esm.sh 路径）
    ['@effect/platform', '@effect/platform'],
    ...platformSubpaths.map((subpath) => [`@effect/platform/${subpath}`, `@effect/platform/${subpath}`]),
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
      js: `// effect runtime bundle for @logix/sandbox (v${EFFECT_VERSION})\n`,
    },
  })
  console.log(
    `✅ 打包完成: public/sandbox/effect.js (+ effect:${effectSubpaths.length} subpaths, @effect/platform:${platformSubpaths.length} subpaths)`,
  )

  // 2) 打包 @logix/core kernel（external 到 ./effect.js）
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
      js: `// @logix/core kernel bundle for @logix/sandbox
// effect 从同目录 ./effect.js 加载 (v${EFFECT_VERSION})
`,
    },
  })

  console.log('✅ 打包完成: public/sandbox/logix-core.js')

  // 2.5) 打包 @logix/core 子路径模块（支持 import "@logix/core/Runtime" / "@logix/core/Flow" 等）
  // 命名对齐 effect：子路径模块统一使用 PascalCase 命名（非规范写法由 sandbox compiler 拒绝并提示改写）
  // 说明：为了避免可变相对路径，子路径输出统一放在 public/sandbox/logix-core/*.js（多级路径用 "." 展平）
  // 例如：
  // - @logix/core/Runtime          -> /sandbox/logix-core/Runtime.js
  // - @logix/core/StateTrait       -> /sandbox/logix-core/StateTrait.js
  const logixCoreSrcDir = join(sandboxRoot, '../logix-core/src')
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

  const logixCoreSpecifiers = Object.keys(logixCoreEntryPoints)
    .map((key) => key.slice('logix-core/'.length))
    .map((fileKey) => fileKey.replaceAll('.', '/'))
    .sort((a, b) => a.localeCompare(b))

  writeFileSync(
    join(outDir, 'logix-core.manifest.json'),
    JSON.stringify(
      {
        kind: '@logix/core-subpath-manifest',
        version: 1,
        generatedAt: new Date().toISOString(),
        specifiers: logixCoreSpecifiers,
      },
      null,
      2,
    ),
    'utf8',
  )

  // 清理旧输出，避免遗留大小写/命名不一致的文件污染产物目录。
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
        platformPath: '../@effect/platform.js',
      }),
    ],
    banner: {
      js: `// @logix/core subpath bundles for @logix/sandbox\n`,
    },
  })
  console.log(`✅ 打包完成: public/sandbox/logix-core/* (entries=${Object.keys(logixCoreEntryPoints).length})`)

  // 3) 打包 Sandbox Worker（运行于浏览器 Worker，需可通过 /sandbox/worker.js 直接加载）
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
      js: `// sandbox worker bundle for @logix/sandbox\n`,
    },
  })
  console.log('✅ 打包完成: public/sandbox/worker.js')

  // 同步拷贝 esbuild.wasm 到 public 根目录，供 Worker 通过 /esbuild.wasm 加载
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
