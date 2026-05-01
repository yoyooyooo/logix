import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
// @vitest-environment happy-dom

import React from 'react'
import { render, waitFor, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule, useSelector } from '../../src/index.js'
import { useProgramRuntimeBlueprint } from '../../src/internal/hooks/useProgramRuntimeBlueprint.js'

const State = Schema.Struct({ count: Schema.Number })
const Actions = { inc: Schema.Void }

const ProgramModule = Logix.Module.make('ReactBootResolvePhaseTrace.Program', { state: State, actions: Actions })
const TagModule = Logix.Module.make('ReactBootResolvePhaseTrace.Tag', { state: State, actions: Actions })

const LocalProgram = Logix.Program.make(ProgramModule, { initial: { count: 0 }, logics: [] })
const LocalBlueprint = RuntimeContracts.getProgramRuntimeBlueprint(LocalProgram)
const TagModuleProgram = Logix.Program.make(TagModule, { initial: { count: 0 }, logics: [] })

const App: React.FC = () => {
  const local = useProgramRuntimeBlueprint(LocalBlueprint, { key: 'shared' })
  const localCount = useSelector(local, (s) => (s as { count: number }).count)

  const tag = useModule(TagModule.tag)
  const tagCount = useSelector(tag, (s) => (s as { count: number }).count)

  return (
    <div>
      <p>Program: {localCount}</p>
      <p>Tag: {tagCount}</p>
    </div>
  )
}

afterEach(() => {
  cleanup()
})

describe('RuntimeProvider bootResolve phase traces', () => {
  it('emits provider gating and moduleTag resolve durations', async () => {
    const events: CoreDebug.Event[] = []

    const debugLayer = Layer.mergeAll(
      CoreDebug.diagnosticsLevel('light'),
      CoreDebug.replace([
        {
          record: (event: CoreDebug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        },
      ]) as Layer.Layer<any, never, never>,
    ) as Layer.Layer<any, never, never>

    const runtime = Logix.Runtime.make(TagModuleProgram, {
      layer: debugLayer,
    })

    render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <App />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(document.body.textContent).toContain('Program: 0')
      expect(document.body.textContent).toContain('Tag: 0')
    })

    await waitFor(() => {
      const providerGating = events.find((event) => event.type === 'trace:react.provider.gating') as any
      const configSnapshot = events.find(
        (event) => event.type === 'trace:react.runtime.config.snapshot' && (event as any).data?.mode === 'sync',
      ) as any
      const programResolve = events.find((event) => event.type === 'trace:react.program.resolve') as any
      const tagResolve = events.find((event) => event.type === 'trace:react.moduleTag.resolve') as any
      const programInit = events.find(
        (event) => event.type === 'trace:react.module.init' && event.moduleId === ProgramModule.id,
      ) as any
      const tagInit = events.find(
        (event) => event.type === 'trace:react.module.init' && event.moduleId === TagModule.id,
      ) as any

      expect(typeof providerGating?.data?.durationMs).toBe('number')
      expect(typeof providerGating?.data?.effectDelayMs).toBe('number')
      expect(providerGating?.data?.policyMode).toBe('sync')

      expect(typeof configSnapshot?.data?.durationMs).toBe('number')
      expect(configSnapshot?.data?.mode).toBe('sync')

      expect(typeof programResolve?.data?.durationMs).toBe('number')
      expect(programResolve?.data?.cacheMode).toBe('sync')

      expect(typeof tagResolve?.data?.durationMs).toBe('number')
      expect(tagResolve?.data?.cacheMode).toBe('sync')

      expect(typeof programInit?.data?.durationMs).toBe('number')
      expect(typeof tagInit?.data?.durationMs).toBe('number')
    })

    await runtime.dispose()
  })
})
