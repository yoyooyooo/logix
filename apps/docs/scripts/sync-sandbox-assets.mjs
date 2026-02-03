import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const docsRoot = resolve(__dirname, '..')
const repoRoot = resolve(docsRoot, '..', '..')

const sandboxPackageRoot = resolve(repoRoot, 'packages/logix-sandbox')
const sandboxPublicRoot = resolve(sandboxPackageRoot, 'public')
const sandboxSourceDir = resolve(sandboxPublicRoot, 'sandbox')
const sandboxKernelFile = resolve(sandboxSourceDir, 'logix-core.js')
const sandboxWasmFile = resolve(sandboxPublicRoot, 'esbuild.wasm')
const sandboxDistRoot = resolve(sandboxPackageRoot, 'dist')
const sandboxDistIndex = resolve(sandboxDistRoot, 'index.js')

const docsPublicRoot = resolve(docsRoot, 'public')
const docsSandboxDir = resolve(docsPublicRoot, 'sandbox')
const docsWasmFile = resolve(docsPublicRoot, 'esbuild.wasm')

const argv = process.argv.slice(2)
const forceBuild = argv.includes('--build')
const ifMissing = argv.includes('--if-missing')

if (!forceBuild && !ifMissing) {
  console.error('Usage: node scripts/sync-sandbox-assets.mjs --build | --if-missing')
  process.exit(2)
}

const ensureSandboxArtifacts = () => {
  const hasDist = existsSync(sandboxDistIndex)
  if (forceBuild || !hasDist) {
    const build = spawnSync('pnpm', ['-C', sandboxPackageRoot, 'build'], {
      cwd: repoRoot,
      stdio: 'inherit',
    })
    if (build.status !== 0) {
      process.exit(build.status ?? 1)
    }
  }

  const hasKernel = existsSync(sandboxKernelFile)
  const hasWasm = existsSync(sandboxWasmFile)

  if (!forceBuild && ifMissing && hasKernel && hasWasm) {
    return
  }

  const result = spawnSync('pnpm', ['-C', sandboxPackageRoot, 'bundle:kernel'], {
    cwd: repoRoot,
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  if (!existsSync(sandboxDistIndex)) {
    console.error(`[docs] missing @logixjs/sandbox dist: ${sandboxDistIndex}`)
    process.exit(1)
  }
  if (!existsSync(sandboxKernelFile)) {
    console.error(`[docs] missing sandbox kernel: ${sandboxKernelFile}`)
    process.exit(1)
  }
  if (!existsSync(sandboxWasmFile)) {
    console.error(`[docs] missing esbuild.wasm: ${sandboxWasmFile}`)
    process.exit(1)
  }
}

const syncSandboxArtifactsToDocs = () => {
  mkdirSync(docsPublicRoot, { recursive: true })

  rmSync(docsSandboxDir, { recursive: true, force: true })
  mkdirSync(docsSandboxDir, { recursive: true })

  cpSync(sandboxSourceDir, docsSandboxDir, { recursive: true, force: true })
  cpSync(sandboxWasmFile, docsWasmFile, { force: true })
}

ensureSandboxArtifacts()
syncSandboxArtifactsToDocs()
