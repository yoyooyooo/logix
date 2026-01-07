import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

type PerfDiff = {
  readonly schemaVersion: number
  readonly meta?: {
    readonly createdAt?: string
    readonly from?: { readonly file?: string; readonly commit?: string }
    readonly to?: { readonly file?: string; readonly commit?: string }
    readonly comparability?: {
      readonly comparable: boolean
      readonly allowConfigDrift: boolean
      readonly allowEnvDrift: boolean
      readonly configMismatches?: ReadonlyArray<string>
      readonly envMismatches?: ReadonlyArray<string>
      readonly warnings?: ReadonlyArray<string>
    }
  }
  readonly summary?: {
    readonly regressions?: number
    readonly improvements?: number
  }
  readonly suites?: ReadonlyArray<{
    readonly id: string
    readonly notes?: string
    readonly thresholdDeltas?: ReadonlyArray<unknown>
    readonly evidenceDeltas?: ReadonlyArray<unknown>
    readonly metricDeltas?: ReadonlyArray<{
      readonly metric: string
      readonly unit: 'ms'
      readonly compared: number
      readonly missing: number
      readonly unavailable: number
      readonly topRegressions: ReadonlyArray<{
        readonly params: Record<string, string | number | boolean>
        readonly deltaMs: { readonly medianMs: number; readonly p95Ms: number }
        readonly ratio: { readonly median: number; readonly p95: number }
      }>
      readonly topImprovements: ReadonlyArray<{
        readonly params: Record<string, string | number | boolean>
        readonly deltaMs: { readonly medianMs: number; readonly p95Ms: number }
        readonly ratio: { readonly median: number; readonly p95: number }
      }>
    }>
  }>
}

const usage = (): string => `\
Usage:
  pnpm perf ci:interpret -- --artifact <dir> [--out <file>] [--prefer <gh|any>]

Examples:
  pnpm perf ci:interpret -- --artifact /Users/yoyo/Downloads/logix-perf-quick-12
  pnpm perf ci:interpret -- --artifact perf/ci --out /tmp/summary.md
`

const parseArgs = (argv: ReadonlyArray<string>): { readonly artifactDir: string; readonly out?: string; readonly prefer: 'gh' | 'any' } => {
  const get = (name: string): string | undefined => {
    const idx = argv.lastIndexOf(name)
    if (idx < 0) return undefined
    const value = argv[idx + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${name}`)
    }
    return value
  }

  const artifactDir = get('--artifact')
  const out = get('--out')
  const preferRaw = get('--prefer') ?? 'gh'
  const prefer = preferRaw === 'any' ? 'any' : 'gh'

  if (!artifactDir) {
    throw new Error(`Missing --artifact\n\n${usage()}`)
  }

  return { artifactDir, out, prefer }
}

const readTextIfExists = async (file: string): Promise<string | undefined> => {
  try {
    return await fs.readFile(file, 'utf8')
  } catch {
    return undefined
  }
}

const readJsonIfExists = async <T>(file: string): Promise<T | undefined> => {
  const text = await readTextIfExists(file)
  if (!text) return undefined
  try {
    return JSON.parse(text) as T
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Invalid JSON: ${file} (${msg})`)
  }
}

const listDirSafe = async (dir: string): Promise<ReadonlyArray<string>> => {
  try {
    const names = await fs.readdir(dir)
    return names.map((n) => path.join(dir, n))
  } catch {
    return []
  }
}

const findArtifactFiles = async (artifactDir: string): Promise<{
  readonly summaryMd?: string
  readonly diffJsons: ReadonlyArray<string>
}> => {
  const abs = path.resolve(process.cwd(), artifactDir)
  const direct = await listDirSafe(abs)

  const candidates = new Set<string>()
  for (const p of direct) candidates.add(p)

  // Also support "artifact root" that contains "perf/ci/*"
  for (const nested of ['perf/ci', 'artifacts', 'artifact']) {
    const nestedAbs = path.join(abs, nested)
    for (const p of await listDirSafe(nestedAbs)) candidates.add(p)
  }

  const files = Array.from(candidates)
  const summaryMd = files.find((f) => path.basename(f) === 'summary.md')
  const diffJsons = files
    .filter((f) => f.endsWith('.json') && path.basename(f).startsWith('diff.'))
    .sort((a, b) => a.localeCompare(b))

  return { summaryMd, diffJsons }
}

