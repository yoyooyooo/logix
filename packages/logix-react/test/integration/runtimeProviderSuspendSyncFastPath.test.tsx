import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

const State = Schema.Struct({ count: Schema.Number })
const Actions = { inc: Schema.Void }

const ImplModule = Logix.Module.make('RuntimeProviderSuspendSyncFastPath.Impl', {
  state: State,
  actions: Actions,
})
const TagModule = Logix.Module.make('RuntimeProviderSuspendSyncFastPath.Tag', {
  state: State,
  actions: Actions,
})

const ImplModuleImpl = ImplModule.implement({ initial: { count: 0 }, logics: [] }).impl
const TagModuleImpl = TagModule.implement({ initial: { count: 0 }, logics: [] }).impl

const App: React.FC = () => {
  const impl = useModule(ImplModuleImpl)
  const implCount = useModule(impl, (s) => (s as { count: number }).count)

  const tag = useModule(TagModule.tag)
  const tagCount = useModule(tag, (s) => (s as { count: number }).count)

  return (
    <div>
      <span data-testid="impl">{implCount}</span>
      <span data-testid="tag">{tagCount}</span>
    </div>
  )
}

describe('RuntimeProvider suspend optimistic sync fast-path', () => {
  it('should render sync ModuleImpl + ModuleTag without entering Suspense fallback', async () => {
    const runtime = Logix.Runtime.make(TagModuleImpl, {
      layer: Logix.Debug.noopLayer,
    })

    await act(async () => {
      render(
        <RuntimeProvider
          runtime={runtime}
          policy={{ mode: 'suspend', syncBudgetMs: 1000 }}
          fallback={<div data-testid="fallback">fallback</div>}
        >
          <App />
        </RuntimeProvider>,
      )
    })

    expect(screen.queryByTestId('fallback')).toBeNull()
    expect(screen.getByTestId('impl').textContent).toBe('0')
    expect(screen.getByTestId('tag').textContent).toBe('0')

    await act(async () => {
      await runtime.dispose()
    })
  })
})
