import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { Effect, Fiber, Layer } from "effect"
import { FetchHttpClient } from "@effect/platform"
import {
  RegionServiceMockLive,
  RegionServiceHttpLive
} from "../services/RegionService"
import {
  RegionCascadeStore,
  RegionCascadeStoreLive,
  type RegionCascadeStoreService
} from "../stores/RegionCascadeStore"

type StoreInstance = RegionCascadeStoreService

const StoreContext = createContext<StoreInstance | null>(null)

export function EffectProvider(props: { children: ReactNode }) {
  const { children } = props
  const [store, setStore] = useState<StoreInstance | null>(null)

  useEffect(() => {
    console.log("[EffectProvider] Initializing store...")

    const useRealApi = false

    const RegionServiceLayer = useRealApi
      ? Layer.provide(RegionServiceHttpLive, FetchHttpClient.layer)
      : RegionServiceMockLive

    const StoreLayer = Layer.provide(RegionCascadeStoreLive, RegionServiceLayer)

    const program = Effect.gen(function* () {
      const storeInstance = yield* RegionCascadeStore
      yield* Effect.sync(() => {
        console.log("[EffectProvider] Store created", storeInstance)
        setStore(storeInstance)
      })
      yield* Effect.never
    })

    const scopedRuntime = Effect.scoped(
      program.pipe(
        Effect.provide(StoreLayer),
        Effect.catchAll((error) =>
          Effect.sync(() =>
            console.error("[EffectProvider] Failed to create store", error)
          )
        )
      )
    )

    const fiber = Effect.runFork(scopedRuntime)

    return () => {
      console.log("[EffectProvider] Cleaning up store runtime")
      Effect.runFork(Fiber.interrupt(fiber))
    }
  }, [])

  if (!store) {
    console.log("[EffectProvider] Store not ready, showing loading...")
    return <div>正在初始化...</div>
  }

  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) {
    throw new Error("useStore must be used within EffectProvider")
  }
  return store
}

