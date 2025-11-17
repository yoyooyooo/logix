import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import * as Logix from '@logix/core'
import { Schema } from 'effect'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

const Child = Logix.Module.make('ImportsScopeCleanupChild', {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: { noop: Schema.Void },
})

const Parent = Logix.Module.make('ImportsScopeCleanupParent', {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: { noop: Schema.Void },
})

const ParentImpl = Parent.implement({
  initial: { ok: true },
  imports: [
    Child.implement({
      initial: { ok: true },
    }).impl,
  ],
})

describe('ImportsScope cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("clears imports-scope mappings when a local ModuleRuntime is GC'ed after unmount", async () => {
    const runtime = Logix.Runtime.make(ParentImpl)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    let capturedHost: Logix.ModuleRuntime<any, any> | undefined
    let capturedChild: Logix.ModuleRuntime<any, any> | undefined

    const { unmount } = renderHook(
      () => {
        const host = useModule(ParentImpl, { key: 'cleanup-host', gcTime: 10 })
        const child = host.imports.get(Child.tag)
        capturedHost = host.runtime
        capturedChild = child.runtime
        return null
      },
      { wrapper },
    )

    expect(capturedHost).toBeDefined()
    expect(capturedChild).toBeDefined()

    const hostImportsScopeBefore = Logix.InternalContracts.getImportsScope(capturedHost as any)
    expect(hostImportsScopeBefore).toBeDefined()
    expect(hostImportsScopeBefore.get(Child.tag)).toBe(capturedChild)

    const childImportsScopeBefore = Logix.InternalContracts.getImportsScope(capturedChild as any)
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
