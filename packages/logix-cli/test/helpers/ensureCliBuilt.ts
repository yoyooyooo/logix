import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

const pathExists = async (p: string): Promise<boolean> => {
  try {
    await fs.stat(p)
    return true
  } catch {
    return false
  }
}

const stableReaddir = async (dir: string): Promise<ReadonlyArray<string>> => {
  const names = await fs.readdir(dir)
  names.sort()
  return names
}

const hashDir = async (hash: ReturnType<typeof createHash>, dir: string, prefix: string): Promise<void> => {
  const entries = await stableReaddir(dir)
  for (const name of entries) {
    const abs = path.join(dir, name)
    const rel = `${prefix}${name}`
    const stat = await fs.stat(abs)
    if (stat.isDirectory()) {
      await hashDir(hash, abs, `${rel}/`)
      continue
    }
    if (!stat.isFile()) continue
    // Keep scope narrow and stable: only hash sources that affect build output.
    if (!/\.(ts|tsx|mts|cts|js|mjs|cjs|json)$/i.test(name)) continue
    hash.update(rel)
    hash.update(String(stat.size))
    hash.update(String(stat.mtimeMs))
  }
}

const computeBuildFingerprint = async (cliRoot: string): Promise<string> => {
  const hash = createHash('sha256')
  const pkg = path.join(cliRoot, 'package.json')
  const tsup = path.join(cliRoot, 'tsup.config.ts')
  if (await pathExists(pkg)) hash.update(await fs.readFile(pkg))
  if (await pathExists(tsup)) hash.update(await fs.readFile(tsup))
  const srcDir = path.join(cliRoot, 'src')
  if (await pathExists(srcDir)) await hashDir(hash, srcDir, 'src/')
  const scriptsDir = path.join(cliRoot, 'scripts')
  if (await pathExists(scriptsDir)) await hashDir(hash, scriptsDir, 'scripts/')
  return hash.digest('hex')
}

export const ensureCliBuilt = async (cliRoot: string): Promise<void> => {
  const key = createHash('sha256').update(cliRoot).digest('hex').slice(0, 16)
  const baseDir = path.join(os.tmpdir(), 'intent-flow', 'logix-cli', 'build-lock', key)
  const lockFile = path.join(baseDir, 'lock')
  const builtOkFile = path.join(baseDir, 'built.ok')

  await fs.mkdir(baseDir, { recursive: true })

  const lockStart = Date.now()
  for (;;) {
    try {
      const handle = await fs.open(lockFile, 'wx')
      try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, ts: Date.now() }), 'utf8')
      } finally {
        await handle.close()
      }
      break
    } catch (e: any) {
      if (e?.code !== 'EEXIST') throw e
      if (Date.now() - lockStart > 120_000) throw new Error('timeout waiting logix-cli build lock')
      await sleep(100)
    }
  }

  try {
    const devserverBin = path.join(cliRoot, 'dist/bin/logix-devserver.js')
    const fingerprint = await computeBuildFingerprint(cliRoot)
    const cached = await fs.readFile(builtOkFile, 'utf8').catch(() => '')
    if ((await pathExists(devserverBin)) && cached.trim() === fingerprint) return
    await execFileAsync(pnpmBin, ['build'], { cwd: cliRoot, timeout: 120_000, maxBuffer: 10_000_000 })
    await fs.writeFile(builtOkFile, fingerprint, 'utf8')
  } finally {
    await fs.unlink(lockFile).catch(() => {})
  }
}
