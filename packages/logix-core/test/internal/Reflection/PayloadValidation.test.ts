import { describe, expect, it } from '@effect/vitest'
import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
import { Schema } from 'effect'

describe('Reflection payload summary and validation', () => {
  it('summarizes void, primitive and struct payload schemas deterministically', () => {
    const StructPayload = Schema.Struct({
      count: Schema.Number,
      label: Schema.String,
    })

    expect(CoreReflection.summarizePayloadSchema(Schema.Void)).toMatchObject({
      kind: 'void',
      label: 'Schema.Void',
      jsonShape: { type: 'void' },
    })

    expect(CoreReflection.summarizePayloadSchema(Schema.Number)).toMatchObject({
      kind: 'primitive',
      label: 'Schema.Number',
      jsonShape: { type: 'number' },
    })

    const summary = CoreReflection.summarizePayloadSchema(StructPayload)
    const summaryAgain = CoreReflection.summarizePayloadSchema(StructPayload)

    expect(summary).toMatchObject({
      kind: 'struct',
      label: 'Schema.Struct({ count: Schema.Number, label: Schema.String })',
      jsonShape: {
        type: 'object',
        properties: {
          count: { type: 'number' },
          label: { type: 'string' },
        },
        required: ['count', 'label'],
      },
    })
    expect(summary.digest).toBe(summaryAgain.digest)
    expect(summary.digest).toMatch(/^schema:/)
  })

  it('validates JSON-decoded payloads and projects stable issue DTOs', () => {
    const StructPayload = Schema.Struct({
      count: Schema.Number,
      label: Schema.String,
    })

    expect(CoreReflection.validateJsonPayload(Schema.Number, 3)).toEqual({
      _tag: 'success',
      value: 3,
    })

    expect(CoreReflection.validateJsonPayload(StructPayload, { count: 'x', label: 'ok' })).toEqual({
      _tag: 'failure',
      issues: [
        {
          path: 'count',
          code: 'invalid_type',
          message: 'Expected number, got "x"',
        },
      ],
    })

    expect(CoreReflection.validateJsonPayload(StructPayload, { count: 1 })).toEqual({
      _tag: 'failure',
      issues: [
        {
          path: 'label',
          code: 'missing_key',
          message: 'Missing key',
        },
      ],
    })
  })

  it('returns an evidence gap for unknown schemas', () => {
    expect(CoreReflection.validateJsonPayload(undefined, { count: 1 })).toEqual({
      _tag: 'unavailable',
      reason: 'unknown-schema',
      evidenceGap: {
        class: 'evidenceGap',
        kind: 'reflection-evidence-gap',
        id: 'unknown-payload-schema',
        owner: 'reflection',
        code: 'unknown-payload-schema',
        message: 'Payload schema is unavailable for validation.',
        severity: 'warning',
      },
    })
  })
})
