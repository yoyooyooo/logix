import { describe, expect, it } from "vitest"
import {
  Chunk,
  Effect,
  Fiber,
  Layer,
  Option,
  Stream,
  SubscriptionRef,
  pipe
} from "effect"
import { RegionServiceMockLive } from "../src/features/region-cascade"
import {
  RegionCascadeStore,
  RegionCascadeStoreLive,
  type RegionCascadeStoreService
} from "../src/features/region-cascade"

const StoreLayer = RegionCascadeStoreLive.pipe(
  Layer.provide(RegionServiceMockLive)
)

const withStore = <A>(
  f: (store: RegionCascadeStoreService) => Effect.Effect<A, never, never>
) =>
  Effect.provide(
    Effect.gen(function* () {
      const store = yield* RegionCascadeStore
      return yield* f(store)
    }),
    StoreLayer
  )

describe("RegionCascadeStore", () => {
  it("initializes with provinces and loading state", async () => {
    await Effect.runPromise(
      withStore((store) =>
        Effect.gen(function* () {
          // Initial state check
          const state = yield* SubscriptionRef.get(store.stateRef)
          expect(state.provinceId).toBeNull()
          expect(state.cityId).toBeNull()
          
          // Provinces should be loaded after init (StoreLayer init waits for it)
          expect(store.initialProvinces.length).toBeGreaterThan(0)
          
          // Initial loading should be false (init finished)
          const loadingChunk = yield* pipe(
            store.loading$,
            Stream.take(1),
            Stream.runCollect
          )
          expect(Chunk.unsafeHead(loadingChunk)).toBe(false)
        })
      )
    )
  }, 5000) // Increase timeout for async init

  it("selectProvince triggers loading and updates cities", async () => {
    await Effect.runPromise(
      withStore((store) =>
        Effect.gen(function* () {
          const provinceId = store.initialProvinces[0].id

          // Fork a fiber to collect loading states
          // We expect it to eventually turn true.
          const loadingFiber = yield* pipe(
            store.loading$,
            Stream.filter((l) => l === true),
            Stream.take(1),
            Stream.runCollect,
            Effect.fork
          )

          // Fork a fiber to collect cities
          // We expect eventually a non-empty list
          const citiesFiber = yield* pipe(
            store.cities$,
            Stream.filter((c) => c.length > 0),
            Stream.take(1),
            Stream.runCollect,
            Effect.fork
          )

          // Yield to ensure fibers are scheduled
          yield* Effect.yieldNow()

          // Trigger action
          yield* store.selectProvince(provinceId)
          
          const stateAfterSelect = yield* SubscriptionRef.get(store.stateRef)
          expect(stateAfterSelect.provinceId).toBe(provinceId)

          // Wait for effects
          const [loadingRes, citiesRes] = yield* Fiber.join(
            Fiber.zip(loadingFiber, citiesFiber)
          )

          expect(Chunk.unsafeHead(loadingRes)).toBe(true)
          expect(Chunk.unsafeHead(citiesRes).length).toBeGreaterThan(0)

          // Finally ensure loading goes back to false
          // We can check the current value of loading stream or ref
          // But since we consumed the 'true' event, the stream in fiber is done.
          // Let's just check the ref directly or take one more from stream if we wanted.
          
          // Wait a bit to ensure the 'false' transition has happened (since fetchCities takes 1s)
          // The citiesFiber join ensures fetchCities returned.
          // So loading should be false now.
          // loading$ is a stream that emits current value on subscription.
          const isLoading = yield* pipe(
            store.loading$,
            Stream.take(1),
            Stream.runHead,
            Effect.map(Option.getOrNull)
          )
          expect(isLoading).toBe(false)
        })
      )
    )
  }, 10000)

  it("selectCity updates state and resets district", async () => {
     await Effect.runPromise(
      withStore((store) =>
        Effect.gen(function* () {
          const provinceId = store.initialProvinces[0].id
          yield* store.selectProvince(provinceId)

          // Wait for cities (simulated by just waiting or grabbing from stream)
          // In real test we might want to wait for the effect to settle.
          // For this test, we just manually set a city ID and verify state logic
          // Since `cities$` is derived, we assume the service call eventually finishes.
          
          // Manually set a city ID (simulating user selection after load)
          yield* store.selectCity("c101")
          
          const state = yield* SubscriptionRef.get(store.stateRef)
          expect(state.cityId).toBe("c101")
          expect(state.districtId).toBeNull()

          // Now select a district
          yield* store.selectDistrict("d1011")
          const state2 = yield* SubscriptionRef.get(store.stateRef)
          expect(state2.districtId).toBe("d1011")

          // Changing city should reset district
          yield* store.selectCity("c102")
          const state3 = yield* SubscriptionRef.get(store.stateRef)
          expect(state3.cityId).toBe("c102")
          expect(state3.districtId).toBeNull()
        })
      )
    )
  }, 5000)

  it("reset clears all selection", async () => {
    await Effect.runPromise(
      withStore((store) =>
        Effect.gen(function* () {
          yield* store.selectProvince("p1")
          yield* store.selectCity("c101")
          
          yield* store.reset

          const state = yield* SubscriptionRef.get(store.stateRef)
          expect(state.provinceId).toBeNull()
          expect(state.cityId).toBeNull()
          expect(state.districtId).toBeNull()
        })
      )
    )
  })
})
