import { describe, expect, it } from '@effect/vitest'
import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
import type { MinimumProgramActionManifest } from '../../../src/internal/reflection/programManifest.js'

const minimumManifest: MinimumProgramActionManifest = {
  manifestVersion: 'program-action-manifest@167A',
  programId: 'fixture.program',
  moduleId: 'Fixture',
  revision: 1,
  digest: 'manifest:fixture',
  actions: [
    {
      actionTag: 'increment',
      payload: { kind: 'void' },
      authority: 'runtime-reflection',
    },
  ],
}

describe('Reflection cross-tool consumption contract', () => {
  it('classifies owner-approved minimum action manifest as authority', () => {
    const fact = CoreReflection.createMinimumActionManifestAuthority(minimumManifest)

    expect(fact.class).toBe('authority')
    expect(fact.kind).toBe('minimum-program-action-manifest')
    expect(fact.id).toBe('manifest:fixture')
    expect(fact.manifest).toBe(minimumManifest)
    expect(CoreReflection.classifyCrossToolConsumption(fact)).toBe('authority')
  })

  it('keeps fallback-source-regex outside manifest authority', () => {
    const gap = CoreReflection.createFallbackSourceRegexEvidenceGap({
      projectId: 'fixture.project',
      revision: 2,
      message: '167A manifest was unavailable',
    })

    expect(gap.class).toBe('evidenceGap')
    expect(gap.code).toBe('fallback-source-regex')
    expect(gap.owner).toBe('reflection')
    expect(CoreReflection.classifyCrossToolConsumption(gap)).toBe('evidenceGap')
  })

  it('does not classify Driver declarations, Scenario expect or UI layout state as authority', () => {
    const driver = CoreReflection.createProductDeclarationContextRef({
      productKind: 'driver',
      projectId: 'fixture.project',
      declarationId: 'increase',
      label: 'Increase',
    })
    const scenarioExpect = CoreReflection.createProductExpectationDebugEvidence({
      runId: 'counter-demo',
      stepId: 'expect-count',
      status: 'failed',
      message: 'Expected count to equal 2',
    })
    const layout = CoreReflection.createUiLayoutHostViewState({
      owner: 'playground',
      stateId: 'default-desktop',
      summary: 'files/source/inspector/bottom default sizes',
    })

    expect(CoreReflection.classifyCrossToolConsumption(driver)).toBe('contextRef')
    expect(CoreReflection.classifyCrossToolConsumption(scenarioExpect)).toBe('debugEvidence')
    expect(CoreReflection.classifyCrossToolConsumption(layout)).toBe('hostViewState')

    expect(driver.class).not.toBe('authority')
    expect(scenarioExpect.class).not.toBe('authority')
    expect(layout.class).not.toBe('authority')
  })

  it('shares action and operation DTOs across tool consumers without product-owned schemas', () => {
    const actionAuthority = CoreReflection.createMinimumActionManifestAuthority(minimumManifest)
    const operation = CoreReflection.createOperationCompletedEvent({
      operationKind: 'dispatch',
      instanceId: 'fixture:i1',
      txnSeq: 1,
      opSeq: 1,
      actionTag: 'increment',
    })
    const bundle = CoreReflection.createWorkbenchReflectionBridgeBundle({
      manifest: minimumManifest,
      operationEvents: [operation],
      sourceRefs: [{ kind: 'source', path: '/src/logic/counter.logic.ts' }],
    })

    expect(CoreReflection.classifyCrossToolConsumption(actionAuthority)).toBe('authority')
    expect(operation.name).toBe('operation.completed')
    expect(operation.operationKind).toBe('dispatch')
    expect(bundle.truthInputs.map((input) => input.kind)).toEqual(['artifact-ref', 'reflection-node', 'debug-event-batch'])
    expect(JSON.stringify({ actionAuthority, operation, bundle })).not.toMatch(/ProjectSnapshot|ProgramSessionState|logix-playground/)
  })
})
