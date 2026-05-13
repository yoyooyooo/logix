import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../../../src/internal/debug-api.js'
import * as FieldValidate from '../../../src/internal/field-kernel/validate.js'
import * as RowId from '../../../src/internal/field-kernel/rowid.js'

describe('FieldKernel validate static IR', () => {
  it.effect('precompiles scoped validate selection and only runs affected checks', () =>
    Effect.gen(function* () {
      const StateSchema = Schema.Struct({
        age: Schema.Number,
        profile: Schema.Struct({
          name: Schema.String,
        }),
        errors: Schema.Any,
      })

      let affectedCheckCount = 0
      let unrelatedCheckCount = 0

      const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
        age: FieldContracts.fieldNode({
          check: {
            affected: {
              deps: ['age'],
              validate: () => {
                affectedCheckCount += 1
                return 'age-error'
              },
            },
          },
        }),
        profile: FieldContracts.fieldNode({
          check: {
            unrelated: {
              deps: ['profile.name'],
              validate: () => {
                unrelatedCheckCount += 1
                return 'profile-error'
              },
            },
          },
        }),
      })

      const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)
      expect(program.validateIr).toBeDefined()

      yield* FieldValidate.validateInTransaction(
        program as any,
        {
          moduleId: 'validate-static-ir',
          instanceId: 'validate-static-ir',
          rowIdStore: new RowId.RowIdStore('validate-static-ir'),
          listConfigs: [],
          getDraft: () => ({ age: 10, profile: { name: 'n' }, errors: {} }) as any,
          setDraft: () => {},
          recordPatch: () => {},
        } as FieldValidate.ValidateContext<any>,
        [{ mode: 'manual', target: { kind: 'field', path: 'age' } }],
      )

      expect(affectedCheckCount).toBe(1)
      expect(unrelatedCheckCount).toBe(0)
    }),
  )

  it.effect('tags full fallback trace with unified kernel fallback reason when validate IR is missing', () =>
    Effect.gen(function* () {
      const StateSchema = Schema.Struct({
        age: Schema.Number,
        errors: Schema.Any,
      })

      const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
        age: FieldContracts.fieldNode({
          check: {
            required: {
              deps: ['age'],
              validate: () => 'age-error',
            },
          },
        }),
      })

      const program = {
        ...FieldContracts.buildFieldProgram(StateSchema, fieldSpec),
        validateIr: undefined,
      }
      const ring = Debug.makeRingBufferSink(16)
      const layer = Layer.mergeAll(Debug.replace([ring.sink]), Debug.diagnosticsLevel('light')) as Layer.Layer<
        any,
        never,
        never
      >

      yield* FieldValidate.validateInTransaction(
        program as any,
        {
          moduleId: 'validate-static-ir-missing',
          instanceId: 'validate-static-ir-missing',
          rowIdStore: new RowId.RowIdStore('validate-static-ir-missing'),
          listConfigs: [],
          getDraft: () => ({ age: 10, errors: {} }) as any,
          setDraft: () => {},
          recordPatch: () => {},
        } as FieldValidate.ValidateContext<any>,
        [{ mode: 'manual', target: { kind: 'field', path: 'age' } }],
      ).pipe(Effect.provide(layer))

      const validate = ring.getSnapshot().find((e) => e.type === 'trace:field:validate') as any
      expect(validate?.data).toMatchObject({
        selectionSource: 'full-fallback',
        selectionFallbackReason: 'missing_validate_ir',
        kernelFallbackReason: 'missing_validate_ir',
      })
    }),
  )
})
