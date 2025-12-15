import { describe, it, expect } from "vitest"
// @vitest-environment happy-dom
import React from "react"
import { renderHook, waitFor, act } from "@testing-library/react"
import * as Logix from "@logix/core"
import { Schema } from "effect"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import { useModule } from "../../src/hooks/useModule.js"
import { useDispatch } from "../../src/hooks/useDispatch.js"
import { useSelector } from "../../src/hooks/useSelector.js"

const GrandChild = Logix.Module.make("useImportedModuleGrandChild", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const Child = Logix.Module.make("useImportedModuleChildHier", {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: { noop: Schema.Void },
})

const Host = Logix.Module.make("useImportedModuleHostHier", {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: { noop: Schema.Void },
})

const ChildImpl = Child.implement({
  initial: { ok: true },
  imports: [
    GrandChild.implement({
      initial: { count: 0 },
    }),
  ],
})

const HostImpl = Host.implement({
  initial: { ok: true },
  imports: [ChildImpl],
})

const runtime = Logix.Runtime.make(HostImpl)

describe("useImportedModule (hierarchical)", () => {
  it("resolves grandchild through child.imports.get (local host)", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(() => {
      const host = useModule(HostImpl, { key: "host-local" })
      const child = host.imports.get(Child)
      const grand = child.imports.get(GrandChild)
      const count = useSelector(grand, (s: any) => s.count)
      const dispatch = useDispatch(grand)
      return { count, dispatch }
    }, { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
    })

    await act(async () => {
      result.current.dispatch({ _tag: "inc", payload: undefined } as any)
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })
  })

  it("resolves child imports from root host instance (host = ModuleTag)", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(() => {
      const host = useModule(Host)
      const child = host.imports.get(Child)
      const grand = child.imports.get(GrandChild)
      const count = useSelector(grand, (s: any) => s.count)
      const dispatch = useDispatch(grand)
      return { count, dispatch }
    }, { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
    })

    await act(async () => {
      result.current.dispatch({ _tag: "inc", payload: undefined } as any)
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })
  })
})

