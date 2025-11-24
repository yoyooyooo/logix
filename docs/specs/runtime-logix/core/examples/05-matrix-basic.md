# Matrix Examples: Basic & Async (S01-S05)

> **Focus**: 单字段/多字段联动、异步副作用

## S01: 基础联动 (Sync Linkage)
**Trigger**: T1 (Single Path) -> **Effect**: E1 (Sync Mutation)

```typescript
api.rule({
  name: 'ResetProvinceOnCountryChange',
  trigger: api.on.change(s => s.country),
  do: api.ops.set(s => s.province, null)
});
```

## S02: 异步回填 (Async Fill)
**Trigger**: T1 (Single Path) -> **Effect**: E2 (Async Computation)

```typescript
api.rule({
  name: 'FillCityByZipCode',
  trigger: api.on.change(s => s.zipCode),
  do: api.pipe(
    api.ops.filter(ctx => ctx.value.length >= 5),
    api.ops.fetch(ctx => api.services.GeoService.fetchCity(ctx.value)),
    api.ops.set(s => s.city, ctx => ctx.value)
  )
});
```

## S03: 防抖搜索 (Debounced Search)
**Trigger**: T1 (Single Path) -> **Effect**: E3 (Flow Control)

```typescript
api.rule({
  name: 'SearchWithDebounce',
  trigger: api.on.change(s => s.keyword),
  do: api.pipe(
    api.ops.debounce(500),
    api.ops.fetch(ctx => api.services.SearchService.search(ctx.value)),
    api.ops.set(s => s.results, ctx => ctx.value)
  )
});
```

## S04: 联合校验 (Multi-Field Validation)
**Trigger**: T2 (Multi Path) -> **Effect**: E1 (Sync Mutation)

```typescript
api.rule({
  name: 'ValidateDateRange',
  trigger: api.on.change(s => [s.startDate, s.endDate] as const),
  do: api.ops.update(s => s.errors, (errors, _, ctx) => {
    const [start, end] = ctx.value;
    if (start && end && start > end) {
      return { ...errors, date: 'Start must be <= End' };
    }
    const { date, ...rest } = errors;
    return rest;
  })
});
```

## S05: 多参查询 (Multi-Arg Query)
**Trigger**: T2 (Multi Path) -> **Effect**: E2 (Async Computation)

```typescript
api.rule({
  name: 'QueryByCategoryAndSort',
  trigger: api.on.change(s => [s.category, s.sort] as const),
  do: api.pipe(
    api.ops.filter(ctx => {
      const [cat, sort] = ctx.value;
      return !!cat && !!sort;
    }),
    api.ops.fetch(ctx => {
      const [cat, sort] = ctx.value;
      return api.services.ProductService.query(cat, sort);
    }),
    api.ops.set(s => s.list, ctx => ctx.value),
    api.ops.debounce(300)
  )
});
```
