import { describe, expect, it } from '@effect/vitest'
import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
import { Schema } from 'effect'

import * as Logix from '../../../src/index.js'
import {
  createStaticLiveBindingIndex,
  checkStaticLiveBinding,
  makeLiveTargetCoordinate,
  runLiveOperation,
  type LiveOperationRequest,
} from '../../../src/internal/live-bridge-api.js'

const target = makeLiveTargetCoordinate({
  runtimeId: 'runtime-1',
  moduleId: 'LiveStaticBinding.Counter',
  instanceId: 'instance-1',
})

const request = (overrides: Partial<LiveOperationRequest> = {}): LiveOperationRequest => ({
  actorId: 'agent',
  operationKind: 'dispatch.declaredAction',
  target,
  permissionScope: 'debug:dispatch',
  budget: { maxEvents: 8, maxInlineBytes: 1024 },
  redactionPolicyRef: 'default',
  ...overrides,
})

const makeManifest = () => {
  const Counter = Logix.Module.make('LiveStaticBinding.Counter', {
    state: Schema.Struct({ count: Schema.Number }),
    actions: {
      increment: Schema.Void,
      setCount: Schema.Number,
    } as const,
    reducers: {},
  })

  return CoreReflection.extractRuntimeReflectionManifest(
    Logix.Program.make(Counter, { initial: { count: 0 }, logics: [] }),
    { programId: 'live-static-binding.program' },
  )
}

describe('live static binding against runtime reflection manifest', () => {
  it('projects matched 167 reflection facts into a live binding header', () => {
    const manifest = makeManifest()
    const setCount = manifest.actions.find((action) => action.actionTag === 'setCount')
    expect(setCount?.payload.schemaDigest).toMatch(/^schema:/)

    const result = checkStaticLiveBinding({
      manifest,
      request: {
        manifestDigest: manifest.digest,
        actionTag: 'setCount',
        payloadSchemaRef: setCount?.payload.schemaDigest,
        validatorAvailable: true,
      },
    })

    expect(result).toEqual({
      ok: true,
      binding: {
        manifestDigest: manifest.digest,
        actionTag: 'setCount',
        payloadSchemaRef: setCount?.payload.schemaDigest,
        validatorAvailable: true,
        bindingStatus: 'matched',
      },
    })
  })

  it('denies payload schema digest mismatch before mutation authority is granted', () => {
    const manifest = makeManifest()

    const result = checkStaticLiveBinding({
      manifest,
      request: {
        manifestDigest: manifest.digest,
        actionTag: 'setCount',
        payloadSchemaRef: 'schema:stale-payload',
        validatorAvailable: true,
      },
    })

    expect(result).toMatchObject({
      ok: false,
      reason: 'payload-schema-digest-mismatch',
      binding: {
        manifestDigest: manifest.digest,
        actionTag: 'setCount',
        payloadSchemaRef: expect.stringMatching(/^schema:/),
        bindingStatus: 'mismatch',
      },
    })
  })

  it('classifies missing target binding as a transient reflection binding gap', () => {
    const result = checkStaticLiveBinding({
      request: {
        manifestDigest: 'runtime-manifest:missing',
        actionTag: 'setCount',
      },
    })

    expect(result).toEqual({
      ok: false,
      reason: 'missing-live-manifest-binding',
      binding: {
        manifestDigest: 'runtime-manifest:missing',
        actionTag: 'setCount',
        bindingStatus: 'missing',
      },
    })
  })

  it('reuses an indexed action lookup for repeated binding checks', () => {
    const manifest = makeManifest()
    const index = createStaticLiveBindingIndex(manifest)

    for (let indexLookup = 0; indexLookup < 3; indexLookup += 1) {
      expect(
        checkStaticLiveBinding({
          manifest,
          actionIndex: index,
          request: {
            manifestDigest: manifest.digest,
            actionTag: 'setCount',
            validatorAvailable: true,
          },
        }),
      ).toMatchObject({ ok: true })
    }

    expect(index.getDiagnostics()).toEqual({
      manifestDigest: manifest.digest,
      actionCount: manifest.actions.length,
      indexedActionCount: manifest.actions.length,
      actionLookupCount: 3,
      linearScanCount: 0,
      projectionRowAllocationCount: 0,
      disposed: false,
    })
  })

  it('carries static-live binding into completed and denied live operation facets', () => {
    const manifest = makeManifest()
    const setCount = manifest.actions.find((action) => action.actionTag === 'setCount')

    const completed = runLiveOperation(
      request({
        manifestDigest: manifest.digest,
        actionTag: 'setCount',
        payloadSchemaRef: setCount?.payload.schemaDigest,
        validatorAvailable: true,
      }),
      {
        authorizedTargets: [target],
        reflectionManifest: manifest,
      },
    )

    expect(completed).toMatchObject({
      kind: 'operation.completed',
      binding: {
        manifestDigest: manifest.digest,
        actionTag: 'setCount',
        payloadSchemaRef: setCount?.payload.schemaDigest,
        validatorAvailable: true,
        bindingStatus: 'matched',
      },
    })

    const denied = runLiveOperation(
      request({
        manifestDigest: 'runtime-manifest:stale',
        actionTag: 'setCount',
        payloadSchemaRef: setCount?.payload.schemaDigest,
        validatorAvailable: true,
      }),
      {
        authorizedTargets: [target],
        reflectionManifest: manifest,
        staleManifestDigests: ['runtime-manifest:stale'],
      },
    )

    expect(denied).toMatchObject({
      kind: 'operation.denied',
      reason: 'stale-manifest',
      noMutation: true,
      binding: {
        manifestDigest: 'runtime-manifest:stale',
        actionTag: 'setCount',
        payloadSchemaRef: setCount?.payload.schemaDigest,
        validatorAvailable: true,
        bindingStatus: 'stale',
      },
    })
  })
})
