import { describe, it, expect } from "vitest"
// @vitest-environment happy-dom
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { Schema, ManagedRuntime, Layer } from "effect"
import * as Logix from "@logix/core"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import { useModule } from "../../src/hooks/useModule.js"

const Counter = Logix.Module.make("useModuleImplVsTagCounter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { noop: Schema.Void },
})

const CounterImpl = Counter.implement({
  initial: { count: 0 },
})

describe("useModule(ModuleImpl) vs useModule(ModuleTag)", () => {
  it("ModuleImpl mode must not silently reuse root singleton runtime", async () => {
    const runtime = ManagedRuntime.make(
      Counter.live({ count: 0 }).pipe(Layer.mergeAll) as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(() => {
      const singleton = useModule(Counter)
      const local = useModule(CounterImpl)
      return {
        singletonId: singleton.runtime.id,
        localId: local.runtime.id,
        sameRuntime: singleton.runtime === local.runtime,
      }
    }, { wrapper })

    await waitFor(() => {
      expect(typeof result.current.singletonId).toBe("string")
      expect(typeof result.current.localId).toBe("string")
      expect(result.current.sameRuntime).toBe(false)
    })

    await runtime.dispose()
  })
})

