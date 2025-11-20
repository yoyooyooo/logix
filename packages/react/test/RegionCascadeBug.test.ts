import { Effect, Stream, SubscriptionRef, Layer, pipe } from "effect"
import { it, describe, expect } from "vitest"
import {
  RegionCascadeStore,
  RegionCascadeStoreLive,
  RegionService
} from "../src/features/region-cascade"
import { Region } from "../src/features/region-cascade"

// Mock Service
const mockRegions = (prefix: string): Region[] => [
  { id: `${prefix}1`, name: `${prefix}Name1`, code: `${prefix}Code1` }
]

const RegionServiceTest = Layer.succeed(RegionService, {
  fetchProvinces: Effect.succeed(mockRegions("p")),
  fetchCities: (pid) => Effect.succeed(pid ? mockRegions(`c_${pid}_`) : []),
  fetchDistricts: (cid) => Effect.succeed(cid ? mockRegions(`d_${cid}_`) : [])
})

describe("RegionCascadeStore Bug Repro", () => {
  it("should clear districts list when city is deselected or changed via province change", async () => {
    const program = Effect.gen(function* () {
      const store = yield* RegionCascadeStore
      
      // We need to subscribe to the streams to ensure they are active and processing events
      // In a real app, UI subscribes. Here we manually consume.
      // However, Stream.runHead only takes one. We need a way to inspect the *latest* emitted value.
      // SubscriptionRef is good for state, but for the derived streams (cities$, districts$), 
      // strictly speaking they are stateless streams unless we hold them.
      // But the store implementation uses `provinceRef.changes` which are broadcast.
      // Let's use a Hub or just run the stream into a Ref to observe it.
      
      const districtsRef = yield* SubscriptionRef.make<Region[]>([])
      yield* pipe(
        store.districts$,
        Stream.runForEach(regions => SubscriptionRef.set(districtsRef, regions)),
        Effect.fork
      )

      // 1. Select Province
      yield* store.selectProvince("p1")
      
      // 2. Select City
      yield* store.selectCity("c_p1_1")
      
      // Wait a bit for stream propagation
      yield* Effect.sleep("100 millis") 
      
      // Check districts loaded
      const districts1 = yield* SubscriptionRef.get(districtsRef)
      console.log("Districts after city select:", districts1)
      expect(districts1.length).toBeGreaterThan(0)

      // 3. Change Province (should clear City and District)
      // In the implementation: selectProvince(id) -> set provinceRef(id), set cityRef(null), set districtRef(null)
      yield* store.selectProvince("p2")
      
      yield* Effect.sleep("100 millis")

      // Check districts - EXPECTATION: Should be empty
      const districts2 = yield* SubscriptionRef.get(districtsRef)
      console.log("Districts after province change:", districts2)
      
      // If the bug exists, districts2 might still be districts1 because the 'null' change on cityRef was filtered out
      expect(districts2).toEqual([])

      yield* store.reset
    }).pipe(
      Effect.provide(RegionCascadeStoreLive),
      Effect.provide(RegionServiceTest)
    )

    await Effect.runPromise(program)
  })
})
