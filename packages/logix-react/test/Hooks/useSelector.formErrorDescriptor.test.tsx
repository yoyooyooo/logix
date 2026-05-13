import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule, useSelector } from '../../src/index.js'

const FIELD_ERROR_SELECTOR_DESCRIPTOR = Symbol.for('@logixjs/form/FormFieldErrorSelectorDescriptor')

const formFieldDescriptor = (path: string): Record<PropertyKey, unknown> => {
  const descriptor: Record<PropertyKey, unknown> = {}
  Object.defineProperty(descriptor, FIELD_ERROR_SELECTOR_DESCRIPTOR, {
    value: Object.freeze({
      kind: 'field',
      path,
    }),
    enumerable: false,
    configurable: false,
    writable: false,
  })
  return Object.freeze(descriptor)
}

describe('useSelector(Form.Error.field(path))', () => {
  it('reads field error through the companion descriptor with canonical precedence', async () => {
    const ValuesSchema = Schema.Struct({
      name: Schema.String,
    })

    const formProgram = Logix.Program.make(
      Logix.Module.make('useSelectorFormErrorDescriptorModule', {
        state: Schema.Struct({
          name: Schema.String,
          errors: Schema.Unknown,
          ui: Schema.Unknown,
          $form: Schema.Struct({
            submitCount: Schema.Number,
            isSubmitting: Schema.Boolean,
            isDirty: Schema.Boolean,
            errorCount: Schema.Number,
          }),
        }),
        actions: {
          validateName: Schema.Void,
          setManualError: Schema.Void,
        },
        reducers: {
          validateName: Logix.Module.Reducer.mutate((draft: any) => {
            draft.errors = {
              ...(draft.errors ?? {}),
              name: {
                origin: 'rule',
                severity: 'error',
                message: {
                  _tag: 'i18n',
                  key: 'logix.form.rule.literal',
                  params: { a: 'rule', b: '', c: '' },
                },
              },
            }
          }),
          setManualError: Logix.Module.Reducer.mutate((draft: any) => {
            draft.errors = {
              ...(draft.errors ?? {}),
              $manual: {
                ...((draft.errors?.$manual ?? {}) as Record<string, unknown>),
                name: {
                  origin: 'manual',
                  severity: 'error',
                  message: {
                    _tag: 'i18n',
                    key: 'logix.form.rule.literal',
                    params: { a: 'manual', b: '', c: '' },
                  },
                },
              },
            }
          }),
        },
      }),
      {
        initial: {
          name: '',
          errors: {},
          ui: {},
          $form: {
            submitCount: 0,
            isSubmitting: false,
            isDirty: false,
            errorCount: 0,
          },
        },
      },
    )

    const runtime = Logix.Runtime.make(formProgram)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const form = useModule(formProgram)
        const nameError = useSelector(form, formFieldDescriptor('name') as any)
        return {
          form,
          nameError,
        }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.nameError).toBeUndefined()
    })

    await act(async () => {
      result.current.form.dispatchers.validateName()
    })

    await waitFor(() => {
      expect((result.current.nameError as any)?.kind).toBe('error')
      expect((result.current.nameError as any)?.reasonSlotId).toBe('field:name')
      expect((result.current.nameError as any)?.error?.origin).toBe('rule')
      expect((result.current.nameError as any)?.sourceRef).toBe('errors.name')
    })

    await act(async () => {
      result.current.form.dispatchers.setManualError()
    })

    await waitFor(() => {
      expect((result.current.nameError as any)?.kind).toBe('error')
      expect((result.current.nameError as any)?.reasonSlotId).toBe('field:name')
      expect((result.current.nameError as any)?.error?.origin).toBe('manual')
      expect((result.current.nameError as any)?.sourceRef).toBe('errors.$manual.name')
    })
  })

  it('explains pending, stale, and error states for source-backed paths through the same descriptor', async () => {
    const module = Logix.Program.make(
      Logix.Module.make('useSelectorFormReasonDescriptorModule', {
        state: Schema.Struct({
          profileResource: Schema.Unknown,
          errors: Schema.Unknown,
          ui: Schema.Unknown,
          $form: Schema.Struct({
            submitCount: Schema.Number,
            isSubmitting: Schema.Boolean,
            isDirty: Schema.Boolean,
            errorCount: Schema.Number,
            submitAttempt: Schema.Struct({
              seq: Schema.Number,
              reasonSlotId: Schema.String,
              verdict: Schema.String,
              decodedVerdict: Schema.String,
              blockingBasis: Schema.String,
              errorCount: Schema.Number,
              pendingCount: Schema.Number,
              summary: Schema.Unknown,
              compareFeed: Schema.Unknown,
            }),
          }),
        }),
        actions: {
          setLoading: Schema.Void,
          setStale: Schema.Void,
          setSourceError: Schema.Void,
        },
        reducers: {
          setLoading: Logix.Module.Reducer.mutate((draft: any) => {
            draft.profileResource = { status: 'loading', keyHash: 'k1' }
          }),
          setStale: Logix.Module.Reducer.mutate((draft: any) => {
            draft.profileResource = { status: 'success', keyHash: 'k1', data: { name: 'ok' } }
            draft.$form.submitAttempt = {
              seq: 1,
              reasonSlotId: 'submit:1',
              verdict: 'blocked',
              decodedVerdict: 'valid',
              blockingBasis: 'pending',
              errorCount: 0,
              pendingCount: 1,
              summary: {
                verdict: 'blocked',
                decodedVerdict: 'valid',
                blockingBasis: 'pending',
                errorCount: 0,
                pendingCount: 1,
              },
              compareFeed: {
                reasonSlotId: 'submit:1',
                verdict: 'blocked',
                decodedVerdict: 'valid',
                blockingBasis: 'pending',
                errorCount: 0,
                pendingCount: 1,
              },
            }
          }),
          setSourceError: Logix.Module.Reducer.mutate((draft: any) => {
            draft.profileResource = { status: 'error', keyHash: 'k1', error: 'remote-failed' }
          }),
        },
      }),
      {
        initial: {
          profileResource: { status: 'idle' },
          errors: {},
          ui: {},
          $form: {
            submitCount: 0,
            isSubmitting: false,
            isDirty: false,
            errorCount: 0,
            submitAttempt: {
              seq: 0,
              reasonSlotId: 'submit:0',
              verdict: 'idle',
              decodedVerdict: 'not-run',
              blockingBasis: 'none',
              errorCount: 0,
              pendingCount: 0,
              summary: {
                verdict: 'idle',
                decodedVerdict: 'not-run',
                blockingBasis: 'none',
                errorCount: 0,
                pendingCount: 0,
              },
              compareFeed: {
                reasonSlotId: 'submit:0',
                verdict: 'idle',
                decodedVerdict: 'not-run',
                blockingBasis: 'none',
                errorCount: 0,
                pendingCount: 0,
              },
            },
          },
        },
      },
    )

    const runtime = Logix.Runtime.make(module)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const form = useModule(module)
        const reason = useSelector(form, formFieldDescriptor('profileResource') as any)
        return { form, reason }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.reason).toBeUndefined()
    })

    await act(async () => {
      result.current.form.dispatchers.setLoading()
    })

    await waitFor(() => {
      expect((result.current.reason as any)?.kind).toBe('pending')
      expect((result.current.reason as any)?.subjectRef).toEqual({
        kind: 'task',
        id: 'profileResource',
      })
    })

    await act(async () => {
      result.current.form.dispatchers.setStale()
    })

    await waitFor(() => {
      expect((result.current.reason as any)?.kind).toBe('stale')
      expect((result.current.reason as any)?.reasonSlotId).toBe('submit:1')
      expect((result.current.reason as any)?.subjectRef).toEqual({
        kind: 'task',
        id: 'profileResource',
      })
    })

    await act(async () => {
      result.current.form.dispatchers.setSourceError()
    })

    await waitFor(() => {
      expect((result.current.reason as any)?.kind).toBe('error')
      expect((result.current.reason as any)?.reasonSlotId).toBe('source:profileResource')
      expect((result.current.reason as any)?.error).toBe('remote-failed')
      expect((result.current.reason as any)?.sourceRef).toBe('profileResource')
      expect((result.current.reason as any)?.subjectRef).toEqual({
        kind: 'task',
        id: 'profileResource',
      })
    })
  })

  it('explains loading source submitImpact from the source snapshot path before global pending fallback', async () => {
    const module = Logix.Program.make(
      Logix.Module.make('useSelectorFormReasonDescriptorPathSensitivePendingModule', {
        state: Schema.Struct({
          blockResource: Schema.Unknown,
          observeResource: Schema.Unknown,
          errors: Schema.Unknown,
          ui: Schema.Unknown,
          $form: Schema.Struct({
            submitCount: Schema.Number,
            isSubmitting: Schema.Boolean,
            isDirty: Schema.Boolean,
            errorCount: Schema.Number,
            submitAttempt: Schema.Struct({
              seq: Schema.Number,
              reasonSlotId: Schema.String,
              verdict: Schema.String,
              decodedVerdict: Schema.String,
              blockingBasis: Schema.String,
              errorCount: Schema.Number,
              pendingCount: Schema.Number,
              summary: Schema.Unknown,
              compareFeed: Schema.Unknown,
            }),
          }),
        }),
        actions: {
          setLoading: Schema.Void,
        },
        reducers: {
          setLoading: Logix.Module.Reducer.mutate((draft: any) => {
            draft.blockResource = { status: 'loading', keyHash: 'k-block', submitImpact: 'block' }
            draft.observeResource = { status: 'loading', keyHash: 'k-observe', submitImpact: 'observe' }
            draft.$form.submitAttempt = {
              seq: 1,
              reasonSlotId: 'submit:1',
              verdict: 'blocked',
              decodedVerdict: 'valid',
              blockingBasis: 'pending',
              errorCount: 0,
              pendingCount: 1,
              summary: {
                verdict: 'blocked',
                decodedVerdict: 'valid',
                blockingBasis: 'pending',
                errorCount: 0,
                pendingCount: 1,
              },
              compareFeed: {
                reasonSlotId: 'submit:1',
                verdict: 'blocked',
                decodedVerdict: 'valid',
                blockingBasis: 'pending',
                errorCount: 0,
                pendingCount: 1,
              },
            }
          }),
        },
      }),
      {
        initial: {
          blockResource: { status: 'idle' },
          observeResource: { status: 'idle' },
          errors: {},
          ui: {},
          $form: {
            submitCount: 0,
            isSubmitting: false,
            isDirty: false,
            errorCount: 0,
            submitAttempt: {
              seq: 0,
              reasonSlotId: 'submit:0',
              verdict: 'idle',
              decodedVerdict: 'not-run',
              blockingBasis: 'none',
              errorCount: 0,
              pendingCount: 0,
              summary: {
                verdict: 'idle',
                decodedVerdict: 'not-run',
                blockingBasis: 'none',
                errorCount: 0,
                pendingCount: 0,
              },
              compareFeed: {
                reasonSlotId: 'submit:0',
                verdict: 'idle',
                decodedVerdict: 'not-run',
                blockingBasis: 'none',
                errorCount: 0,
                pendingCount: 0,
              },
            },
          },
        },
      },
    )

    const runtime = Logix.Runtime.make(module)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const form = useModule(module)
        const blockingReason = useSelector(form, formFieldDescriptor('blockResource') as any)
        const observeReason = useSelector(form, formFieldDescriptor('observeResource') as any)
        return { form, blockingReason, observeReason }
      },
      { wrapper },
    )

    await act(async () => {
      result.current.form.dispatchers.setLoading()
    })

    await waitFor(() => {
      expect((result.current.blockingReason as any)?.kind).toBe('pending')
      expect((result.current.blockingReason as any)?.submitImpact).toBe('block')
      expect((result.current.observeReason as any)?.kind).toBe('pending')
      expect((result.current.observeReason as any)?.submitImpact).toBe('observe')
    })
  })

  it('explains cleanup after list structural removal through the same descriptor', async () => {
    const module = Logix.Program.make(
      Logix.Module.make('useSelectorFormCleanupDescriptorModule', {
        state: Schema.Struct({
          items: Schema.Array(
            Schema.Struct({
              id: Schema.String,
              sku: Schema.String,
            }),
          ),
          errors: Schema.Unknown,
          ui: Schema.Unknown,
          $form: Schema.Struct({
            submitCount: Schema.Number,
            isSubmitting: Schema.Boolean,
            isDirty: Schema.Boolean,
            errorCount: Schema.Number,
          }),
        }),
        actions: {
          markCleanupRemove: Schema.Void,
        },
        reducers: {
          markCleanupRemove: Logix.Module.Reducer.mutate((draft: any) => {
            draft.items = [{ id: 'row-1', sku: 'A' }]
            draft.ui = {
              ...(draft.ui ?? {}),
              $cleanup: {
                ...((draft.ui?.$cleanup ?? {}) as Record<string, unknown>),
                items: {
                  kind: 'cleanup',
                  cause: 'remove',
                  reasonSlotId: 'cleanup:items',
                  sourceRef: 'ui.$cleanup.items',
                  subjectRef: {
                    kind: 'cleanup',
                    id: 'items',
                  },
                },
              },
            }
          }),
        },
      }),
      {
        initial: {
          items: [{ id: 'row-1', sku: 'A' }, { id: 'row-2', sku: 'B' }],
          errors: {},
          ui: {},
          $form: {
            submitCount: 0,
            isSubmitting: false,
            isDirty: false,
            errorCount: 0,
          },
        },
      },
    )

    const runtime = Logix.Runtime.make(module)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const form = useModule(module)
        const listReason = useSelector(form, formFieldDescriptor('items') as any)
        return { form, listReason }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.listReason).toBeUndefined()
    })

    await act(async () => {
      result.current.form.dispatchers.markCleanupRemove()
    })

    await waitFor(() => {
      expect((result.current.listReason as any)?.kind).toBe('cleanup')
      expect((result.current.listReason as any)?.cause).toBe('remove')
      expect((result.current.listReason as any)?.reasonSlotId).toBe('cleanup:items')
      expect((result.current.listReason as any)?.sourceRef).toBe('ui.$cleanup.items')
      expect((result.current.listReason as any)?.subjectRef).toEqual({
        kind: 'cleanup',
        id: 'items',
      })
    })
  })

  it('explains row-scoped field error with stable row subjectRef', async () => {
    const module = Logix.Program.make(
      Logix.Module.make('useSelectorFormRowReasonDescriptorModule', {
        state: Schema.Struct({
          items: Schema.Array(
            Schema.Struct({
              id: Schema.String,
              warehouseId: Schema.String,
            }),
          ),
          errors: Schema.Unknown,
          ui: Schema.Unknown,
          $form: Schema.Struct({
            submitCount: Schema.Number,
            isSubmitting: Schema.Boolean,
            isDirty: Schema.Boolean,
            errorCount: Schema.Number,
          }),
        }),
        actions: {
          setRowError: Schema.Void,
        },
        reducers: {
          setRowError: Logix.Module.Reducer.mutate((draft: any) => {
            draft.errors = {
              ...(draft.errors ?? {}),
              items: {
                rows: [
                  undefined,
                  {
                    $rowId: 'row-2',
                    warehouseId: {
                      origin: 'rule',
                      severity: 'error',
                      message: {
                        _tag: 'i18n',
                        key: 'logix.form.rule.literal',
                        params: { a: 'dup', b: '', c: '' },
                      },
                    },
                  },
                ],
              },
            }
          }),
        },
      }),
      {
        initial: {
          items: [
            { id: 'row-1', warehouseId: 'WH-1' },
            { id: 'row-2', warehouseId: 'WH-1' },
          ],
          errors: {},
          ui: {},
          $form: {
            submitCount: 0,
            isSubmitting: false,
            isDirty: false,
            errorCount: 0,
          },
        },
      },
    )

    const runtime = Logix.Runtime.make(module)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const form = useModule(module)
        const rowReason = useSelector(form, formFieldDescriptor('items.1.warehouseId') as any)
        return { form, rowReason }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.rowReason).toBeUndefined()
    })

    await act(async () => {
      result.current.form.dispatchers.setRowError()
    })

    await waitFor(() => {
      expect((result.current.rowReason as any)?.kind).toBe('error')
      expect((result.current.rowReason as any)?.reasonSlotId).toBe('field:items.1.warehouseId')
      expect((result.current.rowReason as any)?.error?.origin).toBe('rule')
      expect((result.current.rowReason as any)?.sourceRef).toBe('errors.items.rows.1.warehouseId')
      expect((result.current.rowReason as any)?.subjectRef).toEqual({
        kind: 'row',
        id: 'row-2',
      })
    })
  })
})
