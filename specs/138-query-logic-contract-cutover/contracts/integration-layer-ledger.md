# Integration Layer Ledger: Query Logic Contract Cutover

## Integration Layer

- `Query.Engine`
- `Query.TanStack`
- `Query.Engine.middleware()`
- invalidation and refresh helper surface

## Rules

- integration layer 可以继续存在
- integration layer 不反向定义默认作者面
- integration layer 不能制造第二 cache truth
