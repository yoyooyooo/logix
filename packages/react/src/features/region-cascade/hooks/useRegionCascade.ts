import { Effect, Fiber, Stream } from "effect"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useStore } from "../runtime/EffectContext"

// 通用的 Stream 订阅 Hook
function useStream<A>(stream: Stream.Stream<A, never, never>, initialValue: A) {
  const [value, setValue] = useState<A>(initialValue)

  useEffect(() => {
    const fiber = Effect.runFork(
      Stream.runForEach(stream, (a) => Effect.sync(() => setValue(a)))
    )

    return () => {
      Effect.runFork(Fiber.interrupt(fiber))
    }
  }, [stream])

  return value
}

export function useRegionCascade() {
  const store = useStore()

  // 构造合并的 ViewModel 流
  const view$ = useMemo(
    () =>
      Stream.zipLatestAll(
        store.provinces$,
        store.cities$,
        store.districts$,
        store.state$,
        store.loading$,
        store.error$
      ).pipe(
        Stream.map(([provinces, cities, districts, state, loading, error]) => ({
          provinces,
          cities,
          districts,
          state,
          loading,
          error
        })),
        Stream.debounce("16 millis")
      ),
    [store]
  )

  const { cities, districts, error, loading, provinces, state } = useStream(
    view$,
    {
      provinces: [],
      cities: [],
      districts: [],
      state: {
        provinceId: null,
        cityId: null,
        districtId: null
      },
      loading: false,
      error: null
    }
  )

  const selectProvince = useCallback(
    (id: string | null) => {
      Effect.runFork(store.selectProvince(id))
    },
    [store]
  )

  const selectCity = useCallback(
    (id: string | null) => {
      Effect.runFork(store.selectCity(id))
    },
    [store]
  )

  const selectDistrict = useCallback(
    (id: string | null) => {
      Effect.runFork(store.selectDistrict(id))
    },
    [store]
  )

  const reset = useCallback(() => {
    Effect.runFork(store.reset)
  }, [store])

  const retry = useCallback(() => {
    Effect.runFork(store.retry)
  }, [store])

  return {
    provinces,
    cities,
    districts,
    state,
    loading,
    error,
    selectProvince,
    selectCity,
    selectDistrict,
    reset,
    retry
  }
}
