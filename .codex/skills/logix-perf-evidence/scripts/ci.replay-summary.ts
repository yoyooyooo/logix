import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

type SummaryReplayCase = {
  readonly id: string
  readonly env?: Record<string, string>
  readonly files: {
    readonly before?: unknown
    readonly after?: unknown
    readonly afterProbe?: unknown
    readonly diff?: unknown
    readonly autoProbeBase?: unknown
    readonly autoProbeHead?: unknown
    readonly tailRecheckPlan?: unknown
    readonly tailRecheckSummary?: unknown
    readonly capacityLatest?: unknown
    readonly agentResult?: unknown
    readonly curveHistoryRuns?: ReadonlyArray<{
      readonly runId: string
      readonly after: unknown
    }>
  }
  readonly expect: {
    readonly status: string
    readonly headSignalSource?: 'anchor' | 'probe'
    readonly contains?: ReadonlyArray<string>
  }
}

type Fixture = {
  readonly cases: ReadonlyArray<SummaryReplayCase>
}

const BASE_SHORT = '11111111'
const HEAD_SHORT = '22222222'
const PERF_ENV_ID = 'local-ci-replay'
const PERF_PROFILE = 'quick'

const readFixture = async (): Promise<Fixture> => {
  const fixturePath = path.resolve(
    process.cwd(),
    '.codex/skills/logix-perf-evidence/fixtures/perf-sweep/summary-replay-cases.json',
  )
  const text = await fs.readFile(fixturePath, 'utf8')
  return JSON.parse(text) as Fixture
}

const writeJson = async (file: string, payload: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

const runCase = async (rootDir: string, item: SummaryReplayCase): Promise<void> => {
  const caseDir = path.join(rootDir, item.id)
  const perfDir = path.join(caseDir, 'perf', 'ci')
  await fs.mkdir(perfDir, { recursive: true })

  if (item.files.before !== undefined) {
    await writeJson(path.join(perfDir, `before.${BASE_SHORT}.${PERF_ENV_ID}.${PERF_PROFILE}.json`), item.files.before)
  }
  if (item.files.after !== undefined) {
    await writeJson(path.join(perfDir, `after.${HEAD_SHORT}.${PERF_ENV_ID}.${PERF_PROFILE}.json`), item.files.after)
  }
  if (item.files.afterProbe !== undefined) {
    await writeJson(path.join(perfDir, `after.probe.${HEAD_SHORT}.${PERF_ENV_ID}.${PERF_PROFILE}.json`), item.files.afterProbe)
  }
  if (item.files.diff !== undefined) {
    await writeJson(path.join(perfDir, `diff.${BASE_SHORT}__${HEAD_SHORT}.${PERF_ENV_ID}.${PERF_PROFILE}.json`), item.files.diff)
  }
  if (item.files.autoProbeBase !== undefined) {
    await writeJson(path.join(perfDir, `steps-probe.base.${BASE_SHORT}.${PERF_ENV_ID}.${PERF_PROFILE}.json`), item.files.autoProbeBase)
  }
  if (item.files.autoProbeHead !== undefined) {
    await writeJson(path.join(perfDir, `steps-probe.head.${HEAD_SHORT}.${PERF_ENV_ID}.${PERF_PROFILE}.json`), item.files.autoProbeHead)
  }
  if (item.files.tailRecheckPlan !== undefined) {
    await writeJson(path.join(perfDir, 'tail-recheck-plan.json'), item.files.tailRecheckPlan)
  }
  if (item.files.tailRecheckSummary !== undefined) {
    await writeJson(path.join(perfDir, 'tail-recheck-summary.json'), item.files.tailRecheckSummary)
  }
  if (item.files.capacityLatest !== undefined) {
    await writeJson(path.join(perfDir, 'capacity-latest.json'), item.files.capacityLatest)
  }
  if (item.files.agentResult !== undefined) {
    await writeJson(path.join(perfDir, 'agent-result.json'), item.files.agentResult)
  }

  const extraEnv: Record<string, string> = {}
  if (Array.isArray(item.files.curveHistoryRuns) && item.files.curveHistoryRuns.length > 0) {
    const historyDir = path.join(perfDir, 'curve-history')
    for (const historyRun of item.files.curveHistoryRuns) {
      const runDir = path.join(historyDir, `run-${historyRun.runId}`)
      await writeJson(
        path.join(runDir, `after.${HEAD_SHORT}.${PERF_ENV_ID}.${PERF_PROFILE}.json`),
        historyRun.after,
      )
    }
    extraEnv.PERF_CURVE_HISTORY_DIR = historyDir
  }

  const quickSummaryScript = path.resolve(process.cwd(), '.github/scripts/logix-perf-quick-summary.cjs')
  const summaryOut = path.join(perfDir, 'summary.md')
  const run = spawnSync('node', [quickSummaryScript], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PERF_OUT_DIR: perfDir,
      BASE_SHORT,
      HEAD_SHORT,
      PERF_ENV_ID,
      PERF_PROFILE,
      PERF_FILES: 'test/browser/perf-boundaries/converge-steps.test.tsx',
      PERF_CAPACITY_FLOOR_MIN: '',
      ...extraEnv,
      ...(item.env ?? {}),
    },
    encoding: 'utf8',
  })

  if (run.status !== 0) {
    const stderr = run.stderr?.trim() || '(empty stderr)'
    throw new Error(`[summary-replay:${item.id}] quick-summary failed (code=${String(run.status)}): ${stderr}`)
  }

  if (!fsSync.existsSync(summaryOut)) {
    throw new Error(`[summary-replay:${item.id}] summary.md not generated`)
  }

  const summaryText = await fs.readFile(summaryOut, 'utf8')
  const statusMatch = summaryText.match(/- status:\s*`([^`]+)`/)
  const actualStatus = statusMatch?.[1]
  if (!actualStatus) {
    throw new Error(`[summary-replay:${item.id}] cannot parse status from summary.md`)
  }
  if (actualStatus !== item.expect.status) {
    throw new Error(
      `[summary-replay:${item.id}] status mismatch, expect=${item.expect.status} got=${actualStatus}`,
    )
  }

  if (item.expect.headSignalSource !== undefined) {
    const sourceMatch = summaryText.match(/- head signal source:\s*`([^`]+)`/)
    const actualSource = sourceMatch?.[1]
    if (!actualSource) {
      throw new Error(`[summary-replay:${item.id}] cannot parse head signal source from summary.md`)
    }
    if (actualSource !== item.expect.headSignalSource) {
      throw new Error(
        `[summary-replay:${item.id}] headSignalSource mismatch, expect=${item.expect.headSignalSource} got=${actualSource}`,
      )
    }
  }

  if (Array.isArray(item.expect.contains) && item.expect.contains.length > 0) {
    for (const token of item.expect.contains) {
      if (!summaryText.includes(token)) {
        throw new Error(`[summary-replay:${item.id}] expected token not found: ${token}`)
      }
    }
  }
}

const main = async (): Promise<void> => {
  const fixture = await readFixture()
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-perf-summary-replay-'))

  try {
    for (const item of fixture.cases) {
      await runCase(rootDir, item)
    }
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true })
  }

  // eslint-disable-next-line no-console
  console.log(`[logix-perf] summary replay passed (cases=${fixture.cases.length})`)
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
