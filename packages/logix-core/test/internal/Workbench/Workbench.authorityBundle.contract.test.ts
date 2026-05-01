import { describe, expect, it } from 'vitest'
import {
  deriveRuntimeWorkbenchProjectionIndex,
  type RuntimeWorkbenchAuthorityBundle,
} from '@logixjs/core/repo-internal/workbench-api'
import { makeWorkbenchReport } from './Workbench.testkit.js'

describe('Runtime Workbench authority bundle contract', () => {
  it('keeps truth inputs, context refs and selection hints partitioned', () => {
    const base: RuntimeWorkbenchAuthorityBundle = {
      truthInputs: [{ kind: 'control-plane-report', report: makeWorkbenchReport(), sourceDigest: 'sha256:source-a' }],
      contextRefs: [{ kind: 'source-snapshot', projectId: 'fixture', digest: 'sha256:source-a' }],
    }

    const first = deriveRuntimeWorkbenchProjectionIndex(base)
    const second = deriveRuntimeWorkbenchProjectionIndex({
      ...base,
      selectionHints: [
        { kind: 'selected-session', sessionId: 'different-session' },
        { kind: 'selected-artifact', artifactOutputKey: 'trial-report' },
      ],
    })

    expect(second.sessions).toEqual(first.sessions)
    expect(second.indexes?.findingsById).toEqual(first.indexes?.findingsById)
  })

  it('lets context refs create context gaps without changing report findings', () => {
    const report = makeWorkbenchReport()
    const first = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [{ kind: 'control-plane-report', report, sourceDigest: 'sha256:source-a' }],
      contextRefs: [{ kind: 'source-snapshot', projectId: 'fixture', digest: 'sha256:source-a' }],
    })
    const second = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [{ kind: 'control-plane-report', report, sourceDigest: 'sha256:source-a' }],
      contextRefs: [{ kind: 'source-snapshot', projectId: 'fixture', digest: 'sha256:source-b' }],
    })

    const reportFindings = Object.values(first.indexes?.findingsById ?? {}).filter((finding) => finding.class === 'control-plane-finding')
    const secondReportFindings = Object.values(second.indexes?.findingsById ?? {}).filter((finding) => finding.class === 'control-plane-finding')
    expect(secondReportFindings).toEqual(reportFindings)
    expect(Object.values(second.indexes?.gapsById ?? {}).some((gap) => gap.code === 'digest-mismatch')).toBe(true)
  })

  it('accepts explicit evidence-gap truth inputs from host adapters', () => {
    const index = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [
        {
          kind: 'evidence-gap',
          gapId: 'playground:missing-action-manifest',
          code: 'playground-missing-action-manifest',
          owner: 'bundle',
          summary: 'Playground fell back to source regex action discovery.',
          severity: 'warning',
          sourceDigest: 'sha256:source-a',
        },
      ],
    })

    const gaps = Object.values(index.indexes?.gapsById ?? {})
    const findings = Object.values(index.indexes?.findingsById ?? {})

    expect(index.sessions.map((session) => session.inputKind)).toEqual(['evidence-gap'])
    expect(gaps.map((gap) => gap.code)).toEqual(['playground-missing-action-manifest'])
    expect(findings.map((finding) => finding.class)).toEqual(['evidence-gap'])
  })
})
