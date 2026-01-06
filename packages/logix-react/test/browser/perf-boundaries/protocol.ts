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

const inferBrowserVersion = (): string | undefined => {
  if (typeof navigator === 'undefined') return undefined
  const ua = navigator.userAgent
  if (typeof ua !== 'string' || ua.length === 0) return undefined

  const chrome = ua.match(/(?:HeadlessChrome|Chrome)\/(\d+(?:\.\d+)+)/)
  if (chrome?.[1]) return chrome[1]

  const firefox = ua.match(/\bFirefox\/(\d+(?:\.\d+)+)\b/)
  if (firefox?.[1]) return firefox[1]

  const safari = ua.match(/\bVersion\/(\d+(?:\.\d+)+)\b/)
  if (safari?.[1]) return safari[1]

  return undefined
}

const normalizePerfReport = (report: PerfReport): PerfReport => {
  const browser = report.meta.env.browser
  if (browser.version) return report

  const inferred = inferBrowserVersion()
  if (!inferred) return report

  return {
    ...report,
    meta: {
      ...report.meta,
      env: {
        ...report.meta.env,
        browser: {
          ...browser,
          version: inferred,
        },
      },
    },
  }
}

export const emitPerfReport = (report: PerfReport): void => {
  const normalized = normalizePerfReport(report)
  // eslint-disable-next-line no-console
  console.log(`${LOGIX_PERF_REPORT_PREFIX}${JSON.stringify(normalized)}`)
}
