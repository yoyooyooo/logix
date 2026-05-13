import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
import { describe, expect, it } from 'vitest'
import { Schema } from 'effect'
import {
  type VerificationControlPlaneReport,
  isVerificationControlPlaneReport,
  makeVerificationControlPlaneReport,
} from '../../src/ControlPlane.js'
import * as Logix from '../../src/index.js'

const leakedReceiptKeys = [
  'sourceReceiptRef',
  'keyHashRef',
  'bundlePatchPath',
  'bundlePatchRef',
  'ownerRef',
  'transition',
  'retention',
  'formEvidenceContract',
  'sources',
  'rows',
  'payload',
  'materializations',
  'issues',
  'source',
] as const

describe('Verification control-plane contract', () => {
  it('should expose the shared report builder and guard from core', () => {
    const report = makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'check',
      mode: 'static',
      verdict: 'PASS',
      errorCode: null,
      summary: 'runtime.check passed',
      environment: { host: 'node', runId: 'run-1' },
      artifacts: [],
      repairHints: [],
      nextRecommendedStage: 'trial',
    })

    const aliasCheck: VerificationControlPlaneReport = report
    expect(aliasCheck.schemaVersion).toBe(1)
    expect(report.kind).toBe('VerificationControlPlaneReport')
    expect(isVerificationControlPlaneReport(report)).toBe(true)
    expect(isVerificationControlPlaneReport({ ...report, repairHints: ['legacy-string'] })).toBe(false)
  })

  it('should accept coordinate-first repair hints and reject stage-specific report kinds', () => {
    const report = makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'trial',
      mode: 'startup',
      verdict: 'INCONCLUSIVE',
      errorCode: 'CLI_NOT_IMPLEMENTED',
      summary: 'runtime.trial not implemented',
      environment: { host: 'node', runId: 'run-2' },
      artifacts: [],
      repairHints: [
        {
          code: 'CLI_NOT_IMPLEMENTED',
          canAutoRetry: false,
          upgradeToStage: 'trial',
          focusRef: null,
        },
      ],
      nextRecommendedStage: 'trial',
    })

    expect(isVerificationControlPlaneReport(report)).toBe(true)
    expect(isVerificationControlPlaneReport({ ...report, kind: 'RuntimeTrialReport' })).toBe(false)
  })

  it('should link report focusRef to artifact refs without creating a domain payload object', () => {
    const report = makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'trial',
      mode: 'scenario',
      verdict: 'FAIL',
      errorCode: 'FORM_SUBMIT_BLOCKED',
      summary: 'form submit blocked by canonical reason slot',
      environment: { host: 'node', runId: 'run-3' },
      artifacts: [
        {
          outputKey: 'form-evidence-contract',
          kind: 'form-evidence-contract',
          digest: 'sha256:form-evidence',
          reasonCodes: ['FORM_SUBMIT_BLOCKED'],
        },
      ],
      repairHints: [
        {
          code: 'FORM_SUBMIT_BLOCKED',
          canAutoRetry: false,
          upgradeToStage: null,
          focusRef: {
            scenarioStepId: 'submit-step:1',
            reasonSlotId: 'submit:1',
            sourceRef: '$form.submitAttempt',
          },
          relatedArtifactOutputKeys: ['form-evidence-contract'],
        },
      ],
      nextRecommendedStage: null,
    })

    expect(isVerificationControlPlaneReport(report)).toBe(true)
    expect(report.repairHints[0]?.focusRef).toEqual({
      scenarioStepId: 'submit-step:1',
      reasonSlotId: 'submit:1',
      sourceRef: '$form.submitAttempt',
    })
    expect(report.repairHints[0]?.relatedArtifactOutputKeys).toEqual(['form-evidence-contract'])
    expect(report.artifacts[0]).toEqual({
      outputKey: 'form-evidence-contract',
      kind: 'form-evidence-contract',
      digest: 'sha256:form-evidence',
      reasonCodes: ['FORM_SUBMIT_BLOCKED'],
    })
    expect('reason' in report.repairHints[0]!).toBe(false)
    for (const key of leakedReceiptKeys) {
      expect(key in report).toBe(false)
      expect(key in report.artifacts[0]!).toBe(false)
      expect(key in report.repairHints[0]!).toBe(false)
      expect(key in report.repairHints[0]!.focusRef!).toBe(false)
    }
  })

  it('should reject report shell leaks and broken artifact links', () => {
    const report = makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'trial',
      mode: 'scenario',
      verdict: 'FAIL',
      errorCode: 'FORM_SUBMIT_BLOCKED',
      summary: 'form submit blocked by canonical reason slot',
      environment: { host: 'node', runId: 'run-4' },
      artifacts: [
        {
          outputKey: 'form-evidence-contract',
          kind: 'form-evidence-contract',
          digest: 'sha256:form-evidence',
        },
      ],
      repairHints: [
        {
          code: 'FORM_SUBMIT_BLOCKED',
          canAutoRetry: false,
          upgradeToStage: null,
          focusRef: {
            reasonSlotId: 'submit:1',
            sourceRef: '$form.submitAttempt',
          },
          relatedArtifactOutputKeys: ['form-evidence-contract'],
        },
      ],
      nextRecommendedStage: null,
    })

    expect(isVerificationControlPlaneReport(report)).toBe(true)
    expect(
      isVerificationControlPlaneReport({
        ...report,
        sourceReceiptRef: 'source:items.warehouseId',
      }),
    ).toBe(false)
    expect(
      isVerificationControlPlaneReport({
        ...report,
        artifacts: [{ ...report.artifacts[0], bundlePatchRef: 'bundlePatch:items.warehouseId' }],
      }),
    ).toBe(false)
    expect(
      isVerificationControlPlaneReport({
        ...report,
        repairHints: [
          {
            ...report.repairHints[0],
            focusRef: {
              ...report.repairHints[0]!.focusRef,
              witnessStepId: 'legacy-witness-step:1',
            },
          },
        ],
      }),
    ).toBe(false)
    expect(
      isVerificationControlPlaneReport({
        ...report,
        repairHints: [
          {
            ...report.repairHints[0],
            focusRef: {
              ...report.repairHints[0]!.focusRef,
              sourceReceiptRef: 'source:items.warehouseId',
            },
          },
        ],
      }),
    ).toBe(false)
    expect(
      isVerificationControlPlaneReport({
        ...report,
        repairHints: [
          {
            ...report.repairHints[0],
            relatedArtifactOutputKeys: ['missing-artifact'],
          },
        ],
      }),
    ).toBe(false)
    expect(
      isVerificationControlPlaneReport({
        ...report,
        artifacts: [{ ...report.artifacts[0], outputKey: 'form-evidence-contract' }, { ...report.artifacts[0] }],
      }),
    ).toBe(false)
  })

  it('should expose Runtime.trial as the canonical runtime trial facade', () => {
    const Root = Logix.Module.make('VerificationControlPlaneContract.RuntimeTrial', {
      state: Schema.Void,
      actions: {},
    })

    const program = Logix.Program.make(Root, {
      initial: undefined,
      logics: [],
    })

    expect(typeof Logix.Runtime.trial).toBe('function')
    expect(() =>
      Logix.Runtime.trial(program, {
        runId: 'run:test:runtime-trial-contract',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      }),
    ).not.toThrow()
  })

  it('should keep runtime verification public routes frozen', () => {
    expect(typeof Logix.Runtime.check).toBe('function')
    expect(typeof Logix.Runtime.trial).toBe('function')
    expect('compare' in (Logix.Runtime as any)).toBe(false)
    expect('ScenarioCarrier' in (Logix.Runtime as any)).toBe(false)
  })

  it('should keep Reflection.verify* as expert-only companions without reviving Observability trial helpers', () => {
    expect(typeof CoreReflection.verifyKernelContract).toBe('function')
    expect(typeof CoreReflection.verifyFullCutoverGate).toBe('function')
    expect('Observability' in (Logix as any)).toBe(false)
    expect('Reflection' in (Logix as any)).toBe(false)
  })

  it('should keep Runtime.trial as the only canonical trial route while proof-kernel stays internal', () => {
    expect(typeof Logix.Runtime.trial).toBe('function')
    expect(typeof (Logix as any).VerificationProofKernel).toBe('undefined')
  })

  it('should keep current-stage PASS and repeatability fields explicit', () => {
    const a = makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'check',
      mode: 'static',
      verdict: 'PASS',
      errorCode: null,
      summary: 'runtime.check passed',
      environment: {
        host: 'static',
        runId: 'run-a',
        file: '/tmp/a/report.json',
        outDir: '/tmp/a',
        declarationDigest: 'decl:same',
      },
      artifacts: [
        {
          outputKey: 'module-manifest',
          kind: 'ModuleManifest',
          file: '/tmp/a/module-manifest.json',
          digest: 'decl:same',
        },
      ],
      repairHints: [],
      findings: [
        {
          kind: 'pass-boundary',
          code: 'CHECK_STAGE_PASS_ONLY',
          ownerCoordinate: 'runtime.check',
          summary: 'PASS covers only the check stage.',
        },
      ],
      nextRecommendedStage: 'trial',
    })

    const b = makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'check',
      mode: 'static',
      verdict: 'PASS',
      errorCode: null,
      summary: 'runtime.check passed',
      environment: {
        host: 'static',
        runId: 'run-b',
        file: '/tmp/b/report.json',
        outDir: '/tmp/b',
        declarationDigest: 'decl:same',
      },
      artifacts: [
        {
          outputKey: 'module-manifest',
          kind: 'ModuleManifest',
          file: '/tmp/b/module-manifest.json',
          digest: 'decl:same',
        },
      ],
      repairHints: [],
      findings: [
        {
          kind: 'pass-boundary',
          code: 'CHECK_STAGE_PASS_ONLY',
          ownerCoordinate: 'runtime.check',
          summary: 'PASS covers only the check stage.',
        },
      ],
      nextRecommendedStage: 'trial',
    })

    expect(isVerificationControlPlaneReport(a)).toBe(true)
    expect(a.findings?.[0]?.code).toBe('CHECK_STAGE_PASS_ONLY')
    expect(a.nextRecommendedStage).toBe('trial')
    expect(a.repeatability?.stableFields).toEqual([
      'verdict',
      'errorCode',
      'artifactKeys',
      'artifactDigests',
      'nextRecommendedStage',
    ])
    expect(b.repeatability?.reportDigest).toBe(a.repeatability?.reportDigest)
    expect(b.repeatability?.normalizedInputDigest).toBe(a.repeatability?.normalizedInputDigest)
  })
})
