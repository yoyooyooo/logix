import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
// @vitest-environment happy-dom
import React from "react"
import { renderHook, act } from "@testing-library/react"
import * as Logix from "@logix/core"
import { Schema } from "effect"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import { useModule } from "../../src/hooks/useModule.js"

const Child = Logix.Module.make("ImportsScopeCleanupChild", {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: { noop: Schema.Void },
})

const Parent = Logix.Module.make("ImportsScopeCleanupParent", {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: { noop: Schema.Void },
})

const ParentImpl = Parent.implement({
  initial: { ok: true },
  imports: [
    Child.implement({
      initial: { ok: true },
    }),
  ],
})

describe("ImportsScope cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("clears runtime.__importsScope when a local ModuleRuntime is GC'ed after unmount", async () => {
    const runtime = Logix.Runtime.make(ParentImpl)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    let capturedHost: Logix.ModuleRuntime<any, any> | undefined
    let capturedChild: Logix.ModuleRuntime<any, any> | undefined

    const { unmount } = renderHook(() => {
      const host = useModule(ParentImpl, { key: "cleanup-host", gcTime: 10 })
      const child = host.imports.get(Child)
      capturedHost = host.runtime
      capturedChild = child.runtime
      return null
    }, { wrapper })

    expect(capturedHost).toBeDefined()
    expect(capturedChild).toBeDefined()

    const hostImportsScopeBefore = (capturedHost as any).__importsScope
    expect(hostImportsScopeBefore).toBeDefined()
    expect(hostImportsScopeBefore.get(Child)).toBe(capturedChild)

    const childImportsScopeBefore = (capturedChild as any).__importsScope
    expect(childImportsScopeBefore).toBeDefined()

    unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    expect((capturedHost as any).__importsScope).toBeUndefined()
    expect((capturedChild as any).__importsScope).toBeUndefined()

    await runtime.dispose()
  })
})
