import { describe, expect, it } from 'vitest'
import { Schema } from 'effect'
import type { ModuleRef } from '../../src/internal/store/ModuleRef.js'
import { fieldValue, useModule, useSelector } from '../../src/index.js'
import * as Form from '../../../logix-form/src/index.js'

// covers: CAP-PRESS-007-FU2, TASK-009.
type TypedPathContractValues = {
  readonly countryId: string
  readonly items: ReadonlyArray<{
    readonly id: string
    readonly warehouseId: string
  }>
}

type TypedPathContractState = TypedPathContractValues & {
  readonly errors: unknown
  readonly ui: unknown
  readonly $form: {
    readonly submitCount: number
    readonly isSubmitting: boolean
    readonly isDirty: boolean
    readonly errorCount: number
  }
}

type ExpectedCompanion = Readonly<{
  readonly availability?: Readonly<{
    readonly kind: 'interactive'
    readonly reason: 'typed-path-contract'
  }>
  readonly candidates?: Readonly<{
    readonly items: ReadonlyArray<Readonly<{ readonly id: 'w1'; readonly label: 'Warehouse 1' }>>
  }>
}>

type ExpectedCountryCompanion = Readonly<{
  readonly availability?: Readonly<{
    readonly kind: 'interactive'
    readonly reason: 'country'
  }>
}>

declare const formRef: ModuleRef<TypedPathContractState, never>

describe('useSelector typed path metadata contract', () => {
  it('records the current type-chain ceiling without adding public selector surface', () => {
    if (false) {
      const value = useSelector(formRef, fieldValue('items.0.warehouseId'))

      const _valueShouldInferFromPath: string = value

      // @ts-expect-error contract-green: invalid fieldValue literal paths reject against the typed handle state.
      useSelector(formRef, fieldValue('items.0.notAField'))

      const widenedPath: string = 'items.0.warehouseId'
      // @ts-expect-error typed handles reject widened fieldValue paths because they cannot be checked against state.
      useSelector(formRef, fieldValue(widenedPath))

      const program = Form.make(
        'typedPathMetadataContractReturnedCarrier',
        {
          values: Schema.Struct({
            countryId: Schema.String,
            items: Schema.Array(
              Schema.Struct({
                id: Schema.String,
                warehouseId: Schema.String,
              }),
            ),
          }),
          initialValues: {
            countryId: 'cn',
            items: [{ id: 'r1', warehouseId: 'w1' }],
          },
        },
        ($) => {
          $.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
          })
          return $.field('items.warehouseId').companion({
            deps: ['countryId', 'items.warehouseId'],
            lower(ctx) {
              const _value: string = ctx.value
              const _countryId: string = ctx.deps.countryId
              const _warehouseIds: ReadonlyArray<string> = ctx.deps['items.warehouseId']

              void _value
              void _countryId
              void _warehouseIds

              return {
                availability: {
                  kind: 'interactive' as const,
                  reason: 'typed-path-contract' as const,
                },
                candidates: {
                  items: [{ id: 'w1' as const, label: 'Warehouse 1' as const }],
                },
              }
            },
          })
        },
      )

      const form = useModule(program)
      const companion = useSelector(form, Form.Companion.field('items.warehouseId'))
      const rowCompanion = useSelector(form, Form.Companion.byRowId('items', 'r1', 'warehouseId'))

      const _companionShouldInferFromDeclaration: ExpectedCompanion | undefined = companion

      const _rowCompanionShouldInferFromDeclaration: ExpectedCompanion | undefined = rowCompanion

      const multiProgram = Form.make(
        'typedPathMetadataContractReturnedCarrierArray',
        {
          values: Schema.Struct({
            countryId: Schema.String,
            items: Schema.Array(
              Schema.Struct({
                id: Schema.String,
                warehouseId: Schema.String,
              }),
            ),
          }),
          initialValues: {
            countryId: 'cn',
            items: [{ id: 'r1', warehouseId: 'w1' }],
          },
        },
        ($) => {
          const countryCarrier = $.field('countryId').companion({
            deps: [],
            lower: () => ({
              availability: {
                kind: 'interactive' as const,
                reason: 'country' as const,
              },
            }),
          })
          const warehouseCarrier = $.field('items.warehouseId').companion({
            deps: ['countryId'],
            lower: () => ({
              availability: {
                kind: 'interactive' as const,
                reason: 'typed-path-contract' as const,
              },
              candidates: {
                items: [{ id: 'w1' as const, label: 'Warehouse 1' as const }],
              },
            }),
          })
          return [countryCarrier, warehouseCarrier] as const
        },
      )
      const multiForm = useModule(multiProgram)
      const countryCompanion = useSelector(multiForm, Form.Companion.field('countryId'))
      const multiWarehouseCompanion = useSelector(multiForm, Form.Companion.field('items.warehouseId'))

      const _multiCarrierCountry: ExpectedCountryCompanion | undefined = countryCompanion
      const _multiCarrierWarehouse: ExpectedCompanion | undefined = multiWarehouseCompanion

      const voidCallbackProgram = Form.make(
        'typedPathMetadataContractVoidCallback',
        {
          values: Schema.Struct({
            countryId: Schema.String,
            items: Schema.Array(
              Schema.Struct({
                id: Schema.String,
                warehouseId: Schema.String,
              }),
            ),
          }),
          initialValues: {
            countryId: 'cn',
            items: [{ id: 'r1', warehouseId: 'w1' }],
          },
        },
        ($) => {
          $.field('items.warehouseId').companion({
            deps: ['countryId'],
            lower: () => ({
              availability: {
                kind: 'interactive' as const,
                reason: 'typed-path-contract' as const,
              },
            }),
          })
        },
      )
      const voidCallbackForm = useModule(voidCallbackProgram)
      const voidCallbackCompanion = useSelector(voidCallbackForm, Form.Companion.field('items.warehouseId'))

      // @ts-expect-error blocker-record: imperative void callbacks still cannot soundly auto-collect exact metadata.
      const _voidCallbackStillDegrades: ExpectedCompanion | undefined = voidCallbackCompanion

      void _valueShouldInferFromPath
      void _companionShouldInferFromDeclaration
      void _rowCompanionShouldInferFromDeclaration
      void _multiCarrierCountry
      void _multiCarrierWarehouse
      void _voidCallbackStillDegrades
    }

    expect(true).toBe(true)
  })
})
