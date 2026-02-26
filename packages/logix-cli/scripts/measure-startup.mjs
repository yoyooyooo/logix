import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const bin = path.resolve(here, '..', 'dist', 'bin', 'logix.js')

const parseArgs = () => {
  const defaults = {
    samples: 9,
    warmup: 1,
    thresholdMs: 500,
    jsonOut: undefined,
  }

  const argv = process.argv.slice(2)
  const out = { ...defaults }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--samples') out.samples = Number(argv[i + 1])
    if (token === '--warmup') out.warmup = Number(argv[i + 1])
    if (token === '--thresholdMs') out.thresholdMs = Number(argv[i + 1])
    if (token === '--jsonOut') out.jsonOut = argv[i + 1]
    if (token?.startsWith('--')) i += 1
  }

  const asPositiveInt = (value, fallback) =>
    Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback

  return {
    samples: asPositiveInt(out.samples, defaults.samples),
    warmup: asPositiveInt(out.warmup, defaults.warmup),
    thresholdMs: Number.isFinite(out.thresholdMs) && out.thresholdMs > 0 ? out.thresholdMs : defaults.thresholdMs,
    jsonOut: typeof out.jsonOut === 'string' && out.jsonOut.length > 0 ? out.jsonOut : undefined,
  }
}

const percentile = (sorted, p) => {
  if (sorted.length === 0) return 0
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

const runOnce = () => {
  const t0 = process.hrtime.bigint()
  const result = spawnSync(process.execPath, [bin, '--help'], { stdio: 'ignore' })
  const ms = Number(process.hrtime.bigint() - t0) / 1e6
  return { ms, status: typeof result.status === 'number' ? result.status : 1 }
}

if (!fs.existsSync(bin)) {
  console.error(`[logix-cli] missing built bin: ${bin}`)
  console.error('[logix-cli] run: pnpm -C packages/logix-cli build')
  process.exitCode = 1
  process.exit(1)
}

const args = parseArgs()
for (let i = 0; i < args.warmup; i += 1) {
  runOnce()
}

const measures = []
for (let i = 0; i < args.samples; i += 1) {
  measures.push(runOnce())
}

const failures = measures.filter((item) => item.status !== 0)
const sampleMs = measures.map((item) => Number(item.ms.toFixed(2)))
const sorted = [...sampleMs].sort((a, b) => a - b)
const meanMs = sampleMs.length === 0 ? 0 : sampleMs.reduce((sum, value) => sum + value, 0) / sampleMs.length
const p95Ms = percentile(sorted, 95)
const p99Ms = percentile(sorted, 99)
const minMs = sorted[0] ?? 0
const maxMs = sorted[sorted.length - 1] ?? 0
const pass = failures.length === 0 && p95Ms <= args.thresholdMs

const report = {
  schemaVersion: 1,
  kind: 'CliStartupBudgetReport',
  command: 'logix --help',
  bin,
  runner: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  samples: args.samples,
  warmup: args.warmup,
  thresholdMs: Number(args.thresholdMs.toFixed(2)),
  stats: {
    minMs: Number(minMs.toFixed(2)),
    maxMs: Number(maxMs.toFixed(2)),
    meanMs: Number(meanMs.toFixed(2)),
    p95Ms: Number(p95Ms.toFixed(2)),
    p99Ms: Number(p99Ms.toFixed(2)),
  },
  sampleMs,
  failures: failures.map((item, index) => ({ sample: index, status: item.status })),
  pass,
}

if (args.jsonOut) {
  const outPath = path.resolve(process.cwd(), args.jsonOut)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
process.exitCode = pass ? 0 : 1
