import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook } from '@testing-library/react'
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

const Counter = Logix.Module.make('LegacyUseModuleInputCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {},
})

const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
})

describe('useModule legacy public inputs', () => {
  it('throws a guidance error for module-object input', () => {
    const runtime = Logix.Runtime.make(CounterProgram)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    expect(() => renderHook(() => useModule(Counter as any), { wrapper })).toThrow(/ModuleTag|Program/)
  })

  it('throws a guidance error for ProgramRuntimeBlueprint input', () => {
    const runtime = Logix.Runtime.make(CounterProgram)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    expect(() => renderHook(() => useModule(RuntimeContracts.getProgramRuntimeBlueprint(CounterProgram) as any), { wrapper })).toThrow(/Program/)
  })
})
