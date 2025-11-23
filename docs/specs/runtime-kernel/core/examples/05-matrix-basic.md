# Matrix Examples: Basic & Async (S01-S05)

> **Focus**: 单字段/多字段联动、异步副作用

## S01: 基础联动 (Sync Linkage)
**Trigger**: T1 (Single Path) -> **Effect**: E1 (Sync Mutation)

```typescript
watch('country', (country, { set }) => 
  // 需求：改 Country，清空 Province
  set('province', null)
)
```

## S02: 异步回填 (Async Fill)
**Trigger**: T1 (Single Path) -> **Effect**: E2 (Async Computation)

```typescript
watch('zipCode', (zip, { set, services }) => 
  Effect.gen(function*() {
    if (zip.length < 5) return;
    const api = yield* services.GeoService;
    const city = yield* api.fetchCity(zip);
    yield* set('city', city);
  })
)
```

## S03: 防抖搜索 (Debounced Search)
**Trigger**: T1 (Single Path) -> **Effect**: E3 (Flow Control)

```typescript
watch('keyword', (kw, { set, services }) => 
  Effect.gen(function*() {
    const api = yield* services.SearchService;
    const results = yield* api.search(kw);
    yield* set('results', results);
  }),
  { debounce: '500 millis' }
)
```

## S04: 联合校验 (Multi-Field Validation)
**Trigger**: T2 (Multi Path) -> **Effect**: E1 (Sync Mutation)

```typescript
watchMany(['startDate', 'endDate'], ([start, end], { set }) => 
  Effect.gen(function*() {
    if (start && end && start > end) {
      yield* set('errors.date', 'Start must be <= End');
    } else {
      yield* set('errors.date', null);
    }
  })
)
```

## S05: 多参查询 (Multi-Arg Query)
**Trigger**: T2 (Multi Path) -> **Effect**: E2 (Async Computation)

```typescript
watchMany(['category', 'sort'], ([cat, sort], { set, services }) => 
  Effect.gen(function*() {
    // 只有当两者都有值时才查询
    if (!cat || !sort) return;
    
    const api = yield* services.ProductService;
    const list = yield* api.query(cat, sort);
    yield* set('list', list);
  }),
  { debounce: '300 millis', concurrency: 'switch' }
)
```
