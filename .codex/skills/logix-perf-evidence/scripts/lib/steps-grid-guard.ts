export type StepsGridGuardDecision = {
  readonly matched: boolean
  readonly envLines: ReadonlyArray<string>
}

export const buildStepsGridGuardDecision = (args: {
  readonly matched: boolean
  readonly beforeHash: string
  readonly afterHash: string
  readonly summary: string
}): StepsGridGuardDecision => {
  if (args.matched) {
    return {
      matched: true,
      envLines: [
        'PERF_STEPS_GRID_MATCH=1',
        `PERF_STEPS_GRID_HASH=${args.beforeHash}`,
        `PERF_STEPS_GRID_SUMMARY=${args.summary}`,
      ],
    }
  }
  return {
    matched: false,
    envLines: [
      'PERF_STEPS_GRID_MATCH=0',
      `PERF_STEPS_GRID_HASH_BEFORE=${args.beforeHash}`,
      `PERF_STEPS_GRID_HASH_AFTER=${args.afterHash}`,
      'PERF_DIFF_MODE=triage',
    ],
  }
}

