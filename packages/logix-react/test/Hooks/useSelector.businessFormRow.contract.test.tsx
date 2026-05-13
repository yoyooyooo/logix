import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { act, render, waitFor } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'
import { RuntimeProvider, fieldValue, useModule, useSelector } from '../../src/index.js'

const FormRows = Logix.Module.make('useSelectorBusinessFormRow.Rows', {
  state: Schema.Struct({
    rows: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        quantity: Schema.Number,
      }),
    ),
    footer: Schema.String,
  }),
  actions: {
    setFirstName: Schema.String,
    setSecondQuantity: Schema.Number,
  },
  reducers: {
    setFirstName: Logix.Module.Reducer.mutate((draft, payload: string) => {
      draft.rows[0]!.name = payload
    }),
    setSecondQuantity: Logix.Module.Reducer.mutate((draft, payload: number) => {
      draft.rows[1]!.quantity = payload
    }),
  },
})

describe('useSelector business witness: form row editing', () => {
  it('updates the edited row projection without waking unrelated row fields', async () => {
    const runtime = Logix.Runtime.make(
      Logix.Program.make(FormRows, {
        initial: {
          rows: [
            { id: 'row-1', name: 'Apple', quantity: 1 },
            { id: 'row-2', name: 'Banana', quantity: 2 },
          ],
          footer: 'ready',
        },
      }),
    )

    const renders = {
      firstName: 0,
      secondQuantity: 0,
      footer: 0,
    }
    let formRef: any

    const FirstNameCell = () => {
      renders.firstName += 1
      const form = useModule(FormRows.tag)
      formRef = form
      const value = useSelector(form, fieldValue('rows.0.name'))
      return <span data-testid="first-name">{String(value)}</span>
    }

    const SecondQuantityCell = () => {
      renders.secondQuantity += 1
      const form = useModule(FormRows.tag)
      const value = useSelector(form, fieldValue('rows.1.quantity'))
      return <span data-testid="second-quantity">{String(value)}</span>
    }

    const FooterCell = () => {
      renders.footer += 1
      const form = useModule(FormRows.tag)
      const value = useSelector(form, fieldValue('footer'))
      return <span data-testid="footer">{String(value)}</span>
    }

    const view = render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <FirstNameCell />
        <SecondQuantityCell />
        <FooterCell />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(view.getByTestId('first-name').textContent).toBe('Apple')
      expect(view.getByTestId('second-quantity').textContent).toBe('2')
      expect(view.getByTestId('footer').textContent).toBe('ready')
    })

    const baselineSecondQuantity = renders.secondQuantity
    const baselineFooter = renders.footer

    await act(async () => {
      formRef!.dispatchers.setFirstName('Apricot')
    })

    await waitFor(() => {
      expect(view.getByTestId('first-name').textContent).toBe('Apricot')
    })

    expect(renders.secondQuantity).toBe(baselineSecondQuantity)
    expect(renders.footer).toBe(baselineFooter)
  })
})