const pickDiffFile = (diffJsons: ReadonlyArray<string>, prefer: 'gh' | 'any'): string | undefined => {
  if (diffJsons.length === 0) return undefined
  if (prefer === 'any') return diffJsons[0]

  const gh = diffJsons.find((f) => f.includes('.gh-') || f.includes('gh-Linux') || f.includes('gh-'))
  return gh ?? diffJsons[0]
}

const formatParams = (params: Record<string, string | number | boolean>): string => {
  const keys = Object.keys(params).sort()
  return `{${keys.map((k) => `${k}=${String(params[k])}`).join('&')}}`
}

const renderFromDiff = (diff: PerfDiff): string => {
  const comparable = diff.meta?.comparability?.comparable
  const allowConfigDrift = diff.meta?.comparability?.allowConfigDrift
  const allowEnvDrift = diff.meta?.comparability?.allowEnvDrift
  const warnings = diff.meta?.comparability?.warnings ?? []
  const regressions = diff.summary?.regressions ?? 0
  const improvements = diff.summary?.improvements ?? 0

  const lines: string[] = []
  lines.push(`### logix-perf artifact 解读`)
  if (diff.meta?.from?.commit || diff.meta?.to?.commit) {
    lines.push(`- base: \`${String(diff.meta?.from?.commit ?? '')}\`  head: \`${String(diff.meta?.to?.commit ?? '')}\``)
  }
  lines.push(`- comparable: \`${String(comparable)}\` (allowConfigDrift=${String(allowConfigDrift)}, allowEnvDrift=${String(allowEnvDrift)})`)
  lines.push(`- regressions: \`${String(regressions)}\`  improvements: \`${String(improvements)}\``)

  if (warnings.length > 0) {
    lines.push('')
    lines.push('**warnings**')
    for (const w of warnings) lines.push(`- \`${w}\``)
  }

  const suites = diff.suites ?? []
  const metricDeltas = suites
    .flatMap((s) =>
      (s.metricDeltas ?? []).flatMap((m) =>
        m.topRegressions.slice(0, 3).map((p) => ({
          suite: s.id,
          metric: m.metric,
          kind: 'regression' as const,
          params: p.params,
          ratio: p.ratio,
          deltaMs: p.deltaMs,
        })),
      ),
    )
    .sort((a, b) => b.ratio.p95 - a.ratio.p95)

  if (metricDeltas.length > 0) {
    lines.push('')
    lines.push('**top regressions (by p95 ratio)**')
    for (const d of metricDeltas.slice(0, 6)) {
      const tailOnly = d.ratio.p95 > 1 && d.ratio.median <= 1.02
      lines.push(
        `- \`${d.suite}\` \`${d.metric}\` ${formatParams(d.params)} p95×${d.ratio.p95.toFixed(3)} (Δ=${d.deltaMs.p95Ms.toFixed(
          3,
        )}ms) median×${d.ratio.median.toFixed(3)} ${tailOnly ? '(tail-only?)' : ''}`,
      )
    }
  }

  return `${lines.join('\n')}\n`
}

const main = async (): Promise<void> => {
  const { artifactDir, out, prefer } = parseArgs(process.argv.slice(2))
  const { summaryMd, diffJsons } = await findArtifactFiles(artifactDir)

  const summaryText = summaryMd ? await readTextIfExists(summaryMd) : undefined
  if (summaryText && summaryText.trim().length > 0) {
    if (out) {
      await fs.mkdir(path.dirname(out), { recursive: true })
      await fs.writeFile(out, summaryText, 'utf8')
      // eslint-disable-next-line no-console
      console.log(`[logix-perf] wrote ${out}`)
    } else {
      // eslint-disable-next-line no-console
      console.log(summaryText.trimEnd())
    }
    return
  }

  const diffFile = pickDiffFile(diffJsons, prefer)
  if (!diffFile) {
    throw new Error(`No summary.md or diff.*.json found under: ${artifactDir}`)
  }

  const diff = await readJsonIfExists<PerfDiff>(diffFile)
  if (!diff) {
    throw new Error(`Failed to read diff json: ${diffFile}`)
  }

  const rendered = renderFromDiff(diff)
  if (out) {
    await fs.mkdir(path.dirname(out), { recursive: true })
    await fs.writeFile(out, rendered, 'utf8')
    // eslint-disable-next-line no-console
    console.log(`[logix-perf] wrote ${out}`)
  } else {
    // eslint-disable-next-line no-console
    console.log(rendered.trimEnd())
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})

