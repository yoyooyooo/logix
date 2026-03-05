import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

type BudgetControllerTimelineStep =
  | {
      readonly action: 'canRunCollect'
      readonly atMs?: number
      readonly expect: {
        readonly ok: boolean
        readonly reasonCode?: string
      }
    }
  | {
      readonly action: 'recordCollect'
      readonly durationMs: number
    }

type BudgetControllerCase = {
  readonly id: string
  readonly config: {
    readonly timeBudgetMinutes: number
    readonly reserveMinutes: number
    readonly maxTotalCollects: number
    readonly minCollectEstimateSeconds: number
  }
  readonly timeline: ReadonlyArray<BudgetControllerTimelineStep>
}

type DecisionCase = {
  readonly id: string
  readonly input: Record<string, unknown>
  readonly expect: {
    readonly decision: string
    readonly shouldExtend: boolean
    readonly topSaturated: boolean
  }
}

type Fixture = {
  readonly budgetControllerCases: ReadonlyArray<BudgetControllerCase>
  readonly decisionCases: ReadonlyArray<DecisionCase>
}

const require = createRequire(import.meta.url)
const { createBudgetController } = require('../../../../.github/scripts/lib/logix-perf-budget-controller.cjs') as {
  readonly createBudgetController: (args: {
    readonly nowMs: () => number
    readonly timeBudgetMinutes: number
    readonly reserveMinutes: number
    readonly maxTotalCollects: number
    readonly minCollectEstimateSeconds: number
  }) => {
    readonly canRunCollect: () => { readonly ok: boolean; readonly reasonCode?: string }
    readonly recordCollect: (args: { readonly durationMs: number }) => void
  }
}
const { decideProbeAction } = require('../../../../.github/scripts/lib/logix-perf-probe-decision.cjs') as {
  readonly decideProbeAction: (input: Record<string, unknown>) => {
    readonly decision: string
    readonly shouldExtend: boolean
    readonly topSaturated: boolean
  }
}

const readFixture = async (): Promise<Fixture> => {
  const fixturePath = path.resolve(
    process.cwd(),
    '.codex/skills/logix-perf-evidence/fixtures/perf-sweep/probe-replay-cases.json',
  )
  const text = await fs.readFile(fixturePath, 'utf8')
  return JSON.parse(text) as Fixture
}

const runBudgetControllerCase = (item: BudgetControllerCase): void => {
  let now = 0
  const controller = createBudgetController({
    nowMs: () => now,
    timeBudgetMinutes: item.config.timeBudgetMinutes,
    reserveMinutes: item.config.reserveMinutes,
    maxTotalCollects: item.config.maxTotalCollects,
    minCollectEstimateSeconds: item.config.minCollectEstimateSeconds,
  })

  for (const [index, step] of item.timeline.entries()) {
    if (step.action === 'recordCollect') {
      controller.recordCollect({ durationMs: step.durationMs })
      continue
    }

    if (typeof step.atMs === 'number') {
      now = step.atMs
    }

    const out = controller.canRunCollect()
    if (out.ok !== step.expect.ok) {
      throw new Error(
        `[probe-replay:${item.id}] timeline[${index}] ok mismatch, expect=${String(step.expect.ok)} got=${String(out.ok)}`,
      )
    }
    if (step.expect.reasonCode !== undefined) {
      if (out.reasonCode !== step.expect.reasonCode) {
        throw new Error(
          `[probe-replay:${item.id}] timeline[${index}] reasonCode mismatch, expect=${String(step.expect.reasonCode)} got=${String(out.reasonCode)}`,
        )
      }
    }
  }
}

const runDecisionCase = (item: DecisionCase): void => {
  const out = decideProbeAction(item.input)
  if (out.decision !== item.expect.decision) {
    throw new Error(`[probe-replay:${item.id}] decision mismatch, expect=${item.expect.decision} got=${out.decision}`)
  }
  if (out.shouldExtend !== item.expect.shouldExtend) {
    throw new Error(
      `[probe-replay:${item.id}] shouldExtend mismatch, expect=${String(item.expect.shouldExtend)} got=${String(out.shouldExtend)}`,
    )
  }
  if (out.topSaturated !== item.expect.topSaturated) {
    throw new Error(
      `[probe-replay:${item.id}] topSaturated mismatch, expect=${String(item.expect.topSaturated)} got=${String(out.topSaturated)}`,
    )
  }
}

const main = async (): Promise<void> => {
  const fixture = await readFixture()

  for (const item of fixture.budgetControllerCases) {
    runBudgetControllerCase(item)
  }
  for (const item of fixture.decisionCases) {
    runDecisionCase(item)
  }

  // eslint-disable-next-line no-console
  console.log(
    `[logix-perf] probe replay passed (budgetCases=${fixture.budgetControllerCases.length}, decisionCases=${fixture.decisionCases.length})`,
  )
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
