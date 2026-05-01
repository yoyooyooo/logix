import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'
import { useProgramRuntimeBlueprint } from '../../src/internal/hooks/useProgramRuntimeBlueprint.js'

const Child = Logix.Module.make('ImportsScopeCleanupChild', {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: { noop: Schema.Void },
})

const Parent = Logix.Module.make('ImportsScopeCleanupParent', {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: { noop: Schema.Void },
})

const ChildProgram = Logix.Program.make(Child, {
  initial: { ok: true },
  logics: [],
})

const ParentProgram = Logix.Program.make(Parent, {
  initial: { ok: true },
  capabilities: {
    imports: [ChildProgram],
  },
  logics: [],
})

describe('ImportsScope cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("clears imports-scope mappings when a local ModuleRuntime is GC'ed after unmount", async () => {
    const runtime = Logix.Runtime.make(ParentProgram)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    let capturedHost: Logix.ModuleRuntime<any, any> | undefined
    let capturedChild: Logix.ModuleRuntime<any, any> | undefined

    const { unmount } = renderHook(
      () => {
        const host = useProgramRuntimeBlueprint(RuntimeContracts.getProgramRuntimeBlueprint(ParentProgram), {
          key: 'cleanup-host',
          gcTime: 10,
        })
        const child = host.imports.get(Child.tag)
        capturedHost = host.runtime
        capturedChild = child.runtime
        return null
      },
      { wrapper },
    )

    expect(capturedHost).toBeDefined()
    expect(capturedChild).toBeDefined()

    const hostImportsScopeBefore = RuntimeContracts.getImportsScope(capturedHost as any)
    expect(hostImportsScopeBefore).toBeDefined()
    expect(hostImportsScopeBefore.get(Child.tag)).toBe(capturedChild)

    const childImportsScopeBefore = RuntimeContracts.getImportsScope(capturedChild as any)
    expect(childImportsScopeBefore).toBeDefined()

    unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    expect(hostImportsScopeBefore.get(Child.tag)).toBeUndefined()
    expect(childImportsScopeBefore.get(Child.tag)).toBeUndefined()

    await runtime.dispose()
  })
})
