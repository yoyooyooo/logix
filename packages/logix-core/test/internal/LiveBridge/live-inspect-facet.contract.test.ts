import { describe, expect, it } from '@effect/vitest'

import {
  createLiveActionsProjection,
  createStaticLiveBindingIndex,
  makeLiveInspectArtifact,
  makeLiveTimelineContinuationGap,
  makeLiveInspectGapArtifact,
  makeLiveStateInspectArtifact,
  makeLiveTargetCoordinate,
  makeLiveTargetDetailInspectArtifact,
  type RuntimeReflectionManifest,
} from '../../../src/internal/live-bridge-api.js'

const target = {
  ...makeLiveTargetCoordinate({
    runtimeId: 'runtime-172',
    moduleId: 'InspectFixture',
    instanceId: 'default',
  }),
  attachmentId: 'browser:tab-a',
  adapterKind: 'browser-dev' as const,
}

describe('live inspect facet contract', () => {
  it('normalizes owner-backed target detail into LiveInspectArtifact', () => {
    const artifact = makeLiveTargetDetailInspectArtifact({
      target,
      producer: 'live-inspect-facet.contract',
      availableSections: ['target-detail', 'state', 'actions'],
      hostContext: { hostKind: 'browser', url: 'http://localhost:3000' },
      manifestDigest: 'manifest:abc',
    })

    expect(artifact).toMatchObject({
      kind: 'live.inspect.artifact',
      section: 'target-detail',
      facet: {
        kind: 'live.inspect.facet',
        view: 'target-detail',
        sourceAuthority: 'runtime-live',
        producer: 'live-inspect-facet.contract',
        target: expect.objectContaining({
          runtimeId: 'runtime-172',
          moduleId: 'InspectFixture',
          instanceId: 'default',
          attachmentId: 'browser:tab-a',
        }),
        payload: expect.objectContaining({
          schemaVersion: 'live-inspect.v1',
          target: expect.objectContaining({ runtimeId: 'runtime-172' }),
          manifestDigest: 'manifest:abc',
          availableSections: ['target-detail', 'state', 'actions'],
        }),
        gaps: [],
      },
    })
    expect(JSON.stringify(artifact)).not.toMatch(/RuntimeInspectProjection|Runtime\.inspect|repairHints|verdict/)
  })

  it('projects state paths owner-side and turns missing paths into structured gaps', () => {
    const found = makeLiveStateInspectArtifact({
      target,
      producer: 'live-inspect-facet.contract',
      state: { user: { name: 'Ada' } },
      path: 'user.name',
      budget: { maxEvents: 8, maxInlineBytes: 1024 },
    })
    const missing = makeLiveStateInspectArtifact({
      target,
      producer: 'live-inspect-facet.contract',
      state: { user: { name: 'Ada' } },
      path: 'user.email',
      budget: { maxEvents: 8, maxInlineBytes: 1024 },
    })

    expect(found.section).toBe('state-path')
    expect(found.facet.payload).toMatchObject({
      schemaVersion: 'live-inspect.v1',
      path: 'user.name',
      exists: true,
      valuePreview: 'Ada',
      valueKind: 'primitive',
    })
    expect(missing.facet.payload).toBeUndefined()
    expect(missing.facet.gaps).toEqual([
      expect.objectContaining({
        code: 'missing-state-path',
        owner: 'runtime-live',
      }),
    ])
  })

  it('requires an explicit gap when an inspect facet has no payload', () => {
    expect(() =>
      makeLiveInspectArtifact({
        section: 'events',
        target,
        sourceAuthority: 'runtime-live',
        producer: 'live-inspect-facet.contract',
        budget: { maxEvents: 8, maxInlineBytes: 1024 },
      }),
    ).toThrow(/gap/i)
  })

  it('projects actions from a matched owner binding', () => {
    const manifest: RuntimeReflectionManifest = {
      manifestVersion: 'runtime-reflection-manifest@167B',
      programId: 'inspect-actions.program',
      rootModuleId: 'InspectFixture',
      rootModule: {} as never,
      modules: [],
      actions: [
        {
          actionTag: 'increment',
          payload: { kind: 'void' as const, validatorAvailable: false },
          authority: 'runtime-reflection' as const,
        },
        {
          actionTag: 'setCount',
          payload: {
            kind: 'nonVoid' as const,
            summary: 'number',
            schemaDigest: 'schema:setCount',
            validatorAvailable: true,
          },
          authority: 'runtime-reflection' as const,
        },
      ],
      logicUnits: [],
      effects: [],
      processes: [],
      imports: [],
      services: [],
      capabilities: { run: 'available' as const, check: 'available' as const, trial: 'available' as const },
      sourceRefs: [],
      budget: { truncated: false, originalActionCount: 2 },
      digest: 'runtime-manifest:inspect-actions',
    }
    const actionIndex = createStaticLiveBindingIndex(manifest)

    const artifact = createLiveActionsProjection({
      target,
      producer: 'live-inspect-facet.contract',
      manifest,
      actionIndex,
    })

    expect(artifact.facet.payload).toMatchObject({
      binding: {
        manifestDigest: manifest.digest,
        bindingStatus: 'matched',
        sourceAuthority: 'reflection',
      },
      actions: [
        { actionTag: 'increment', payloadKind: 'void', bindingStatus: 'matched' },
        {
          actionTag: 'setCount',
          payloadKind: 'nonVoid',
          payloadSummary: 'number',
          schemaDigest: 'schema:setCount',
          validatorAvailable: true,
          bindingStatus: 'matched',
        },
      ],
    })
    expect(actionIndex.getDiagnostics()).toMatchObject({ actionLookupCount: 0, linearScanCount: 0 })
  })

  it('keeps missing live manifest binding as a reflection-owned structured gap', () => {
    const artifact = makeLiveInspectGapArtifact({
      section: 'actions',
      target,
      sourceAuthority: 'reflection',
      producer: 'live-inspect-facet.contract',
      gapCode: 'missing-live-manifest-binding',
      summary: 'No reflection manifest is bound to this live target.',
      owner: 'reflection',
      reopenBar: 'reopen when live target lifecycle binding can provide RuntimeReflectionManifest',
    })

    expect(artifact.facet.gaps).toEqual([
      expect.objectContaining({
        code: 'missing-live-manifest-binding',
        owner: 'reflection',
        target: expect.objectContaining({
          runtimeId: target.runtimeId,
          moduleId: target.moduleId,
          instanceId: target.instanceId,
        }),
        reopenBar: 'reopen when live target lifecycle binding can provide RuntimeReflectionManifest',
      }),
    ])
    expect(artifact.facet.payload).toBeUndefined()
  })

  it('creates stable owner-coded gaps for timeline continuation failures', () => {
    const codes = [
      'timeline-cursor-mismatch',
      'timeline-cursor-expired',
      'timeline-retention-gap',
      'timeline-watermark-incomparable',
      'timeline-retained-segment-missing',
    ] as const

    const gaps = codes.map((code) =>
      makeLiveTimelineContinuationGap({
        code,
        target,
      }),
    )

    expect(gaps.map((gap) => gap.code)).toEqual(codes)
    expect(gaps).toEqual([
      expect.objectContaining({ owner: 'runtime-live', severity: 'warning' }),
      expect.objectContaining({ owner: 'runtime-live', severity: 'warning' }),
      expect.objectContaining({ owner: 'runtime-live', severity: 'warning' }),
      expect.objectContaining({ owner: 'runtime-live', severity: 'warning' }),
      expect.objectContaining({ owner: 'evidence', severity: 'warning' }),
    ])
    expect(gaps.map((gap) => gap.reopenBar)).toEqual([
      'reopen only if timeline cursor query identity law changes',
      'reopen only if timeline cursor retention law changes',
      'reopen only if runtime-live ledger retention law changes',
      'reopen only if runtime-live watermark comparison law changes',
      'reopen only if daemon retained owner segment lifecycle law changes',
    ])
  })
})
