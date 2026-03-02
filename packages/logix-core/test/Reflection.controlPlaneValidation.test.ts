import { describe, expect, it } from '@effect/vitest'

import * as Logix from '../src/index.js'

describe('Reflection.controlPlaneValidation', () => {
  it('provides digest seed classification and known-file validation', () => {
    const manifest = {
      schemaVersion: 1,
      kind: 'ControlSurfaceManifest',
      version: 1,
      digest: 'sha256:manifest',
      modules: [],
    }

    const manifestDigest = Logix.Reflection.computeIrArtifactDigestSeed('control-surface.manifest.json', manifest)
    expect(manifestDigest.digestKind).toBe('semantic')
    expect(manifestDigest.digestSeed).toBe('sha256:manifest')

    const nonGatingDigest = Logix.Reflection.computeIrArtifactDigestSeed('trace.slim.json', {
      kind: 'TraceSlim',
      events: [],
    })
    expect(nonGatingDigest.digestKind).toBe('nonGating')
    expect(nonGatingDigest.digestSeed).toBeUndefined()

    const evidenceErrors = Logix.Reflection.validateIrArtifactFile('evidence.json', { kind: 'TrialRunEvidence' })
    expect(evidenceErrors).toContain('EVIDENCE_MISSING_LINKS')
  })

  it('validates workflow linkage and cross-module profile constraints', () => {
    const manifest = {
      schemaVersion: 1,
      kind: 'ControlSurfaceManifest',
      version: 1,
      digest: 'sha256:manifest',
      modules: [
        { moduleId: 'module-A', workflowSurface: { digest: 'sha256:a' } },
        { moduleId: 'module-B', workflowSurface: { digest: 'sha256:b' } },
      ],
    }

    const missingWorkflow = Logix.Reflection.validateWorkflowSurfaceManifestLinks({
      manifest,
      workflowSurface: undefined,
    })
    expect(missingWorkflow).toEqual(['MISSING_WORKFLOW_SURFACE_FILE'])

    const mismatchWorkflow = Logix.Reflection.validateWorkflowSurfaceManifestLinks({
      manifest,
      workflowSurface: [
        { moduleId: 'module-A', surface: { digest: 'sha256:a' } },
        { moduleId: 'module-B', surface: { digest: 'sha256:wrong' } },
      ],
    })
    expect(mismatchWorkflow).toContain('WORKFLOW_SURFACE_DIGEST_MISMATCH:module-B')

    const crossModuleViolation = Logix.Reflection.validateCrossModuleProfileSurface({
      manifest: {
        ...manifest,
        modules: [{ moduleId: 'single', workflowSurface: { digest: 'sha256:single' } }],
      },
      workflowSurface: [{ moduleId: 'single', surface: { digest: 'sha256:single' } }],
    })
    expect(crossModuleViolation).toContain('CROSS_MODULE_MODULE_COUNT_LT_2')
    expect(crossModuleViolation).toContain('CROSS_MODULE_WORKFLOW_SURFACE_LT_2')
  })

  it('classifies trialrun summary reason, verdict, and failure reason list', () => {
    const passReason = Logix.Reflection.pickTrialRunSummaryReasonCode({ ok: true })
    expect(passReason).toBe('VERIFY_PASS')
    expect(Logix.Reflection.pickTrialRunSummaryVerdict(passReason)).toBe('pass')
    expect(Logix.Reflection.collectTrialRunFailureReasonCodes({ ok: true })).toEqual([])

    const input: Logix.Reflection.TrialRunSummaryInput = {
      ok: false,
      environment: {
        missingServices: ['A.Service'],
        missingConfigKeys: ['API_KEY'],
      },
      error: {
        code: 'TrialRunTimeout',
      },
    }

    const reasonCode = Logix.Reflection.pickTrialRunSummaryReasonCode(input)
    expect(reasonCode).toBe('TRIALRUN_MISSING_SERVICES')
    expect(Logix.Reflection.pickTrialRunSummaryVerdict(reasonCode)).toBe('violation')

    const failureReasonCodes = Logix.Reflection.collectTrialRunFailureReasonCodes(input)
    expect(failureReasonCodes).toContain('TRIALRUN_MISSING_SERVICES')
    expect(failureReasonCodes).toContain('TRIALRUN_MISSING_CONFIG_KEYS')
    expect(failureReasonCodes).toContain('TRIALRUN_TIMEOUT')
  })

  it('projects deterministic entry control-surface with valid linkage', () => {
    const entry = {
      modulePath: 'examples/logix/src/runtime/root.impl.ts',
      exportName: 'RootImpl',
    } as const

    const first = Logix.Reflection.projectControlSurfaceFromEntryRef(entry)
    const second = Logix.Reflection.projectControlSurfaceFromEntryRef(entry)

    expect(first).toEqual(second)
    expect(first.manifest.kind).toBe('ControlSurfaceManifest')
    expect(first.manifest.modules).toHaveLength(1)
    expect(first.workflowSurfaces).toHaveLength(1)
    expect(first.workflowSurfaces[0]?.surface.source).toBe('examples/logix/src/runtime/root.impl.ts#RootImpl')
    expect(first.workflowSurfaces[0]?.surface.digest).toBe(first.manifest.modules[0]?.workflowSurface.digest)

    const linkageReasons = Logix.Reflection.validateWorkflowSurfaceManifestLinks({
      manifest: first.manifest,
      workflowSurface: first.workflowSurfaces,
    })
    expect(linkageReasons).toEqual([])
  })
})
