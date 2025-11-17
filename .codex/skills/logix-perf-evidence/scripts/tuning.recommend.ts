import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

type Primitive = string | number | boolean
type Params = Record<string, Primitive>

const parsePositiveNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : undefined
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const n = Number(trimmed)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }
  return undefined
}

type Budget =
  | { readonly id?: string; readonly type: 'absolute'; readonly metric: string; readonly p95Ms: number }
  | {
      readonly id?: string
      readonly type: 'relative'
      readonly metric: string
      readonly maxRatio: number
      readonly numeratorRef: string
      readonly denominatorRef: string
    }

type MetricResult =
  | {
      readonly name: string
      readonly unit: 'ms'
      readonly status: 'ok'
      readonly stats: { readonly n: number; readonly medianMs: number; readonly p95Ms: number }
    }
  | { readonly name: string; readonly unit: 'ms'; readonly status: 'unavailable'; readonly unavailableReason: string }

type PointResult = {
  readonly params: Params
  readonly status: 'ok' | 'timeout' | 'failed' | 'skipped'
  readonly reason?: string
  readonly metrics: ReadonlyArray<MetricResult>
}

type ThresholdResult = {
  readonly budget: Budget
  readonly where?: Params
  readonly maxLevel: Primitive | null
  readonly firstFailLevel?: Primitive | null
  readonly reason?: string
}

type PerfReport = {
  readonly schemaVersion: number
  readonly meta?: {
    readonly createdAt?: string
    readonly generator?: string
    readonly matrixId?: string
    readonly config?: Record<string, unknown>
    readonly git?: Record<string, unknown>
    readonly env?: Record<string, unknown>
  }
  readonly suites: ReadonlyArray<{
    readonly id: string
    readonly points: ReadonlyArray<PointResult>
    readonly thresholds?: ReadonlyArray<ThresholdResult>
  }>
}

type PerfMatrix = {
  readonly id: string
  readonly suites: ReadonlyArray<{
    readonly id: string
    readonly axes: Record<string, ReadonlyArray<Primitive>>
  }>
}

type Candidate = {
  readonly traitConvergeBudgetMs?: number
  readonly traitConvergeDecisionBudgetMs: number
}

const parseCandidates = (value: unknown): ReadonlyArray<Candidate> => {
  if (!Array.isArray(value)) throw new Error('--candidates must be a JSON array')

  return value.map((raw, idx) => {
    if (raw == null || typeof raw !== 'object') {
      throw new Error(`--candidates[${String(idx)}] must be an object`)
    }
    const o = raw as Record<string, unknown>

    const decisionBudgetMs = parsePositiveNumber(o.traitConvergeDecisionBudgetMs)
    if (decisionBudgetMs == null) {
      throw new Error(`--candidates[${String(idx)}].traitConvergeDecisionBudgetMs must be > 0`)
    }

    const budgetMs = parsePositiveNumber(o.traitConvergeBudgetMs)
    return {
      ...(budgetMs != null ? { traitConvergeBudgetMs: budgetMs } : {}),
      traitConvergeDecisionBudgetMs: decisionBudgetMs,
    }
  })
}

