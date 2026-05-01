import { describe, expect, it } from '@effect/vitest'
import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
import { deriveRuntimeWorkbenchProjectionIndex } from '@logixjs/core/repo-internal/workbench-api'

const minimumManifest: CoreReflection.MinimumProgramActionManifest = {
  manifestVersion: 'program-action-manifest@167A',
  programId: 'fixture.program',
  moduleId: 'Fixture',
  digest: 'manifest:fixture',
  actions: [
    {
      actionTag: 'increment',
      payload: { kind: 'void' },
      authority: 'runtime-reflection',
    },
  ],
}

describe('Reflection workbench bridge', () => {
  it('projects reflected actions, payload metadata and dependency nodes as workbench drilldown inputs', () => {
    const manifest: CoreReflection.RuntimeReflectionManifest = {
      manifestVersion: 'runtime-reflection-manifest@167B',
      programId: 'fixture.program',
      rootModuleId: 'Fixture',
      rootModule: {
        manifestVersion: 'module-manifest@1',
        moduleId: 'Fixture',
        actionKeys: ['increment', 'setCount'],
        actions: [],
        digest: 'manifest:module',
      },
      modules: [],
      actions: [
        {
          actionTag: 'increment',
          payload: { kind: 'void', validatorAvailable: false },
          authority: 'runtime-reflection',
          source: { file: '/src/logic/counter.logic.ts', line: 12, column: 3 },
        },
        {
          actionTag: 'setCount',
          payload: {
            kind: 'nonVoid',
            summary: 'Schema.Number',
            schemaDigest: 'schema:number',
            validatorAvailable: true,
          },
          authority: 'runtime-reflection',
        },
      ],
      logicUnits: [],
      effects: [],
      processes: [],
      imports: [{ moduleId: 'ChildProgram', digest: 'manifest:child' }],
      services: [{ serviceKey: 'ClockService' }],
      capabilities: { run: 'available', check: 'available', trial: 'available' },
      sourceRefs: [{ kind: 'source', path: '/src/logic/counter.logic.ts', digest: 'source:d1' }],
      budget: { truncated: false, originalActionCount: 2 },
      digest: 'runtime-manifest:fixture',
    }

    const bundle = CoreReflection.createWorkbenchReflectionBridgeBundle({
      manifest,
      sourceRefs: manifest.sourceRefs,
    })

    expect(bundle.truthInputs).toContainEqual(expect.objectContaining({
      kind: 'reflection-node',
      nodeKind: 'action',
      nodeId: 'action:increment',
      actionTag: 'increment',
      focusRef: { declSliceId: 'action:increment' },
      sourceRef: '/src/logic/counter.logic.ts:12:3',
    }))
    expect(bundle.truthInputs).toContainEqual(expect.objectContaining({
      kind: 'reflection-node',
      nodeKind: 'payload',
      nodeId: 'payload:setCount',
      payload: expect.objectContaining({
        kind: 'nonVoid',
        summary: 'Schema.Number',
        schemaDigest: 'schema:number',
        validatorAvailable: true,
      }),
    }))
    expect(bundle.truthInputs).toContainEqual(expect.objectContaining({
      kind: 'reflection-node',
      nodeKind: 'dependency',
      nodeId: 'dependency:Program.capabilities.imports:ChildProgram',
      dependency: expect.objectContaining({
        kind: 'program-import',
        ownerCoordinate: 'Program.capabilities.imports:ChildProgram',
        providerSource: 'program-capabilities',
        childIdentity: 'ChildProgram',
      }),
    }))
    expect(bundle.truthInputs).toContainEqual(expect.objectContaining({
      kind: 'reflection-node',
      nodeKind: 'dependency',
      nodeId: 'dependency:service:ClockService',
      dependency: expect.objectContaining({
        kind: 'service',
        ownerCoordinate: 'service:ClockService',
        providerSource: 'declaration',
      }),
    }))

    const projection = deriveRuntimeWorkbenchProjectionIndex(bundle)
    const previews = Object.values(projection.indexes?.artifactsById ?? {}).map((artifact) => artifact.preview)

    expect(previews).toContainEqual(expect.objectContaining({
      nodeKind: 'action',
      actionTag: 'increment',
      manifestDigest: 'runtime-manifest:fixture',
    }))
    expect(previews).toContainEqual(expect.objectContaining({
      nodeKind: 'payload',
      payload: expect.objectContaining({ validatorAvailable: true }),
    }))
    expect(previews).toContainEqual(expect.objectContaining({
      nodeKind: 'dependency',
      dependency: expect.objectContaining({ ownerCoordinate: 'service:ClockService' }),
    }))
  })

  it('classifies manifest, source refs and operation events for 165 workbench input', () => {
    const event = CoreReflection.createOperationCompletedEvent({
      operationKind: 'dispatch',
      instanceId: 'fixture:i1',
      txnSeq: 1,
      opSeq: 2,
      actionTag: 'increment',
    })

    const bundle = CoreReflection.createWorkbenchReflectionBridgeBundle({
      manifest: minimumManifest,
      sourceRefs: [{ kind: 'source', path: '/src/logic/counter.logic.ts', digest: 'source:d1' }],
      operationEvents: [event],
    })

    expect(bundle.truthInputs).toContainEqual({
      kind: 'artifact-ref',
      artifact: {
        outputKey: 'reflectionManifest',
        kind: 'RuntimeReflectionManifest',
        digest: 'manifest:fixture',
      },
    })
    expect(bundle.truthInputs).toContainEqual({
      kind: 'reflection-node',
      nodeKind: 'action',
      nodeId: 'action:increment',
      summary: 'Reflected action increment',
      manifestDigest: 'manifest:fixture',
      actionTag: 'increment',
      payload: { kind: 'void' },
      focusRef: { declSliceId: 'action:increment' },
    })
    expect(bundle.truthInputs).toContainEqual({
      kind: 'debug-event-batch',
      batchId: 'runtime-operation-events:fixture.program',
      events: [
        {
          eventId: event.eventId,
          instanceId: 'fixture:i1',
          txnSeq: 1,
          opSeq: 2,
          label: 'operation.completed',
          type: 'operation.completed',
        },
      ],
    })
    expect(bundle.contextRefs).toEqual([
      {
        kind: 'source-locator',
        locator: '/src/logic/counter.logic.ts',
        provenance: 'source-snapshot',
        digest: 'source:d1',
      },
    ])
  })

  it('emits evidence gaps for missing manifest, missing source coordinate and unknown schema', () => {
    const bundle = CoreReflection.createWorkbenchReflectionBridgeBundle({
      manifest: undefined,
      sourceRefs: [],
      evidenceGaps: [
        CoreReflection.createRuntimeOperationEvidenceGap({
          instanceId: 'fixture:i1',
          txnSeq: 1,
          opSeq: 2,
          code: 'unknown-payload-schema',
          message: 'Payload schema is unavailable for validation.',
        }),
      ],
    })

    expect(bundle.truthInputs).toEqual([
      {
        kind: 'evidence-gap',
        gapId: 'reflection:missing-manifest',
        code: 'missing-manifest',
        owner: 'artifact',
        summary: 'Runtime reflection manifest is unavailable.',
        severity: 'warning',
      },
      {
        kind: 'evidence-gap',
        gapId: 'reflection:missing-source-coordinate',
        code: 'missing-source-coordinate',
        owner: 'source',
        summary: 'Source coordinate is unavailable for reflection bridge.',
        severity: 'warning',
      },
      {
        kind: 'evidence-gap',
        gapId: 'reflection:unknown-payload-schema',
        code: 'unknown-payload-schema',
        owner: 'session',
        summary: 'Payload schema is unavailable for validation.',
        severity: 'warning',
      },
    ])
  })

  it('projects stale manifest digest and fallback source regex as evidence gaps', () => {
    const fallbackGap = CoreReflection.createFallbackSourceRegexEvidenceGap({
      projectId: 'fixture.project',
      revision: 2,
      message: 'Runtime reflection manifest was unavailable.',
    })
    const bundle = CoreReflection.createWorkbenchReflectionBridgeBundle({
      manifest: minimumManifest,
      expectedManifestDigest: 'manifest:previous',
      sourceRefs: [{ kind: 'source', path: '/src/logic/counter.logic.ts', digest: 'source:d1' }],
      evidenceGaps: [fallbackGap],
    })

    expect(bundle.truthInputs).toContainEqual({
      kind: 'evidence-gap',
      gapId: 'reflection:stale-manifest-digest',
      code: 'stale-manifest-digest',
      owner: 'artifact',
      summary: 'Runtime reflection manifest digest is stale.',
      severity: 'warning',
    })
    expect(bundle.truthInputs).toContainEqual({
      kind: 'evidence-gap',
      gapId: 'reflection:fallback-source-regex',
      code: 'fallback-source-regex',
      owner: 'source',
      summary: 'Runtime reflection manifest was unavailable.',
      severity: 'warning',
    })
  })
})
