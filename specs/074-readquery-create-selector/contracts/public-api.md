# Contracts: Public API（ReadQuery.createSelector）

## Module

- `@logix/core` → `ReadQuery` 子模块

## API

```ts
import type { EqualsKind, ReadQuery, ReadQueryInput } from '@logix/core/ReadQuery'

export declare const createSelector: <S, Inputs extends ReadonlyArray<ReadQueryInput<S, any>>, V>(args: {
  readonly debugKey: string
  readonly params?: unknown
  readonly inputs: Inputs
  readonly result: (...values: { [K in keyof Inputs]: Inputs[K] extends ReadQueryInput<S, infer A> ? A : never }) => V
  readonly equalsKind?: EqualsKind
  readonly equals?: (previous: V, next: V) => boolean
}) => ReadQuery<S, V>
```

## Behavioral Contract

- `createSelector(args)` 会先对 `args.inputs` 逐个执行 `ReadQuery.compile`。
- 任一输入进入 dynamic lane 或缺失 `readsDigest` → 默认抛错（fail-fast）。
- 输出是一个 manual static `ReadQuery`：
  - `reads = union(inputs.reads)`（归一化去重排序）；
  - `selectorId` 为确定性计算结果；
  - `equalsKind` 默认 `objectIs`，可选 `shallowStruct/custom`（custom 需提供 `equals`）。

