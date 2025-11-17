# Matrix Examples: Basic & Async (Standard Paradigm)

> **Focus**: 单字段/多字段联动、异步副作用
> **Note**: 本文示例基于当前主线 Effect-Native 标准范式，统一使用 Bound API `$` + `Flow.Api`。

## S01: 基础联动 (Sync Linkage)

**标准模式**: 使用 `flow.fromState` 监听源字段，在 `flow.run` 中通过 `state.mutate` 更新目标字段。

```typescript
export const S01_ResetProvinceOnCountryChange: Logic.Of<FormShape> =
  ({ flow, state }) =>
    Effect.gen(function* (_) {
      const country$ = flow.fromState((s) => s.country);

      yield* country$.pipe(
        flow.run(
          state.mutate((draft) => {
            draft.province = "";
          })
        )
      );
    })
);
```

## S02: 异步回填 (Async Fill)

**标准模式**: 监听 `zipCode` 变化，通过 `flow.runLatest` 执行包含 API 调用的 Effect，自动处理竞态。

```typescript
export const S02_FillCityByZipCode: Logic.Of<FormShape, GeoService> =
  ({ flow, state }) =>
    Effect.gen(function* (_) {
      const zip$ = flow.fromState((s) => s.zipCode);

      const fillCityEffect = Effect.gen(function* (_) {
        const svc = yield* GeoService;
        const { zipCode } = yield* state.read;
        const city = yield* svc.fetchCity(zipCode);
        yield* state.mutate((draft) => { draft.city = city; });
      });

      yield* zip$.pipe(
        flow.filter((zip) => zip.length >= 5),
        flow.runLatest(fillCityEffect) // 使用 runLatest 保证只处理最新的 zip code
      );
    })
);
```

## S03: 防抖搜索 (Debounced Search)

**标准模式**: 典型的 `debounce` + `filter` + `runLatest` 组合。

```typescript
export const S03_SearchWithDebounce: Logic.Of<SearchShape, SearchApi> =
  ({ flow, state }) =>
    Effect.gen(function* (_) {
      const keyword$ = flow.fromState((s) => s.keyword);

      const searchEffect = Effect.gen(function* (_) {
        const svc = yield* SearchApi;
        const { keyword } = yield* state.read;
        const results = yield* svc.search(keyword);
        yield* state.mutate((draft) => { draft.results = results; });
      });

      yield* keyword$.pipe(
        flow.debounce(500),
        flow.filter((keyword) => keyword.trim() !== ""),
        flow.runLatest(searchEffect)
      );
    })
);
```

## S04: 联合校验 (Multi-Field Validation)

**标准模式**: `flow.fromState` 可以监听一个返回元组 `[s.startDate, s.endDate]` 的 selector。

```typescript
export const S04_ValidateDateRange: Logic.Of<FormShape> =
  ({ flow, state }) =>
    Effect.gen(function* (_) {
      const datePair$ = flow.fromState(
        (s) => [s.startDate, s.endDate] as const
      );

      const validationEffect = state.mutate((draft) => {
        if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) {
          draft.errors.dateRange = "Start must be <= End";
        } else {
          delete draft.errors.dateRange;
        }
      });

      yield* datePair$.pipe(flow.run(validationEffect));
    })
);
```

## S05: 多参查询 (Multi-Arg Query)

**标准模式**: 与 S04 类似，监听多个参数的元组，然后触发一个包含 API 调用的 Effect。

```typescript
export const S05_QueryByCategoryAndSort: Logic.Of<ProductShape, ProductApi> =
  ({ flow, state }) =>
    Effect.gen(function* (_) {
      const params$ = flow.fromState(
        (s) => [s.category, s.sort] as const
      );

      const queryEffect = Effect.gen(function* (_) {
        const svc = yield* ProductApi;
        const { category, sort } = yield* state.read;
        const list = yield* svc.query(category, sort);
        yield* state.mutate((draft) => { draft.list = list; });
      });

      yield* params$.pipe(
        flow.filter(([cat, sort]) => !!cat && !!sort),
        flow.debounce(300),
        flow.runLatest(queryEffect)
      );
    })
);
```
