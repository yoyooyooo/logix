/**
 * 打包 @logix/core 为 Sandbox Kernel bundle
 *
 * 使用方法: pnpm --filter @logix/sandbox bundle:kernel
 */

import * as esbuild from 'esbuild'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, copyFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sandboxRoot = join(__dirname, '..')

// Effect 版本，需要与 compiler.ts 中保持一致
const EFFECT_VERSION = '3.19.8'

const effectCdnPlugin = {
  name: 'effect-cdn',
  setup(build) {
    build.onResolve({ filter: /^effect/ }, (args) => {
      let path = args.path
      if (path === 'effect') {
        return { path: `https://esm.sh/effect@${EFFECT_VERSION}`, external: true }
      }
      const subpath = path.slice(7) // 移除 'effect/'
      return { path: `https://esm.sh/effect@${EFFECT_VERSION}/${subpath}`, external: true }
    })
  },
}

async function bundle() {
  console.log('📦 开始为 Sandbox 打包 @logix/core Kernel...')
  console.log(`   Effect 版本: ${EFFECT_VERSION}`)

  const outDir = join(sandboxRoot, 'public/sandbox')
  mkdirSync(outDir, { recursive: true })
  const publicRoot = join(sandboxRoot, 'public')
  mkdirSync(publicRoot, { recursive: true })

  const entry = join(sandboxRoot, '../logix-core/src/index.ts')

  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    target: 'es2020',
    minify: false,
    sourcemap: 'inline',
    outfile: join(outDir, 'logix-core.js'),
    loader: { '.ts': 'ts' },
    plugins: [effectCdnPlugin],
    banner: {
      js: `// @logix/core kernel bundle for @logix/sandbox
// effect 从 esm.sh CDN 加载 (v${EFFECT_VERSION})
`,
    },
  })

  console.log('✅ 打包完成: public/sandbox/logix-core.js')
  // 同步拷贝 esbuild.wasm 到 public 根目录，供 Worker 通过 /esbuild.wasm 加载
  const wasmSource = join(sandboxRoot, 'node_modules/esbuild-wasm/esbuild.wasm')
  const wasmTarget = join(publicRoot, 'esbuild.wasm')
  try {
    copyFileSync(wasmSource, wasmTarget)
    console.log('✅ 拷贝 esbuild-wasm 到 public/esbuild.wasm')
  } catch (err) {
    console.warn('⚠️ 拷贝 esbuild-wasm 失败，请确认依赖已安装:', err)
  }
  console.log(`   警告: ${result.warnings.length}`)
  console.log(`   错误: ${result.errors.length}`)
}

bundle().catch((err) => {
  console.error('❌ Kernel 打包失败:', err)
  process.exit(1)
})
