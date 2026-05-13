import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '@logixjs/form'
import { RuntimeProvider, useModule, useSelector } from '@logixjs/react'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const waitForExpect = async (assertion: () => void): Promise<void> => {
  const started = Date.now()
  let lastError: unknown

  while (Date.now() - started < 1200) {
    try {
      assertion()
      return
    } catch (error) {
      lastError = error
    }

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
  }

  if (lastError) throw lastError
  assertion()
}

describe('Form.Companion exact primitive through React host gate', () => {
  it('reads Form.Companion.field(path) through useSelector without a React-owned helper', async () => {
    const module = Logix.Program.make(
      Logix.Module.make('exampleFormCompanionFieldHostGateModule', {
        state: Schema.Struct({
          ui: Schema.Unknown,
        }),
        actions: {
          setCompanion: Schema.Void,
        },
        reducers: {
          setCompanion: Logix.Module.Reducer.mutate((draft: any) => {
            draft.ui = {
              ...(draft.ui ?? {}),
              profileResource: {
                $companion: {
                  availability: {
                    kind: 'interactive',
                  },
                  candidates: {
                    items: ['p1'],
                    keepCurrent: true,
                  },
                },
              },
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
    let root: Root | undefined
    let formHandle: any
    let companion: unknown

    const CompanionReader = () => {
      const form = useModule(module)
      formHandle = form
      companion = useSelector(form, Form.Companion.field('profileResource') as any)
      return null
    }

    await act(async () => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)
      root.render(
        <RuntimeProvider runtime={runtime}>
          <CompanionReader />
        </RuntimeProvider>,
      )
    })

    expect(companion).toBeUndefined()

    await act(async () => {
      formHandle?.dispatchers.setCompanion()
    })

    expect(companion).toEqual({
      availability: {
        kind: 'interactive',
      },
      candidates: {
        items: ['p1'],
        keepCurrent: true,
      },
    })

    await act(async () => {
      root?.unmount()
    })
  })

  it('keeps byRowId command writes and byRowId companion reads on the same owner after a trackBy roster swap', async () => {
    const RowSchema = Schema.Struct({
      id: Schema.String,
      warehouseId: Schema.String,
    })
    const ValuesSchema = Schema.Struct({
      items: Schema.Array(RowSchema),
    })

    const module = Form.make(
      'Form.Companion.HostGate.TrackByRosterSwap',
      {
        values: ValuesSchema,
        initialValues: {
          items: [
            { id: 'row-1', warehouseId: 'WH-001' },
            { id: 'row-2', warehouseId: 'WH-002' },
          ],
        },
      },
      (form) => {
        form.list('items', {
          identity: { mode: 'trackBy', trackBy: 'id' },
        })
        form.field('items.warehouseId').companion({
          deps: ['items.warehouseId'],
          lower: (ctx) => ({
            availability: { kind: 'interactive' },
            candidates: {
              items: [ctx.value],
            },
          }),
        })
      },
    )

    const runtime = Logix.Runtime.make(module)
    let root: Root | undefined
    let formHandle: any
    let companion: unknown

    const CompanionReader = () => {
      const form = useModule(module)
      formHandle = form
      companion = useSelector(form, Form.Companion.byRowId('items', 'row-2', 'warehouseId') as any)
      return null
    }

    await act(async () => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)
      root.render(
        <RuntimeProvider runtime={runtime}>
          <CompanionReader />
        </RuntimeProvider>,
      )
    })

    await act(async () => {
      await Effect.runPromise(formHandle.field('items.1.warehouseId').set('WH-002'))
    })

    await waitForExpect(() => {
      expect(companion).toEqual({
        availability: {
          kind: 'interactive',
        },
        candidates: {
          items: ['WH-002'],
        },
      })
    })

    await act(async () => {
      await Effect.runPromise(formHandle.fieldArray('items').swap(0, 1))
    })

    await waitForExpect(() => {
      expect(companion).toEqual({
        availability: {
          kind: 'interactive',
        },
        candidates: {
          items: ['WH-002'],
        },
      })
    })

    await act(async () => {
      await Effect.runPromise(
        formHandle.fieldArray('items').byRowId('row-2').update({
          id: 'row-2',
          warehouseId: 'WH-022',
        }),
      )
    })

    await waitForExpect(() => {
      expect(companion).toEqual({
        availability: {
          kind: 'interactive',
        },
        candidates: {
          items: ['WH-022'],
        },
      })
    })

    await act(async () => {
      root?.unmount()
    })
  })

  it('routes nested row companion reads by nested rowId across outer reorder and exits after outer replace', async () => {
    const AllocationSchema = Schema.Struct({
      id: Schema.String,
      dept: Schema.String,
    })
    const RowSchema = Schema.Struct({
      id: Schema.String,
      allocations: Schema.Array(AllocationSchema),
    })
    const ValuesSchema = Schema.Struct({
      items: Schema.Array(RowSchema),
    })

    const module = Form.make(
      'Form.Companion.HostGate.NestedRowOwner',
      {
        values: ValuesSchema,
        initialValues: {
          items: [
            {
              id: 'item-1',
              allocations: [{ id: 'alloc-1', dept: 'QA' }],
            },
            {
              id: 'item-2',
              allocations: [{ id: 'alloc-2', dept: 'OPS' }],
            },
          ],
        },
      },
      (form) => {
        form.list('items', {
          identity: { mode: 'trackBy', trackBy: 'id' },
        })
        form.list('items.allocations', {
          identity: { mode: 'trackBy', trackBy: 'id' },
        })
        form.field('items.allocations.dept').companion({
          deps: ['items.allocations.dept'],
          lower: (ctx) => ({
            availability: { kind: 'interactive' },
            candidates: {
              items: [ctx.value],
            },
          }),
        })
      },
    )

    const runtime = Logix.Runtime.make(module)
    let root: Root | undefined
    let formHandle: any
    let companion: unknown

    const CompanionReader = () => {
      const form = useModule(module)
      formHandle = form
      companion = useSelector(form, Form.Companion.byRowId('items.allocations', 'alloc-1', 'dept') as any)
      return null
    }

    await act(async () => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)
      root.render(
        <RuntimeProvider runtime={runtime}>
          <CompanionReader />
        </RuntimeProvider>,
      )
    })

    await waitForExpect(() => {
      expect(companion).toEqual({
        availability: {
          kind: 'interactive',
        },
        candidates: {
          items: ['QA'],
        },
      })
    })

    await act(async () => {
      await Effect.runPromise(formHandle.fieldArray('items').swap(0, 1))
    })

    await waitForExpect(() => {
      expect(companion).toEqual({
        availability: {
          kind: 'interactive',
        },
        candidates: {
          items: ['QA'],
        },
      })
    })

    await act(async () => {
      await Effect.runPromise(
        formHandle.fieldArray('items').replace([
          {
            id: 'item-x',
            allocations: [{ id: 'alloc-x', dept: 'FIN' }],
          },
        ]),
      )
    })

    await waitForExpect(() => {
      expect(companion).toBeUndefined()
    })

    await act(async () => {
      root?.unmount()
    })
  })

  it('does not choose an arbitrary nested owner when nested rowId is duplicated across outer rows', async () => {
    const AllocationSchema = Schema.Struct({
      id: Schema.String,
      dept: Schema.String,
    })
    const RowSchema = Schema.Struct({
      id: Schema.String,
      allocations: Schema.Array(AllocationSchema),
    })
    const ValuesSchema = Schema.Struct({
      items: Schema.Array(RowSchema),
    })

    const module = Form.make(
      'Form.Companion.HostGate.NestedDuplicateRowOwner',
      {
        values: ValuesSchema,
        initialValues: {
          items: [
            {
              id: 'item-1',
              allocations: [{ id: 'alloc-shared', dept: 'QA' }],
            },
            {
              id: 'item-2',
              allocations: [{ id: 'alloc-shared', dept: 'OPS' }],
            },
          ],
        },
      },
      (form) => {
        form.list('items', {
          identity: { mode: 'trackBy', trackBy: 'id' },
        })
        form.list('items.allocations', {
          identity: { mode: 'trackBy', trackBy: 'id' },
        })
        form.field('items.allocations.dept').companion({
          deps: ['items.allocations.dept'],
          lower: (ctx) => ({
            availability: { kind: 'interactive' },
            candidates: {
              items: [ctx.value],
            },
          }),
        })
      },
    )

    const runtime = Logix.Runtime.make(module)
    let root: Root | undefined
    let companion: unknown

    const CompanionReader = () => {
      const form = useModule(module)
      companion = useSelector(form, Form.Companion.byRowId('items.allocations', 'alloc-shared', 'dept') as any)
      return null
    }

    await act(async () => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)
      root.render(
        <RuntimeProvider runtime={runtime}>
          <CompanionReader />
        </RuntimeProvider>,
      )
    })

    await waitForExpect(() => {
      expect(companion).toBeUndefined()
    })

    await act(async () => {
      root?.unmount()
    })
  })

  it('does not let stale row companion reads hit replacement rows after remove or replace', async () => {
    const RowSchema = Schema.Struct({
      id: Schema.String,
      warehouseId: Schema.String,
    })
    const ValuesSchema = Schema.Struct({
      items: Schema.Array(RowSchema),
    })

    const module = Form.make(
      'Form.Companion.HostGate.StaleRowExit',
      {
        values: ValuesSchema,
        initialValues: {
          items: [
            { id: 'row-1', warehouseId: 'WH-001' },
            { id: 'row-2', warehouseId: 'WH-002' },
          ],
        },
      },
      (form) => {
        form.list('items', {
          identity: { mode: 'trackBy', trackBy: 'id' },
        })
        form.field('items.warehouseId').companion({
          deps: ['items.warehouseId'],
          lower: (ctx) => ({
            availability: { kind: 'interactive' },
            candidates: {
              items: [ctx.value],
            },
          }),
        })
      },
    )

    const runtime = Logix.Runtime.make(module)
    let root: Root | undefined
    let formHandle: any
    let staleCompanion: unknown

    const CompanionReader = () => {
      const form = useModule(module)
      formHandle = form
      staleCompanion = useSelector(form, Form.Companion.byRowId('items', 'row-1', 'warehouseId') as any)
      return null
    }

    await act(async () => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)
      root.render(
        <RuntimeProvider runtime={runtime}>
          <CompanionReader />
        </RuntimeProvider>,
      )
    })

    await act(async () => {
      await Effect.runPromise(formHandle.field('items.0.warehouseId').set('WH-001'))
    })

    await waitForExpect(() => {
      expect(staleCompanion).toEqual({
        availability: {
          kind: 'interactive',
        },
        candidates: {
          items: ['WH-001'],
        },
      })
    })

    await act(async () => {
      await Effect.runPromise(formHandle.fieldArray('items').byRowId('row-1').remove())
    })

    await waitForExpect(() => {
      expect(staleCompanion).toBeUndefined()
    })

    await act(async () => {
      await Effect.runPromise(
        formHandle.fieldArray('items').replace([
          { id: 'row-x', warehouseId: 'WH-099' },
          { id: 'row-y', warehouseId: 'WH-100' },
        ]),
      )
    })

    await waitForExpect(() => {
      expect(staleCompanion).toBeUndefined()
    })

    await act(async () => {
      root?.unmount()
    })
  })
})
