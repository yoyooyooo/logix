import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { act, render, waitFor } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'
import { RuntimeProvider, fieldValue, useImportedModule, useModule, useSelector } from '../../src/index.js'

const DetailChild = Logix.Module.make('useSelectorBusinessMasterDetail.DetailChild', {
  state: Schema.Struct({
    selectedId: Schema.String,
    detail: Schema.Struct({
      title: Schema.String,
      notes: Schema.String,
    }),
  }),
  actions: {
    setTitle: Schema.String,
    setNotes: Schema.String,
  },
  reducers: {
    setTitle: Logix.Module.Reducer.mutate((draft, payload: string) => {
      draft.detail.title = payload
    }),
    setNotes: Logix.Module.Reducer.mutate((draft, payload: string) => {
      draft.detail.notes = payload
    }),
  },
})

const MasterHost = Logix.Module.make('useSelectorBusinessMasterDetail.MasterHost', {
  state: Schema.Struct({
    panel: Schema.String,
  }),
  actions: {},
})

const DetailProgram = Logix.Program.make(DetailChild, {
  initial: {
    selectedId: 'customer-1',
    detail: {
      title: 'Customer One',
      notes: 'initial notes',
    },
  },
})

const MasterProgram = Logix.Program.make(MasterHost, {
  initial: {
    panel: 'detail',
  },
  capabilities: {
    imports: [DetailProgram],
  },
})

describe('useSelector business witness: master-detail imported child', () => {
  it('keeps imported child detail selectors independent by field path', async () => {
    const runtime = Logix.Runtime.make(MasterProgram)
    const renders = {
      title: 0,
      notes: 0,
    }
    let detailRef: any

    const TitlePane = () => {
      renders.title += 1
      const host = useModule(MasterHost.tag)
      const detail = useImportedModule(host.runtime, DetailChild.tag)
      detailRef = detail
      const title = useSelector(detail, fieldValue('detail.title'))
      return <span data-testid="detail-title">{String(title)}</span>
    }

    const NotesPane = () => {
      renders.notes += 1
      const host = useModule(MasterHost.tag)
      const detail = useImportedModule(host.runtime, DetailChild.tag)
      const notes = useSelector(detail, fieldValue('detail.notes'))
      return <span data-testid="detail-notes">{String(notes)}</span>
    }

    const view = render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <TitlePane />
        <NotesPane />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(view.getByTestId('detail-title').textContent).toBe('Customer One')
      expect(view.getByTestId('detail-notes').textContent).toBe('initial notes')
    })

    const baselineNotes = renders.notes

    await act(async () => {
      detailRef!.dispatchers.setTitle('Customer One Updated')
    })

    await waitFor(() => {
      expect(view.getByTestId('detail-title').textContent).toBe('Customer One Updated')
    })

    expect(renders.notes).toBe(baselineNotes)
  })
})
