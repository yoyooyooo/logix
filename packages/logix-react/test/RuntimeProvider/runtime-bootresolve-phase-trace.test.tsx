// @vitest-environment happy-dom

import React from 'react'
import { render, waitFor, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule } from '../../src/index.js'

const State = Schema.Struct({ count: Schema.Number })
const Actions = { inc: Schema.Void }

const ImplModule = Logix.Module.make('ReactBootResolvePhaseTrace.Impl', { state: State, actions: Actions })
const TagModule = Logix.Module.make('ReactBootResolvePhaseTrace.Tag', { state: State, actions: Actions })

const ImplModuleImpl = ImplModule.implement({ initial: { count: 0 }, logics: [] }).impl
const TagModuleImpl = TagModule.implement({ initial: { count: 0 }, logics: [] }).impl

const App: React.FC = () => {
  const impl = useModule(ImplModuleImpl, { key: 'shared' })
  const implCount = useModule(impl, (s) => (s as { count: number }).count)

  const tag = useModule(TagModule.tag)
  const tagCount = useModule(tag, (s) => (s as { count: number }).count)

  return (
    <div>
      <p>Impl: {implCount}</p>
      <p>Tag: {tagCount}</p>
    </div>
  )
}

afterEach(() => {
  cleanup()
})

describe('RuntimeProvider bootResolve phase traces', () => {
  it('emits provider gating and moduleTag resolve durations', async () => {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Layer.mergeAll(
      Logix.Debug.diagnosticsLevel('light'),
      Logix.Debug.replace([
        {
          record: (event: Logix.Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        },
      ]) as Layer.Layer<any, never, never>,
    ) as Layer.Layer<any, never, never>

    const runtime = Logix.Runtime.make(TagModuleImpl, {
      layer: debugLayer,
    })

    render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <App />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(document.body.textContent).toContain('Impl: 0')
      expect(document.body.textContent).toContain('Tag: 0')
    })

    await waitFor(() => {
      const providerGating = events.find((event) => event.type === 'trace:react.provider.gating') as any
      const configSnapshot = events.find(
        (event) => event.type === 'trace:react.runtime.config.snapshot' && (event as any).data?.mode === 'sync',
      ) as any
      const tagResolve = events.find((event) => event.type === 'trace:react.moduleTag.resolve') as any
      const implInit = events.find(
        (event) => event.type === 'trace:react.module.init' && event.moduleId === ImplModule.id,
      ) as any
      const tagInit = events.find(
        (event) => event.type === 'trace:react.module.init' && event.moduleId === TagModule.id,
      ) as any

      expect(typeof providerGating?.data?.durationMs).toBe('number')
      expect(providerGating?.data?.policyMode).toBe('sync')

      expect(typeof configSnapshot?.data?.durationMs).toBe('number')
      expect(configSnapshot?.data?.mode).toBe('sync')

      expect(typeof tagResolve?.data?.durationMs).toBe('number')
      expect(tagResolve?.data?.cacheMode).toBe('sync')

      expect(typeof implInit?.data?.durationMs).toBe('number')
      expect(typeof tagInit?.data?.durationMs).toBe('number')
    })

    await runtime.dispose()
  })
})
