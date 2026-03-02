import { describe, expect, it } from 'vitest'

import { createIdentityAllocator } from '../../src/internal/protocol/identity.js'
import { makeCommandResultV2 } from '../../src/internal/protocol/resultV2.js'
import { assertCommandResultV2Schema } from '../../src/internal/protocol/schemaValidation.js'
import type { ArtifactOutput } from '../../src/internal/result.js'

const makeEnvelopeWithArtifacts = (artifacts: ReadonlyArray<ArtifactOutput>) =>
  makeCommandResultV2({
    runId: 'run-artifact-contract',
    instanceId: 'run-artifact-contract',
    txnSeq: 1,
    opSeq: 1,
    attemptSeq: 1,
    command: 'describe',
    verdict: 'PASS',
    reasonCode: 'VERIFY_PASS',
    reasons: [{ code: 'VERIFY_PASS', message: 'artifact contract base' }],
    artifacts,
  })

describe('contracts 103 command-result v2', () => {
  it('creates deterministic v2 envelope with stable ids', () => {
    const allocator = createIdentityAllocator('run-001')
    const ids = allocator.current()

    const result = makeCommandResultV2({
      runId: 'run-001',
      instanceId: ids.instanceId,
      txnSeq: ids.txnSeq,
      opSeq: ids.opSeq,
      attemptSeq: ids.attemptSeq,
      command: 'describe',
      verdict: 'PASS',
      reasonCode: 'CLI_INVALID_ARGUMENT',
      reasons: [{ code: 'CLI_INVALID_ARGUMENT', message: 'ok for contract test' }],
      artifacts: [],
    })

    expect(result.schemaVersion).toBe(2)
    expect(result.kind).toBe('CommandResult')
    expect(result.instanceId).toBe('run-001')
    expect(result.txnSeq).toBe(1)
    expect(result.opSeq).toBe(1)
    expect(result.attemptSeq).toBe(1)
    expect(result.exitCode).toBe(0)
    expect(result.ok).toBe(true)
    assertCommandResultV2Schema(result)
  })

  it('fails fast on unknown root field', () => {
    const result = makeCommandResultV2({
      runId: 'run-unknown-field',
      instanceId: 'run-unknown-field',
      txnSeq: 1,
      opSeq: 1,
      attemptSeq: 1,
      command: 'describe',
      verdict: 'PASS',
      reasonCode: 'VERIFY_PASS',
      reasons: [{ code: 'VERIFY_PASS', message: 'ok for schema test' }],
      artifacts: [],
    })

    expect(() =>
      assertCommandResultV2Schema({
        ...result,
        __unknown__: true,
      }),
    ).toThrowError(/schema 校验失败/)
  })

  it('fails fast on unknown reason code', () => {
    expect(() =>
      makeCommandResultV2({
        runId: 'run-002',
        instanceId: 'run-002',
        txnSeq: 1,
        opSeq: 1,
        attemptSeq: 1,
        command: 'describe',
        verdict: 'ERROR',
        reasonCode: 'UNKNOWN_REASON_CODE',
        reasons: [{ code: 'UNKNOWN_REASON_CODE', message: 'should throw' }],
        artifacts: [],
      }),
    ).toThrowError(/未登记 reason code/)
  })

  it('fails artifacts carrier xor validation (file/inline)', () => {
    const artifactWithBothCarriers = makeEnvelopeWithArtifacts([
      {
        outputKey: 'report',
        kind: 'DescribeReport',
        ok: true,
        file: './artifacts/report.json',
        inline: { schemaVersion: 1, kind: 'DescribeReport' },
      },
    ])

    const artifactWithoutCarrier = makeEnvelopeWithArtifacts([
      {
        outputKey: 'report',
        kind: 'DescribeReport',
        ok: true,
      },
    ])

    expect(() => assertCommandResultV2Schema(artifactWithBothCarriers)).toThrowError(/输出载体/)
    expect(() => assertCommandResultV2Schema(artifactWithoutCarrier)).toThrowError(/输出载体/)
  })

  it('fails artifacts ok/error linkage validation', () => {
    const okArtifactWithError = makeEnvelopeWithArtifacts([
      {
        outputKey: 'report',
        kind: 'DescribeReport',
        ok: true,
        inline: { schemaVersion: 1, kind: 'DescribeReport' },
        error: { message: 'should not exist when ok=true' },
      },
    ])

    const notOkArtifactWithoutError = makeEnvelopeWithArtifacts([
      {
        outputKey: 'report',
        kind: 'DescribeReport',
        ok: false,
        inline: { schemaVersion: 1, kind: 'DescribeReport' },
      },
    ])

    expect(() => assertCommandResultV2Schema(okArtifactWithError)).toThrowError(/ok=true 时不允许包含 error 字段/)
    expect(() => assertCommandResultV2Schema(notOkArtifactWithoutError)).toThrowError(/ok=false 时必须提供 error 字段/)
  })

  it('fails artifacts digest pattern validation', () => {
    const artifactWithInvalidDigest = makeEnvelopeWithArtifacts([
      {
        outputKey: 'report',
        kind: 'DescribeReport',
        ok: true,
        inline: { schemaVersion: 1, kind: 'DescribeReport' },
        digest: 'sha256:abc',
      },
    ])

    expect(() => assertCommandResultV2Schema(artifactWithInvalidDigest)).toThrowError(/\.digest/)
  })

  it('fails artifacts reasonCodes uniqueness validation', () => {
    const artifactWithDuplicatedReasonCodes = makeEnvelopeWithArtifacts([
      {
        outputKey: 'report',
        kind: 'DescribeReport',
        ok: true,
        inline: { schemaVersion: 1, kind: 'DescribeReport' },
        reasonCodes: ['VERIFY_PASS', 'VERIFY_PASS'],
      },
    ])

    expect(() => assertCommandResultV2Schema(artifactWithDuplicatedReasonCodes)).toThrowError(/出现重复值/)
  })
})
