import { describe, expect, it } from 'vitest'
import { Schema } from 'effect'
import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'

import { admitLiveOperation, makeLiveTargetCoordinate, type LiveOperationRequest } from '../../../src/internal/live-bridge-api.js'
import * as Logix from '../../../src/index.js'

const target = makeLiveTargetCoordinate({ runtimeId: 'runtime-1', moduleId: 'module-1', instanceId: 'instance-1' })

const request = (overrides: Partial<LiveOperationRequest> = {}): LiveOperationRequest => ({
  actorId: 'agent',
  operationKind: 'dispatch.declaredAction',
  target,
  permissionScope: 'debug:dispatch',
  manifestDigest: 'manifest:current',
  actionTag: 'submit',
  payloadSchemaRef: 'payload:submit',
  validatorAvailable: true,
  budget: { maxEvents: 1, maxInlineBytes: 128 },
  redactionPolicyRef: 'default',
  ...overrides,
})

const makeManifest = () => {
  const Module = Logix.Module.make('module-1', {
    state: Schema.Struct({ ready: Schema.Boolean }),
    actions: {
      submit: Schema.String,
      ping: Schema.Void,
    },
    reducers: {},
  })

  return CoreReflection.extractRuntimeReflectionManifest(
    Logix.Program.make(Module, { initial: { ready: true }, logics: [] }),
    { programId: 'live-admission.program' },
  )
}

describe('live operation admission guard', () => {
  it('accepts a declared action through owner reflection binding', () => {
    const manifest = makeManifest()
    const submit = manifest.actions.find((action) => action.actionTag === 'submit')

    expect(
      admitLiveOperation(request({
        manifestDigest: manifest.digest,
        payloadSchemaRef: submit?.payload.schemaDigest,
      }), {
        authorizedTargets: [target],
        reflectionManifest: manifest,
      }),
    ).toMatchObject({
      ok: true,
      kind: 'operation.accepted',
      request: expect.objectContaining({
        manifestDigest: manifest.digest,
        actionTag: 'submit',
        payloadSchemaRef: submit?.payload.schemaDigest,
        bindingStatus: 'matched',
      }),
    })
  })

  it('denies dispatch when owner reflection binding is missing', () => {
    expect(
      admitLiveOperation(request(), {
        authorizedTargets: [target],
      }),
    ).toMatchObject({
      ok: false,
      kind: 'operation.denied',
      reason: 'missing-live-manifest-binding',
      noMutation: true,
      binding: expect.objectContaining({
        manifestDigest: 'manifest:current',
        actionTag: 'submit',
        bindingStatus: 'missing',
      }),
    })
  })

  it('denies stale manifest before mutation', () => {
    const manifest = makeManifest()
    expect(
      admitLiveOperation(request({ manifestDigest: 'manifest:old' }), {
        authorizedTargets: [target],
        staleManifestDigests: ['manifest:old'],
        reflectionManifest: manifest,
      }),
    ).toMatchObject({ ok: false, kind: 'operation.denied', reason: 'stale-manifest', noMutation: true })
  })

  it('denies digest mismatch before mutation', () => {
    const manifest = makeManifest()
    expect(
      admitLiveOperation(request({ manifestDigest: 'manifest:other' }), {
        authorizedTargets: [target],
        reflectionManifest: manifest,
      }),
    ).toMatchObject({ ok: false, kind: 'operation.denied', reason: 'digest-mismatch', noMutation: true })
  })

  it('denies unavailable action contract before mutation', () => {
    const manifest = makeManifest()
    expect(
      admitLiveOperation(request({ manifestDigest: manifest.digest, actionTag: 'missing' }), {
        authorizedTargets: [target],
        reflectionManifest: manifest,
      }),
    ).toMatchObject({ ok: false, kind: 'operation.denied', reason: 'unavailable-action-contract', noMutation: true })
  })

  it('denies unauthorized target before mutation', () => {
    expect(
      admitLiveOperation(request(), {
        authorizedTargets: [makeLiveTargetCoordinate({ runtimeId: 'runtime-2', moduleId: 'module-1', instanceId: 'instance-1' })],
        reflectionManifest: makeManifest(),
      }),
    ).toMatchObject({ ok: false, kind: 'operation.denied', reason: 'unauthorized-target', noMutation: true })
  })

  it('denies missing validator for non-void dispatch before mutation', () => {
    const manifest = makeManifest()
    const submit = manifest.actions.find((action) => action.actionTag === 'submit')

    expect(
      admitLiveOperation(request({
        manifestDigest: manifest.digest,
        validatorAvailable: false,
        payloadSchemaRef: submit?.payload.schemaDigest,
      }), {
        authorizedTargets: [target],
        reflectionManifest: manifest,
      }),
    ).toMatchObject({ ok: false, kind: 'operation.denied', reason: 'missing-validator', noMutation: true })
  })

  it('denies payload schema mismatch before mutation', () => {
    const manifest = makeManifest()

    expect(
      admitLiveOperation(request({
        manifestDigest: manifest.digest,
        payloadSchemaRef: 'schema:stale-submit',
      }), {
        authorizedTargets: [target],
        reflectionManifest: manifest,
      }),
    ).toMatchObject({
      ok: false,
      kind: 'operation.denied',
      reason: 'payload-schema-digest-mismatch',
      noMutation: true,
      binding: expect.objectContaining({
        manifestDigest: manifest.digest,
        actionTag: 'submit',
        bindingStatus: 'mismatch',
      }),
    })
  })
})
