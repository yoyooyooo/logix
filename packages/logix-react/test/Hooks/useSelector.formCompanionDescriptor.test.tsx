import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule, useSelector } from '../../src/index.js'

const FIELD_COMPANION_SELECTOR_DESCRIPTOR = Symbol.for('@logixjs/form/FormFieldCompanionSelectorDescriptor')
const ROW_COMPANION_SELECTOR_DESCRIPTOR = Symbol.for('@logixjs/form/FormRowCompanionSelectorDescriptor')
const RUNTIME_INTERNALS = Symbol.for('@logixjs/core/runtimeInternals')

const formCompanionDescriptor = (path: string): Record<PropertyKey, unknown> => {
  const descriptor: Record<PropertyKey, unknown> = {}
  Object.defineProperty(descriptor, FIELD_COMPANION_SELECTOR_DESCRIPTOR, {
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

const formCompanionByRowIdDescriptor = (listPath: string, rowId: string, fieldPath: string): Record<PropertyKey, unknown> => {
  const descriptor: Record<PropertyKey, unknown> = {}
  Object.defineProperty(descriptor, ROW_COMPANION_SELECTOR_DESCRIPTOR, {
    value: Object.freeze({
      kind: 'row',
      listPath,
      rowId,
      fieldPath,
    }),
    enumerable: false,
    configurable: false,
    writable: false,
  })
  return Object.freeze(descriptor)
}

const setRuntimeInternals = (runtime: object, internals: unknown): void => {
  Object.defineProperty(runtime, RUNTIME_INTERNALS, {
    value: internals,
    enumerable: false,
    configurable: true,
    writable: false,
  })
}

describe('useSelector(Form.Companion.field(path))', () => {
  it('reads field companion facts through the canonical selector gate without raw path knowledge', async () => {
    const module = Logix.Program.make(
      Logix.Module.make('useSelectorFormCompanionDescriptorModule', {
        state: Schema.Struct({
          ui: Schema.Unknown,
        }),
        actions: {
          setCompanion: Schema.Void,
          clearCompanion: Schema.Void,
        },
        reducers: {
          setCompanion: Logix.Module.Reducer.mutate((draft: any) => {
            draft.ui = {
              ...(draft.ui ?? {}),
              profileResource: {
                ...(draft.ui?.profileResource ?? {}),
                $companion: {
                  availability: {
                    kind: 'interactive',
                    profileId: 'p1',
                  },
                  candidates: {
                    items: [
                      { id: 'p1-1', name: 'Profile p1 · 1' },
                      { id: 'p1-2', name: 'Profile p1 · 2' },
                    ],
                    keepCurrent: true,
                  },
                },
              },
            }
          }),
          clearCompanion: Logix.Module.Reducer.mutate((draft: any) => {
            if (draft.ui?.profileResource) {
              draft.ui.profileResource.$companion = undefined
            }
          }),
        },
      }),
      {
        initial: {
          ui: {},
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
        const companion = useSelector(form, formCompanionDescriptor('profileResource') as any)
        return { form, companion }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.companion).toBeUndefined()
    })

    await act(async () => {
      result.current.form.dispatchers.setCompanion()
    })

    await waitFor(() => {
      expect(result.current.companion).toEqual({
        availability: {
          kind: 'interactive',
          profileId: 'p1',
        },
        candidates: {
          items: [
            { id: 'p1-1', name: 'Profile p1 · 1' },
            { id: 'p1-2', name: 'Profile p1 · 2' },
          ],
          keepCurrent: true,
        },
      })
    })

    await act(async () => {
      result.current.form.dispatchers.clearCompanion()
    })

    await waitFor(() => {
      expect(result.current.companion).toBeUndefined()
    })
  })

  it('reads nested row companion facts through the same selector gate', async () => {
    const module = Logix.Program.make(
      Logix.Module.make('useSelectorFormCompanionNestedDescriptorModule', {
        state: Schema.Struct({
          ui: Schema.Unknown,
        }),
        actions: {
          setNestedCompanion: Schema.Void,
        },
        reducers: {
          setNestedCompanion: Logix.Module.Reducer.mutate((draft: any) => {
            draft.ui = {
              ...(draft.ui ?? {}),
              items: [
                {
                  allocations: [
                    {
                      dept: {
                        $companion: {
                          availability: {
                            kind: 'interactive',
                          },
                          candidates: {
                            items: ['A'],
                          },
                        },
                      },
                    },
                  ],
                },
              ],
            }
          }),
        },
      }),
      {
        initial: {
          ui: {},
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
        const companion = useSelector(form, formCompanionDescriptor('items.0.allocations.0.dept') as any)
        return { form, companion }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.companion).toBeUndefined()
    })

    await act(async () => {
      result.current.form.dispatchers.setNestedCompanion()
    })

    await waitFor(() => {
      expect(result.current.companion).toEqual({
        availability: {
          kind: 'interactive',
        },
        candidates: {
          items: ['A'],
        },
      })
    })
  })

  it('reads row-owner companion facts through the same selector gate after reorder', async () => {
    const module = Logix.Program.make(
      Logix.Module.make('useSelectorFormCompanionByRowIdDescriptorModule', {
        state: Schema.Struct({
          items: Schema.Array(
            Schema.Struct({
              id: Schema.String,
              warehouseId: Schema.String,
            }),
          ),
          ui: Schema.Unknown,
        }),
        actions: {
          prime: Schema.Void,
          swapRows: Schema.Void,
        },
        reducers: {
          prime: Logix.Module.Reducer.mutate((draft: any) => {
            draft.items = [
              { id: 'row-1', warehouseId: 'WH-001' },
              { id: 'row-2', warehouseId: 'WH-002' },
            ]
            draft.ui = {
              items: [
                {
                  warehouseId: {
                    $companion: {
                      availability: { kind: 'interactive' },
                      candidates: {
                        items: ['WH-001', 'WH-003'],
                        keepCurrent: true,
                      },
                    },
                  },
                },
                {
                  warehouseId: {
                    $companion: {
                      availability: { kind: 'interactive' },
                      candidates: {
                        items: ['WH-002', 'WH-003'],
                        keepCurrent: true,
                      },
                    },
                  },
                },
              ],
            }
          }),
          swapRows: Logix.Module.Reducer.mutate((draft: any) => {
            draft.items = [draft.items[1], draft.items[0]]
            draft.ui = {
              items: [draft.ui.items[1], draft.ui.items[0]],
            }
          }),
        },
      }),
      {
        initial: {
          items: [],
          ui: {},
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
        const companion = useSelector(form, formCompanionByRowIdDescriptor('items', 'row-2', 'warehouseId') as any)
        return { form, companion }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.companion).toBeUndefined()
    })

    const currentOrder = {
      items: [
        { id: 'row-1', warehouseId: 'WH-001' },
        { id: 'row-2', warehouseId: 'WH-002' },
      ],
    }
    const rowIdStore = {
      getIndex: (_listPath: string, rowId: string) => currentOrder.items.findIndex((row) => row.id === rowId),
    }
    setRuntimeInternals(result.current.form.runtime as object, {
      moduleId: 'useSelectorFormCompanionByRowIdDescriptorModule',
      instanceId: result.current.form.runtime.instanceId,
      fields: {
        rowIdStore,
        getListConfigs: () => [{ path: 'items', trackBy: 'id' }],
      },
    })

    await act(async () => {
      result.current.form.dispatchers.prime()
    })

    await waitFor(() => {
      expect(result.current.companion).toEqual({
        availability: {
          kind: 'interactive',
        },
        candidates: {
          items: ['WH-002', 'WH-003'],
          keepCurrent: true,
        },
      })
    })

    currentOrder.items = [
      { id: 'row-2', warehouseId: 'WH-002' },
      { id: 'row-1', warehouseId: 'WH-001' },
    ]
    await act(async () => {
      result.current.form.dispatchers.swapRows()
    })

    await waitFor(() => {
      expect(result.current.companion).toEqual({
        availability: {
          kind: 'interactive',
        },
        candidates: {
          items: ['WH-002', 'WH-003'],
          keepCurrent: true,
        },
      })
    })
  })

})
