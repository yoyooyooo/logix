// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { Effect, Schema, Layer } from 'effect'
import * as Logix from '@logixjs/core'
import { clearDevtoolsEvents, devtoolsLayer, getDevtoolsSnapshot } from '../../src/DevtoolsLayer.js'

const Source = Logix.Module.make('DevtoolsProcessEventsSource', {
  state: Schema.Struct({ n: Schema.Number }),
  actions: { ping: Schema.Void },
  reducers: {
    ping: Logix.Module.Reducer.mutate((draft) => {
      draft.n += 1
    }),
  },
})

const Root = Logix.Module.make('DevtoolsProcessEventsRoot', {
  state: Schema.Void,
  actions: {},
})

const PING_ACTION = { _tag: 'ping', payload: undefined } as const

const Proc = Logix.Process.make(
  {
    processId: 'DevtoolsProcessEvents',
    requires: [Source.id],
    triggers: [{ kind: 'moduleAction', moduleId: Source.id, actionId: 'ping' }],
    concurrency: { mode: 'latest' },
    errorPolicy: { mode: 'failStop' },
    diagnosticsLevel: 'light',
  },
  Effect.void,
)

const RootImpl = Root.implement({
  initial: undefined,
  imports: [Source.implement({ initial: { n: 0 } }).impl],
  processes: [Proc],
})

describe('@logixjs/devtools-react: process:* events', () => {
  beforeEach(() => {
    clearDevtoolsEvents()
  })

  it('captures process:* events in snapshot', async () => {
    const runtime = Logix.Runtime.make(RootImpl, {
      label: 'DevtoolsProcessEventsIntegrationRuntime',
      layer: devtoolsLayer as Layer.Layer<any, never, never>,
    })

    try {
      await runtime.runPromise(
        Effect.gen(function* () {
          yield* Root.tag
          const source: any = yield* Source.tag
          yield* Effect.yieldNow()
          yield* source.dispatch(PING_ACTION as any)
          yield* Effect.yieldNow()
        }) as any,
      )

      await waitFor(() => {
        const snapshot = getDevtoolsSnapshot()
        const processEvents = snapshot.events.filter((e: any) => e.kind === 'process' && typeof e.label === 'string')
        expect(processEvents.length).toBeGreaterThan(0)
        expect(processEvents.some((e: any) => e.label.startsWith('process:'))).toBe(true)
      })
    } finally {
      await runtime.dispose()
    }
  })
})
