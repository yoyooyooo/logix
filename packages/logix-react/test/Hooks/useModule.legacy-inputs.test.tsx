import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { render, waitFor } from '@testing-library/react'
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

class CaptureBoundary extends React.Component<
  { readonly children: React.ReactNode; readonly onError: (error: unknown) => void },
  { readonly error: unknown }
> {
  state = { error: undefined }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error)
  }

  render() {
    return this.state.error ? null : this.props.children
  }
}

const UseModuleProbe = ({ input }: { readonly input: unknown }) => {
  useModule(input as any)
  return null
}

const expectUseModuleInputError = async (input: unknown, message: RegExp): Promise<void> => {
  const runtime = Logix.Runtime.make(CounterProgram)
  let captured: unknown
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
  )

  render(
    <CaptureBoundary onError={(error) => {
      captured = error
    }}>
      <UseModuleProbe input={input} />
    </CaptureBoundary>,
    { wrapper },
  )

  await waitFor(() => {
    expect(captured).toBeInstanceOf(Error)
  })
  expect((captured as Error).message).toMatch(message)
}

describe('useModule legacy public inputs', () => {
  it('throws a guidance error for module-object input', async () => {
    await expectUseModuleInputError(Counter, /ModuleTag|Program/)
  })

  it('throws a guidance error for ProgramRuntimeBlueprint input', async () => {
    await expectUseModuleInputError(RuntimeContracts.getProgramRuntimeBlueprint(CounterProgram), /Program/)
  })
})
