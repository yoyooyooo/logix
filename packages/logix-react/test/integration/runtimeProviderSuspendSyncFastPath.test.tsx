import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule, useSelector } from '../../src/Hooks.js'
import { useProgramRuntimeBlueprint } from '../../src/internal/hooks/useProgramRuntimeBlueprint.js'

const State = Schema.Struct({ count: Schema.Number })
const Actions = { inc: Schema.Void }

const ProgramModule = Logix.Module.make('RuntimeProviderSuspendSyncFastPath.Program', {
  state: State,
  actions: Actions,
})
const TagModule = Logix.Module.make('RuntimeProviderSuspendSyncFastPath.Tag', {
  state: State,
  actions: Actions,
})

const LocalProgram = Logix.Program.make(ProgramModule, { initial: { count: 0 }, logics: [] })
const LocalBlueprint = RuntimeContracts.getProgramRuntimeBlueprint(LocalProgram)
const TagModuleProgram = Logix.Program.make(TagModule, { initial: { count: 0 }, logics: [] })

const App: React.FC = () => {
  const local = useProgramRuntimeBlueprint(LocalBlueprint)
  const localCount = useSelector(local, (s) => (s as { count: number }).count)

  const tag = useModule(TagModule.tag)
  const tagCount = useSelector(tag, (s) => (s as { count: number }).count)

  return (
    <div>
      <span data-testid="program">{localCount}</span>
      <span data-testid="tag">{tagCount}</span>
    </div>
  )
}

describe('RuntimeProvider suspend optimistic sync fast-path', () => {
  it('should render sync Program + ModuleTag without entering Suspense fallback', async () => {
    const runtime = Logix.Runtime.make(TagModuleProgram, {
      layer: CoreDebug.noopLayer,
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
    expect(screen.getByTestId('program').textContent).toBe('0')
    expect(screen.getByTestId('tag').textContent).toBe('0')

    await act(async () => {
      await runtime.dispose()
    })
  })


  it('should skip provider gating fallback in defer+preload when handles are sync-resolvable', async () => {
    const runtime = Logix.Runtime.make(TagModuleProgram, {
      layer: CoreDebug.noopLayer,
    })

    await act(async () => {
      render(
        <RuntimeProvider
          runtime={runtime}
          policy={{ mode: 'defer', syncBudgetMs: 1000, preload: [LocalProgram, TagModule.tag] }}
          fallback={<div data-testid="fallback">fallback</div>}
        >
          <App />
        </RuntimeProvider>,
      )
    })

    expect(screen.queryByTestId('fallback')).toBeNull()
    expect(screen.getByTestId('program').textContent).toBe('0')
    expect(screen.getByTestId('tag').textContent).toBe('0')

    await act(async () => {
      await runtime.dispose()
    })
  })
})
