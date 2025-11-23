import { Context, Effect, Layer, pipe, Stream, SubscriptionRef } from "effect";
import { RegionService } from "../services/RegionService";
import type { CascadeState, Region } from "../types/region";

export interface RegionCascadeStoreService {
  readonly stateRef: SubscriptionRef.SubscriptionRef<CascadeState>;

  readonly initialProvinces: Array<Region>;

  readonly provinces$: Stream.Stream<Array<Region>, never, never>;
  readonly cities$: Stream.Stream<Array<Region>, never, never>;
  readonly districts$: Stream.Stream<Array<Region>, never, never>;
  readonly state$: Stream.Stream<CascadeState, never, never>;

  readonly loading$: Stream.Stream<boolean, never, never>;
  readonly error$: Stream.Stream<string | null, never, never>;

  readonly selectProvince: (
    id: string | null
  ) => Effect.Effect<void, never, never>;
  readonly selectCity: (id: string | null) => Effect.Effect<void, never, never>;
  readonly selectDistrict: (
    id: string | null
  ) => Effect.Effect<void, never, never>;
  readonly reset: Effect.Effect<void, never, never>;
  readonly retry: Effect.Effect<void, never, never>;
}

export class RegionCascadeStore extends Context.Tag("RegionCascadeStore")<
  RegionCascadeStore,
  RegionCascadeStoreService
>() {}

const makeRegionCascadeStore = Effect.gen(function* () {
  const service = yield* RegionService;

  // 1. 状态管理
  const stateRef = yield* SubscriptionRef.make<CascadeState>({
    provinceId: null,
    cityId: null,
    districtId: null,
  });

  const loadingCountRef = yield* SubscriptionRef.make(0);
  const errorRef = yield* SubscriptionRef.make<string | null>(null);
  const retryCountRef = yield* SubscriptionRef.make(0);

  const trackLoading = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.acquireUseRelease(
      SubscriptionRef.update(loadingCountRef, (n) => n + 1),
      () => effect,
      () => SubscriptionRef.update(loadingCountRef, (n) => n - 1)
    );

  const handleRequest = <E, R>(effect: Effect.Effect<Array<Region>, E, R>) =>
    pipe(
      SubscriptionRef.set(errorRef, null),
      Effect.flatMap(() => effect),
      trackLoading,
      Effect.tapError((error) => SubscriptionRef.set(errorRef, String(error))),
      Effect.catchAll(() => Effect.succeed<Array<Region>>([]))
    );

  // 首次加载省份列表，作为 initialProvinces 暴露给外部（例如测试 / UI 初始选项）
  const initialProvinces = yield* pipe(
    service.fetchProvinces,
    handleRequest
  );

  const selectState = <K extends keyof CascadeState>(key: K) =>
    pipe(
      Stream.fromEffect(SubscriptionRef.get(stateRef)),
      Stream.concat(stateRef.changes),
      Stream.map((state) => state[key]),
      Stream.changes
    );

  const provinceId$ = selectState("provinceId");
  const cityId$ = selectState("cityId");

  const retry$ = pipe(
    Stream.fromEffect(SubscriptionRef.get(retryCountRef)),
    Stream.concat(retryCountRef.changes)
  );

  // 2. 派生数据流

  const provinces$ = pipe(
    retry$,
    Stream.flatMap(
      () => pipe(service.fetchProvinces, handleRequest, Stream.fromEffect),
      { switch: true }
    )
  );

  // 使用 Stream.zipLatest 替代 combineLatest
  const cities$ = pipe(
    Stream.zipLatest(provinceId$, retry$),
    Stream.flatMap(
      ([id]) =>
        id === null
          ? Stream.succeed<Array<Region>>([])
          : pipe(service.fetchCities(id), handleRequest, Stream.fromEffect),
      { switch: true }
    )
  );

  const districts$ = pipe(
    Stream.zipLatest(cityId$, retry$),
    Stream.flatMap(
      ([id]) =>
        id === null
          ? Stream.succeed<Array<Region>>([])
          : pipe(service.fetchDistricts(id), handleRequest, Stream.fromEffect),
      { switch: true }
    )
  );

  const state$ = pipe(
    Stream.fromEffect(SubscriptionRef.get(stateRef)),
    Stream.concat(stateRef.changes)
  );

  const loading$ = pipe(
    Stream.fromEffect(SubscriptionRef.get(loadingCountRef)),
    Stream.concat(loadingCountRef.changes),
    Stream.map((count) => count > 0),
    Stream.changes
  );

  const error$ = pipe(
    Stream.fromEffect(SubscriptionRef.get(errorRef)),
    Stream.concat(errorRef.changes)
  );

  // 3. Actions

  const selectProvince = (id: string | null) =>
    SubscriptionRef.update(stateRef, (prev) => ({
      ...prev,
      provinceId: id,
      cityId: null,
      districtId: null,
    }));

  const selectCity = (id: string | null) =>
    SubscriptionRef.update(stateRef, (prev) => ({
      ...prev,
      cityId: id,
      districtId: null,
    }));

  const selectDistrict = (id: string | null) =>
    SubscriptionRef.update(stateRef, (prev) => ({
      ...prev,
      districtId: id,
    }));

  const reset = SubscriptionRef.set(stateRef, {
    provinceId: null,
    cityId: null,
    districtId: null,
  });

  const retry = SubscriptionRef.update(retryCountRef, (n) => n + 1);

  return {
    stateRef,
    initialProvinces,
    provinces$,
    cities$,
    districts$,
    state$,
    loading$,
    error$,
    selectProvince,
    selectCity,
    selectDistrict,
    reset,
    retry,
  };
});

export const RegionCascadeStoreLive = Layer.scoped(
  RegionCascadeStore,
  makeRegionCascadeStore
);