const parseArgs = (
  argv: ReadonlyArray<string>,
): {
  readonly profile: string
  readonly confirm: boolean
  readonly confirmProfile: string
  readonly confirmTop: number
  readonly outDir: string
  readonly matrixFile: string
  readonly files: ReadonlyArray<string>
  readonly retries: number
  readonly candidates: ReadonlyArray<Candidate>
} => {
  const get = (name: string): string | undefined => {
    const idx = argv.indexOf(name)
    if (idx < 0) return undefined
    return argv[idx + 1]
  }

  const profile = get('--profile') ?? 'quick'
  const confirm = argv.includes('--confirm')
  const confirmProfile = get('--confirm-profile') ?? 'default'

  const confirmTopRaw = get('--confirm-top')
  const confirmTop = confirmTopRaw && /^\d+$/.test(confirmTopRaw) ? Math.max(1, Number(confirmTopRaw)) : 2
  const outDir = get('--out-dir') ?? 'perf/tuning'
  const matrixFile = get('--matrix') ?? '.codex/skills/logix-perf-evidence/assets/matrix.json'

  const files: string[] = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--files') {
      const v = argv[i + 1]
      if (v) files.push(v)
    }
  }

  const retriesRaw = get('--retries')
  const retries = retriesRaw && /^\d+$/.test(retriesRaw) ? Math.max(0, Number(retriesRaw)) : 1

  const candidatesFlag = get('--candidates')
  const candidates: ReadonlyArray<Candidate> =
    candidatesFlag && candidatesFlag.trim().length > 0
      ? parseCandidates(JSON.parse(candidatesFlag) as unknown)
      : [
          { traitConvergeBudgetMs: 200, traitConvergeDecisionBudgetMs: 0.25 },
          { traitConvergeBudgetMs: 200, traitConvergeDecisionBudgetMs: 0.5 },
          { traitConvergeBudgetMs: 200, traitConvergeDecisionBudgetMs: 1 },
          { traitConvergeBudgetMs: 200, traitConvergeDecisionBudgetMs: 2 },
        ]

  return {
    profile,
    confirm,
    confirmProfile,
    confirmTop,
    outDir,
    matrixFile,
    files: files.length > 0 ? files : ['test/browser/perf-boundaries/converge-steps.test.tsx'],
    retries,
    candidates,
  }
}

const budgetKey = (b: Budget): string =>
  b.id ??
  (b.type === 'absolute'
    ? `absolute:${b.metric}:p95<=${b.p95Ms}`
    : `relative:${b.metric}:${b.numeratorRef}/${b.denominatorRef}<=${b.maxRatio}`)

const isEqualParam = (a: Primitive | undefined, b: Primitive | undefined): boolean => a === b

const findPoint = (points: ReadonlyArray<PointResult>, expected: Params): PointResult | undefined =>
  points.find((p) => Object.keys(expected).every((k) => isEqualParam(p.params[k], expected[k])))

const getMetricP95Ms = (
  point: PointResult,
  metric: string,
): { readonly ok: true; readonly p95Ms: number } | { readonly ok: false; readonly reason: string } => {
  if (point.status !== 'ok') {
    return { ok: false, reason: point.reason ?? point.status }
  }
  const m = point.metrics.find((x) => x.name === metric)
  if (!m) return { ok: false, reason: 'metricMissing' }
  if (m.status !== 'ok') return { ok: false, reason: m.unavailableReason }
  return { ok: true, p95Ms: m.stats.p95Ms }
}

const normalizeCandidateId = (c: Candidate): string =>
  [
    c.traitConvergeBudgetMs != null ? `executionBudgetMs=${String(c.traitConvergeBudgetMs)}` : undefined,
    `decisionBudgetMs=${String(c.traitConvergeDecisionBudgetMs)}`,
  ]
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
    .join(',')

const runCollect = async (args: {
  readonly profile: string
  readonly outFile: string
  readonly files: ReadonlyArray<string>
  readonly env: NodeJS.ProcessEnv
}): Promise<void> => {
  const MAX_CAPTURE_CHARS = 24_000

  return new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      [
        'tsx',
        '.codex/skills/logix-perf-evidence/scripts/collect.ts',
        '--profile',
        args.profile,
        '--out',
        args.outFile,
        ...args.files.flatMap((f) => ['--files', f]),
      ],
      {
        env: args.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    let captured = ''
    const capture = (chunk: unknown) => {
      const s = typeof chunk === 'string' ? chunk : Buffer.isBuffer(chunk) ? chunk.toString('utf8') : ''
      if (!s) return
      captured = (captured + s).slice(-MAX_CAPTURE_CHARS)
    }

    child.stdout?.on('data', (chunk) => {
      process.stdout.write(chunk)
      capture(chunk)
    })
    child.stderr?.on('data', (chunk) => {
      process.stderr.write(chunk)
      capture(chunk)
    })

    child.on('close', (code) => {
      if (code === 0) resolve()
      else {
        const exitCode = String(code ?? 'unknown')
        const details = captured.trim()
        reject(
          new Error(
            details.length > 0
              ? `collect failed (exitCode=${exitCode})\n---\n${details}`
              : `collect failed (exitCode=${exitCode})`,
          ),
        )
      }
    })
  })
}

