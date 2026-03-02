import { describe, expect, it } from 'vitest'

import {
  extractReasonCodesInContext,
  isCoarseExitCodeLine,
  isRandomStableIdLine,
} from './protocol-antipatterns'
import { isVersionBumped } from './evolution-forward-only'
import { collectEvidenceEligiblePaths as collectPerfEvidencePaths } from './perf-evidence-hard'
import { collectEvidenceEligiblePaths as collectSsotEvidencePaths } from './ssot-alignment'

describe('governance check helpers', () => {
  it('extractReasonCodesInContext only collects reason-code context', () => {
    const noReasonContext = `if (candidate.startsWith('GATE_')) return`
    const reasonContext = `reasonCode: "GATE_PERF_HARD_FAILED", ifReasonCodes: ["VERIFY_RETRYABLE"]`

    expect(extractReasonCodesInContext(noReasonContext)).toEqual([])
    expect(extractReasonCodesInContext(reasonContext).sort()).toEqual(['GATE_PERF_HARD_FAILED', 'VERIFY_RETRYABLE'])
  })

  it('detects random stable id and coarse exit code anti-pattern', () => {
    expect(isRandomStableIdLine('const instanceId = Math.random().toString(36)')).toBe(true)
    expect(isRandomStableIdLine('const instanceId = createStableId(seed)')).toBe(false)

    expect(isCoarseExitCodeLine('const exitCode = verdict === "PASS" ? 0 : 1')).toBe(true)
    expect(isCoarseExitCodeLine('const exitCode = verdictToExitCode(verdict)')).toBe(false)
  })

  it('ssot/perf evidence paths ignore deletions and keep renamed target path', () => {
    const records = [
      { status: 'M', paths: ['docs/ssot/runtime.md'] },
      { status: 'D', paths: ['docs/ssot/old.md'] },
      { status: 'R100', paths: ['specs/103-cli-minimal-kernel-self-loop/notes/a.md', 'specs/103-cli-minimal-kernel-self-loop/notes/b.md'] },
    ] as const

    expect(collectSsotEvidencePaths(records)).toEqual([
      'docs/ssot/runtime.md',
      'specs/103-cli-minimal-kernel-self-loop/notes/b.md',
    ])

    const perfRecords = [
      { status: 'A', paths: ['specs/103-cli-minimal-kernel-self-loop/perf/diff.latest.json'] },
      { status: 'D', paths: ['specs/103-cli-minimal-kernel-self-loop/perf/legacy.json'] },
      { status: 'R90', paths: ['specs/103-cli-minimal-kernel-self-loop/perf/old.json', 'specs/103-cli-minimal-kernel-self-loop/perf/new.json'] },
    ] as const

    expect(collectPerfEvidencePaths(perfRecords)).toEqual([
      'specs/103-cli-minimal-kernel-self-loop/perf/diff.latest.json',
      'specs/103-cli-minimal-kernel-self-loop/perf/new.json',
    ])
  })

  it('isVersionBumped requires numeric increasing version', () => {
    expect(isVersionBumped(1, 2)).toBe(true)
    expect(isVersionBumped(2, 2)).toBe(false)
    expect(isVersionBumped(2, 1)).toBe(false)
    expect(isVersionBumped('2', 3)).toBe(false)
  })
})
