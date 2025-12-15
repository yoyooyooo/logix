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
import { useImportedModule } from "../../src/hooks/useImportedModule.js"

const Child = Logix.Module.make("useImportedModuleChild", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const Parent = Logix.Module.make("useImportedModuleParent", {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: { noop: Schema.Void },
})

const ParentImpl = Parent.implement({
  initial: { ok: true },
  imports: [
    Child.implement({
      initial: { count: 0 },
    }),
  ],
})

const runtime = Logix.Runtime.make(ParentImpl)

describe("useImportedModule", () => {
  it("resolves child runtime from the same parent instance scope", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(() => {
      const host = useModule(ParentImpl, { key: "host-a-1" })
      const child = host.imports.get(Child)
      const count = useSelector(child, (s: any) => s.count)
      const dispatch = useDispatch(child)
      return { host, child, count, dispatch }
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

  it("host.imports.get returns a stable ModuleRef (no need for useMemo in render)", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    let first: unknown

    const { result } = renderHook(() => {
      const host = useModule(ParentImpl, { key: "host-stable-ref" })
      const child = host.imports.get(Child)
      const childAgain = host.imports.get(Child)
      const dispatch = useDispatch(child)
      const count = useSelector(child, (s: any) => s.count)

      first ??= child

      return {
        count,
        dispatch,
        sameWithinRender: child === childAgain,
        sameAcrossRenders: child === first,
      }
    }, { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
      expect(result.current.sameWithinRender).toBe(true)
      expect(result.current.sameAcrossRenders).toBe(true)
    })

    await act(async () => {
      result.current.dispatch({ _tag: "inc", payload: undefined } as any)
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
      expect(result.current.sameWithinRender).toBe(true)
      expect(result.current.sameAcrossRenders).toBe(true)
    })
  })

  it("keeps child instances isolated across different parent keys", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result: a } = renderHook(() => {
      const host = useModule(ParentImpl, { key: "host-a-2" })
      const child = host.imports.get(Child)
      const count = useSelector(child, (s: any) => s.count)
      const dispatch = useDispatch(child)
      return { count, dispatch }
    }, { wrapper })

    const { result: b } = renderHook(() => {
      const host = useModule(ParentImpl, { key: "host-b-2" })
      const child = host.imports.get(Child)
      const count = useSelector(child, (s: any) => s.count)
      return { count }
    }, { wrapper })

    await waitFor(() => {
      expect(a.current.count).toBe(0)
      expect(b.current.count).toBe(0)
    })

    await act(async () => {
      a.current.dispatch({ _tag: "inc", payload: undefined } as any)
    })

    await waitFor(() => {
      expect(a.current.count).toBe(1)
      expect(b.current.count).toBe(0)
    })
  })

  it("resolves child runtime from the root singleton host runtime", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(() => {
      const host = useModule(Parent)
      const child = useImportedModule(host.runtime, Child)
      const count = useSelector(child, (s: any) => s.count)
      const dispatch = useDispatch(child)
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

  it("throws a readable error when child module is not imported (strict)", async () => {
    const ParentNoImport = Logix.Module.make("useImportedModuleParentNoImport", {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const ParentNoImportImpl = ParentNoImport.implement({
      initial: { ok: true },
    })

    const localRuntime = Logix.Runtime.make(ParentNoImportImpl)

    try {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RuntimeProvider runtime={localRuntime}>{children}</RuntimeProvider>
      )

      let thrown: any
      try {
        renderHook(() => {
          const host = useModule(ParentNoImportImpl, { key: "missing-import" })
          host.imports.get(Child)
          return null
        }, { wrapper })
      } catch (e) {
        thrown = e
      }

      expect(thrown).toBeInstanceOf(Error)
      expect(thrown.name).toBe("MissingImportedModuleError")
      expect(thrown.tokenId).toBe("useImportedModuleChild")
      expect(thrown.entrypoint).toBe("react.useImportedModule/imports.get")
      expect(thrown.mode).toBe("strict")
      expect(thrown.startScope).toEqual({
        moduleId: "useImportedModuleParentNoImport",
        runtimeId: expect.any(String),
      })
      expect(String(thrown.message)).toContain("fix:")
      expect(String(thrown.message)).toContain("imports: [useImportedModuleChild.impl]")
      expect(Array.isArray(thrown.fix)).toBe(true)
    } finally {
      await localRuntime.dispose()
    }
  })
})