const toNumberOrZero = (v: Primitive | null | undefined): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0

const main = async (): Promise<void> => {
  const { profile, confirm, confirmProfile, confirmTop, outDir, matrixFile, files, retries, candidates } = parseArgs(
    process.argv.slice(2),
  )

  const matrix = JSON.parse(await fs.readFile(matrixFile, 'utf8')) as PerfMatrix
  const suiteSpec = matrix.suites.find((s) => s.id === 'converge.txnCommit')
  if (!suiteSpec) {
    throw new Error(`matrix missing suite converge.txnCommit: ${matrixFile}`)
  }

  const stepsLevels = (suiteSpec.axes.steps ?? []).filter((x): x is number => typeof x === 'number')
  if (stepsLevels.length === 0) {
    throw new Error(`matrix suite converge.txnCommit missing axes.steps: ${matrixFile}`)
  }
  const expectedMaxSteps = Math.max(...stepsLevels)

  const dirtyRootsRatios = suiteSpec.axes.dirtyRootsRatio ?? []
  if (dirtyRootsRatios.length === 0) {
    throw new Error(`matrix suite converge.txnCommit missing axes.dirtyRootsRatio: ${matrixFile}`)
  }

  await fs.mkdir(outDir, { recursive: true })

  type CandidateRun = {
    readonly candidate: Candidate
    readonly id: string
    readonly profile: string
    readonly reportFile?: string
    readonly reportMeta?: PerfReport['meta']
    readonly ok: boolean
    readonly error?: string
    readonly hardGate?: {
      readonly id: string
      readonly expectedMaxLevel: number
      readonly ok: boolean
      readonly failures?: ReadonlyArray<{
        readonly where?: Params
        readonly maxLevel: Primitive | null
        readonly firstFailLevel?: Primitive | null
        readonly reason?: string
      }>
    }
    readonly score?: { readonly worstMaxLevel: number; readonly sumMaxLevel: number }
    readonly slices?: ReadonlyArray<{
      readonly dirtyRootsRatio: number
      readonly maxLevel: number
      readonly firstFailLevel?: Primitive | null
      readonly reason?: string
      readonly p95AtMaxLevelMs?: number
      readonly p95Reason?: string
    }>
  }

  const evaluateCandidate = async (candidate: Candidate, profileToRun: string): Promise<CandidateRun> => {
    const id = normalizeCandidateId(candidate)
    const reportFile = path.join(outDir, `sweep.017.${id}.${profileToRun}.json`)

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      VITE_LOGIX_PERF_TUNING_ID: id,
      VITE_LOGIX_TRAIT_CONVERGE_DECISION_BUDGET_MS: String(candidate.traitConvergeDecisionBudgetMs),
      ...(candidate.traitConvergeBudgetMs != null
        ? { VITE_LOGIX_TRAIT_CONVERGE_BUDGET_MS: String(candidate.traitConvergeBudgetMs) }
        : {}),
    }

    try {
      let attempt = 0
      while (true) {
        attempt += 1
        try {
          await runCollect({ profile: profileToRun, outFile: reportFile, files, env })
          break
        } catch (e) {
          if (attempt >= retries + 1) throw e
          // eslint-disable-next-line no-console
          console.warn(`[logix-perf] retry ${String(attempt - 1)}/${String(retries)} for ${id}`)
        }
      }

      const report = JSON.parse(await fs.readFile(reportFile, 'utf8')) as PerfReport
      const suite = report.suites.find((s) => s.id === 'converge.txnCommit')
      if (!suite) {
        throw new Error(`report missing suite converge.txnCommit: ${reportFile}`)
      }

      const thresholds = Array.isArray(suite.thresholds) ? suite.thresholds : []
      if (thresholds.length === 0) {
        throw new Error(`report missing thresholds: ${reportFile}`)
      }

      const hardGateBudgetId = 'auto<=full*1.05'
      const hardGateThresholds = thresholds.filter((t) => budgetKey(t.budget) === hardGateBudgetId)
      const hardGateFailures = hardGateThresholds.filter((t) => toNumberOrZero(t.maxLevel) !== expectedMaxSteps)
      const hardGate = {
        id: hardGateBudgetId,
        expectedMaxLevel: expectedMaxSteps,
        ok: hardGateThresholds.length > 0 && hardGateFailures.length === 0,
        ...(hardGateFailures.length > 0
          ? {
              failures: hardGateFailures.map((t) => ({
                where: t.where,
                maxLevel: t.maxLevel,
                firstFailLevel: t.firstFailLevel,
                reason: t.reason,
              })),
            }
          : {}),
      } as const

      const budgetId = 'commit.p95<=50ms'
      const metric = 'runtime.txnCommitMs'

      const slices = dirtyRootsRatios
        .filter((x): x is number => typeof x === 'number')
        .map((dirtyRootsRatio) => {
          const t = thresholds.find(
            (th) =>
              budgetKey(th.budget) === budgetId &&
              th.where?.convergeMode === 'auto' &&
              th.where?.dirtyRootsRatio === dirtyRootsRatio,
          )

          const maxLevel = toNumberOrZero(t?.maxLevel)
          const p =
            maxLevel > 0
              ? findPoint(suite.points, {
                  convergeMode: 'auto',
                  dirtyRootsRatio,
                  steps: maxLevel,
                })
              : undefined

          const p95: ReturnType<typeof getMetricP95Ms> =
            p != null ? getMetricP95Ms(p, metric) : { ok: false as const, reason: 'noPoint' }

          const p95Fields =
            p95.ok === true ? ({ p95AtMaxLevelMs: p95.p95Ms } as const) : ({ p95Reason: p95.reason } as const)

          return {
            dirtyRootsRatio,
            maxLevel,
            ...(t
              ? {
                  firstFailLevel: t.firstFailLevel,
                  reason: t.reason,
                }
              : {
                  firstFailLevel: null,
                  reason: 'thresholdMissing',
                }),
            ...p95Fields,
          }
        })

      const maxLevels = slices.map((s) => s.maxLevel)
      const worstMaxLevel = maxLevels.length > 0 ? Math.min(...maxLevels) : 0
      const sumMaxLevel = maxLevels.reduce((a, b) => a + b, 0)

      return {
        candidate,
        id,
        profile: profileToRun,
        reportFile,
        reportMeta: report.meta,
        ok: true,
        hardGate,
        score: { worstMaxLevel, sumMaxLevel },
        slices,
      }
    } catch (e) {
      return {
        candidate,
        id,
        profile: profileToRun,
        reportFile,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      }
    }
  }

  const results: CandidateRun[] = []
  for (const candidate of candidates) {
    results.push(await evaluateCandidate(candidate, profile))
  }

  const okResults = results.filter((r) => r.ok && r.score && r.hardGate?.ok === true)
  if (okResults.length === 0) {
    throw new Error('no safe candidates (hardGate/thresholds); see errors above')
  }

  okResults.sort((a, b) => {
    const aWorst = a.score!.worstMaxLevel
    const bWorst = b.score!.worstMaxLevel
    if (bWorst !== aWorst) return bWorst - aWorst
    return b.score!.sumMaxLevel - a.score!.sumMaxLevel
  })

  const winner = okResults[0]!
  const runnerUp = okResults.length > 1 ? okResults[1]! : undefined

  const winnerDelta = runnerUp
    ? {
        worstMaxLevel: winner.score!.worstMaxLevel - runnerUp.score!.worstMaxLevel,
        sumMaxLevel: winner.score!.sumMaxLevel - runnerUp.score!.sumMaxLevel,
      }
    : undefined

  const confirmNeeded = winnerDelta != null && winnerDelta.worstMaxLevel === 0 && winnerDelta.sumMaxLevel <= 1

  const confirmation = confirm
    ? confirmNeeded
      ? (() => {
          const targets = okResults.slice(0, Math.min(confirmTop, okResults.length))
          return { targets, profile: confirmProfile } as const
        })()
      : ({ targets: [], profile: confirmProfile, skippedReason: 'winnerNotClose' } as const)
    : undefined

  const confirmationRuns: CandidateRun[] =
    confirmation && confirmation.targets.length > 0
      ? await (async () => {
          const out: CandidateRun[] = []
          for (const r of confirmation.targets) {
            out.push(await evaluateCandidate(r.candidate, confirmation.profile))
          }
          return out
        })()
      : []

  const confirmationOk = confirmationRuns.filter((r) => r.ok && r.score && r.hardGate?.ok === true)
  if (confirmationOk.length > 0) {
    confirmationOk.sort((a, b) => {
      const aWorst = a.score!.worstMaxLevel
      const bWorst = b.score!.worstMaxLevel
      if (bWorst !== aWorst) return bWorst - aWorst
      return b.score!.sumMaxLevel - a.score!.sumMaxLevel
    })
  }

  const confirmedWinner = confirmationOk.length > 0 ? confirmationOk[0]! : undefined
  const confirmationSummary = confirmation
    ? {
        requested: true,
        performed: confirmationRuns.length > 0,
        profile: confirmation.profile,
        targets: confirmation.targets.map((r) => r.id),
        ...(confirmation.skippedReason ? { skippedReason: confirmation.skippedReason } : {}),
        ...(confirmedWinner
          ? {
              confirmedWinnerId: confirmedWinner.id,
              changedWinner: confirmedWinner.id !== winner.id,
            }
          : {}),
      }
    : { requested: false as const }

  const confirmationPerformed = confirmationSummary.requested === true && confirmationSummary.performed === true

  const candidatesJson = JSON.stringify(candidates)
  const filesFlags = files.flatMap((f) => ['--files', f])
  const repro = {
    recommend: {
      command: 'pnpm perf tuning:recommend',
      argv: [
        '--profile',
        profile,
        '--matrix',
        matrixFile,
        '--out-dir',
        outDir,
        '--retries',
        String(retries),
        ...filesFlags,
        '--candidates',
        candidatesJson,
      ],
      note: 'argv 需要放在 `--` 之后传入（例如：pnpm perf tuning:recommend -- <argv...>）',
    },
  } as const

  const errorKinds: Record<string, number> = {}
  for (const r of results) {
    if (r.ok) continue
    const msg = (r.error ?? '').toLowerCase()
    const kind = msg.includes('collect failed')
      ? 'collectFailed'
      : msg.includes('matrix missing suite')
        ? 'matrixMissingSuite'
        : msg.includes('report missing')
          ? 'reportMissing'
          : 'unknown'
    errorKinds[kind] = (errorKinds[kind] ?? 0) + 1
  }

  const sliceIssueCounts: Record<string, number> = {}
  for (const r of results) {
    if (!r.ok || !Array.isArray(r.slices)) continue
    for (const s of r.slices as any[]) {
      const thresholdReason = typeof s?.reason === 'string' && s.reason.trim().length > 0 ? s.reason.trim() : undefined
      const p95Reason =
        typeof s?.p95Reason === 'string' && s.p95Reason.trim().length > 0 ? s.p95Reason.trim() : undefined

      if (thresholdReason) {
        const k = `threshold:${thresholdReason}`
        sliceIssueCounts[k] = (sliceIssueCounts[k] ?? 0) + 1
      }
      if (p95Reason) {
        const k = `p95:${p95Reason}`
        sliceIssueCounts[k] = (sliceIssueCounts[k] ?? 0) + 1
      }
    }
  }

  const uncomparable = {
    candidates: {
      error: results.filter((r) => !r.ok).length,
      okWithMissingThreshold: results.filter(
        (r) => r.ok && Array.isArray(r.slices) && (r.slices as any[]).some((s) => s?.reason === 'thresholdMissing'),
      ).length,
    },
    reasonDist: {
      errorKinds,
      sliceIssues: sliceIssueCounts,
    },
  } as const

  const recommendation = {
    schemaVersion: 1,
    meta: {
      createdAt: new Date().toISOString(),
      generator: '.codex/skills/logix-perf-evidence/scripts/tuning.recommend.ts',
      profile,
      confirm: { enabled: confirm, confirmProfile, confirmTop },
      matrixId: matrix.id,
      matrixFile,
      files,
      repro,
      scoreSpec: {
        suiteId: 'converge.txnCommit',
        hardGateBudgetId: 'auto<=full*1.05',
        budgetId: 'commit.p95<=50ms',
        metric: 'runtime.txnCommitMs',
        where: { convergeMode: 'auto' },
        slices: ['dirtyRootsRatio'],
      },
    },
    summary: {
      winnerId: winner.id,
      winnerScore: winner.score,
      ...(winnerDelta ? { winnerDeltaToRunnerUp: winnerDelta } : {}),
      ...(winner.reportMeta?.git || winner.reportMeta?.env
        ? { winnerReportMeta: { git: winner.reportMeta?.git, env: winner.reportMeta?.env } }
        : {}),
      ...(runnerUp && (runnerUp.reportMeta?.git || runnerUp.reportMeta?.env)
        ? { runnerUpReportMeta: { git: runnerUp.reportMeta?.git, env: runnerUp.reportMeta?.env } }
        : {}),
      ...(confirm ? { confirmation: confirmationSummary } : {}),
      candidates: {
        total: results.length,
        ok: results.filter((r) => r.ok).length,
        error: results.filter((r) => !r.ok).length,
      },
      hardGate: {
        id: 'auto<=full*1.05',
        expectedMaxLevel: expectedMaxSteps,
        ok: results.filter((r) => r.hardGate?.ok === true).length,
        failed: results.filter((r) => r.hardGate?.ok === false).length,
        unknown: results.filter((r) => r.hardGate == null).length,
      },
      uncomparable,
      nextActions: [
        winnerDelta && winnerDelta.worstMaxLevel === 0 && winnerDelta.sumMaxLevel <= 1
          ? 'winner 与 runner-up 很接近：建议用 profile=default 复跑 winner/top2 确认稳定性'
          : '若 winner 贴近阈值或出现明显抖动：建议用 profile=default 复跑 winner（或 top2）确认',
        results.some((r) => !r.ok)
          ? '存在采集失败候选：可用 --retries 1..2 进行有限重试，或缩小 candidates'
          : '若要形成发布级证据：将 winner 作为 After，进入 014 做 Before/After diff',
        ...(confirm && confirmationPerformed && confirmedWinner && confirmedWinner.id !== winner.id
          ? ['profile=default 确认后 winner 发生变化：结论不稳定，建议缩小 candidates 或增加采样再跑']
          : []),
      ],
    },
    candidates: results.map((r) => ({
      id: r.id,
      profile: r.profile,
      ok: r.ok,
      reportFile: r.reportFile,
      error: r.error,
      hardGate: r.hardGate,
      score: r.score,
      slices: r.slices,
    })),
    winner: {
      id: winner.id,
      recommendedDefault: {
        stateTransaction: {
          traitConvergeMode: 'auto',
          ...(winner.candidate.traitConvergeBudgetMs != null
            ? { traitConvergeBudgetMs: winner.candidate.traitConvergeBudgetMs }
            : {}),
          traitConvergeDecisionBudgetMs: winner.candidate.traitConvergeDecisionBudgetMs,
        },
      },
      score: winner.score,
      evidence: {
        reportFile: winner.reportFile,
      },
    },
  }

  const outFile = path.join(outDir, `recommendation.017.${profile}.json`)
  await fs.writeFile(outFile, `${JSON.stringify(recommendation, null, 2)}\n`, 'utf8')

  const mdFile = path.join(outDir, `recommendation.017.${profile}.md`)
  const mdLatestFile = path.join(outDir, 'recommendation.latest.md')
  const jsonLatestFile = path.join(outDir, 'recommendation.latest.json')

  const mdTableRows =
    Array.isArray(winner.slices) && winner.slices.length > 0
      ? winner.slices
          .map((s) => {
            const p95 =
              typeof (s as any).p95AtMaxLevelMs === 'number'
                ? String((s as any).p95AtMaxLevelMs)
                : `unavailable:${String((s as any).p95Reason ?? 'unknown')}`
            return `| ${String((s as any).dirtyRootsRatio)} | ${String((s as any).maxLevel)} | ${p95} |`
          })
          .join('\n')
      : '| - | - | - |'

  const md = [
    `# 017 推荐默认值（profile=${profile}）`,
    ``,
    `- 生成时间：${recommendation.meta.createdAt}`,
    `- Winner：\`${winner.id}\``,
    `- 证据：\`${winner.reportFile}\``,
    ``,
    `## 推荐配置（可复制）`,
    ``,
    '```ts',
    `stateTransaction: { traitConvergeMode: "auto"${
      winner.candidate.traitConvergeBudgetMs != null
        ? `, traitConvergeBudgetMs: ${String(winner.candidate.traitConvergeBudgetMs)}`
        : ''
    }, traitConvergeDecisionBudgetMs: ${String(winner.candidate.traitConvergeDecisionBudgetMs)} }`,
    '```',
    ``,
    `## 评分（commit.p95<=50ms @ convergeMode=auto）`,
    ``,
    `- worstMaxLevel: ${String(winner.score?.worstMaxLevel ?? 'unknown')}`,
    `- sumMaxLevel: ${String(winner.score?.sumMaxLevel ?? 'unknown')}`,
    ``,
    `## 切片明细（winner）`,
    ``,
    `| dirtyRootsRatio | maxLevel | p95@maxLevel (ms) |`,
    `|---:|---:|---:|`,
    mdTableRows,
    ``,
    `> 说明：这里的 maxLevel 来自 suite=converge.txnCommit 的 budget=commit.p95<=50ms；沿 primaryAxis=steps 扫描得到。`,
    ``,
    `- 机器可解析汇总：\`${outFile}\``,
  ].join('\n')

  await fs.writeFile(mdFile, `${md}\n`, 'utf8')
  await fs.writeFile(mdLatestFile, `${md}\n`, 'utf8')
  await fs.writeFile(jsonLatestFile, `${JSON.stringify(recommendation, null, 2)}\n`, 'utf8')

  // eslint-disable-next-line no-console
  console.log(`[logix-perf] winner: ${winner.id}`)
  // eslint-disable-next-line no-console
  console.log(`[logix-perf] wrote ${outFile}`)
  // eslint-disable-next-line no-console
  console.log(`[logix-perf] wrote ${mdFile}`)
  // eslint-disable-next-line no-console
  console.log(`[logix-perf] wrote ${mdLatestFile}`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
