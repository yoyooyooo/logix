export const LOGIX_PERF_REPORT_PREFIX = 'LOGIX_PERF_REPORT:'

export type PerfReport = {
  readonly schemaVersion: number
  readonly meta: {
    readonly createdAt: string
    readonly generator: string
    readonly matrixId: string
    readonly config: {
      readonly runs: number
      readonly warmupDiscard: number
      readonly timeoutMs: number
      readonly headless?: boolean
      readonly profile?: string
      readonly humanSummary?: boolean
      readonly stability?: {
        readonly maxP95DeltaRatio: number
        readonly maxP95DeltaMs: number
      }
      readonly controlPlane?: {
        readonly traitConvergeBudgetMs?: number
        readonly traitConvergeDecisionBudgetMs?: number
        readonly tuningId?: string
      }
    }
    readonly env: {
      readonly os: string
      readonly arch: string
      readonly node: string
      readonly browser: {
        readonly name: string
        readonly version?: string
        readonly headless?: boolean
      }
    }
  }
  readonly suites: ReadonlyArray<unknown>
}

export const emitPerfReport = (report: PerfReport): void => {
  // eslint-disable-next-line no-console
  console.log(`${LOGIX_PERF_REPORT_PREFIX}${JSON.stringify(report)}`)
}
