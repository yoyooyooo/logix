import { describe, expect, it } from 'vitest'
import type { ModuleRef } from '../../src/internal/store/ModuleRef.js'
import { fieldValue, rawFormMeta, useSelector } from '../../src/index.js'
import * as ReactLogix from '../../src/index.js'
import * as Form from '../../../logix-form/src/index.js'

type TestState = {
  readonly name: string
  readonly profileResource: unknown
  readonly errors: unknown
  readonly ui: unknown
  readonly $form: {
    readonly submitCount: number
    readonly isSubmitting: boolean
    readonly isDirty: boolean
    readonly errorCount: number
  }
}

declare const form: ModuleRef<TestState, never>

describe('useSelector type safety', () => {
  it('seals selector inputs and infers direct implementation-safe shapes', () => {
    if (false) {
      const name = useSelector(form, fieldValue('name'))
      const meta = useSelector(form, rawFormMeta())
      const explain = useSelector(form, Form.Error.field('name'))
      const companion = useSelector(form, Form.Companion.field('profileResource'))

      const _name: string = name
      const _meta: {
        readonly submitCount: number
        readonly isSubmitting: boolean
        readonly isDirty: boolean
        readonly errorCount: number
      } = meta
      const _explain: Form.Error.FormFieldExplainResult = explain
      const _companion: unknown = companion

      // @ts-expect-error arbitrary objects are no longer valid selector inputs
      useSelector(form, { path: 'name' })

      // @ts-expect-error companion descriptors must be consumed through Form.Companion
      useSelector(form, { kind: 'field', path: 'profileResource' })

      // @ts-expect-error no public helper leak from @logixjs/react root
      ReactLogix.formFieldCompanion

      // @ts-expect-error public no-arg host read is removed by specs/169
      useSelector(form)

      void _name
      void _meta
      void _explain
      void _companion
    }

    expect(true).toBe(true)
  })
})
