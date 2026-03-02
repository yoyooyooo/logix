import { describe, expect, it } from 'vitest'

import { isVersionBumped } from './evolution-forward-only'
import { extractReasonCodesInContext, isCoarseExitCodeLine } from './protocol-antipatterns'
import { collectEvidenceEligiblePaths as collectPerfEvidenceEligiblePaths, evaluatePerfEvidenceGate } from './perf-evidence-hard'
import { collectEvidenceEligiblePaths as collectSsotEvidenceEligiblePaths, evaluateSsotDrift } from './ssot-alignment'

describe('governance check negative cases', () => {
  it('ssot drift stays failing when only docs deletion exists', () => {
    const changedPaths = [
      'packages/logix-cli/src/internal/commands/describe.ts',
      'docs/ssot/platform/00-principles.md',
    ]
    const records = [
      { status: 'M', paths: ['packages/logix-cli/src/internal/commands/describe.ts'] },
      { status: 'D', paths: ['docs/ssot/platform/00-principles.md'] },
    ] as const
    const evidenceEligiblePaths = collectSsotEvidenceEligiblePaths(records)

    const evaluated = evaluateSsotDrift({
      changedPaths,
      evidenceEligiblePaths,
    })

    expect(evaluated.hasTriggerChanges).toBe(true)
    expect(evaluated.hasEvidence).toBe(false)
  })

  it('perf hard gate fails when trigger exists but evidence missing', () => {
    const evaluated = evaluatePerfEvidenceGate({
      changedPaths: ['packages/logix-cli/src/internal/commands/describe.ts'],
      evidenceEligiblePaths: [],
      untrackedPaths: [],
      diffPath: 'specs/103-cli-minimal-kernel-self-loop/perf/diff.latest.json',
    })

    expect(evaluated.precheckFailureReasonCode).toBe('CLI_PERF_EVIDENCE_MISSING')
  })

  it('perf hard gate fails when diff file itself is not updated', () => {
    const records = [
      { status: 'A', paths: ['specs/103-cli-minimal-kernel-self-loop/perf/before.local.quick.json'] },
      { status: 'A', paths: ['specs/103-cli-minimal-kernel-self-loop/perf/after.local.quick.json'] },
    ] as const
    const evaluated = evaluatePerfEvidenceGate({
      changedPaths: ['packages/logix-cli/src/internal/commands/describe.ts'],
      evidenceEligiblePaths: collectPerfEvidenceEligiblePaths(records),
      untrackedPaths: [],
      diffPath: 'specs/103-cli-minimal-kernel-self-loop/perf/diff.latest.json',
    })

    expect(evaluated.precheckFailureReasonCode).toBe('CLI_PERF_DIFF_NOT_UPDATED')
  })

  it('rejects non-increasing version and coarse exit-code mapping', () => {
    expect(isVersionBumped(2, 2)).toBe(false)
    expect(isVersionBumped(2, 1)).toBe(false)
    expect(isVersionBumped(2, 3)).toBe(true)

    expect(isCoarseExitCodeLine('const exitCode = verdict === "PASS" ? 0 : 1')).toBe(true)
    expect(isCoarseExitCodeLine('const exitCode = mapVerdictToExitCode(verdict)')).toBe(false)
  })

  it('reason extraction ignores non-reason context uppercase literals', () => {
    const line = `if (candidate.startsWith('GATE_')) return { reasonCode: 'GATE_PERF_HARD_FAILED' }`
    expect(extractReasonCodesInContext(line)).toEqual(['GATE_PERF_HARD_FAILED'])
  })
})
