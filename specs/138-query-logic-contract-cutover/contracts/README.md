# Contracts: Query Logic Contract Cutover

## 1. Output Contract

- Query 默认主输出是 `Query.make(...)` 对应的 program-first query kit
- root `fields` 退出 package root
- declarations helpers 迁到 `@logixjs/query/Fields`
- package root 冻结为 `make / Engine / TanStack`

对应 ledger：

- `root-surface-ledger.md`

## 2. Integration Layer Contract

- `Engine`、`TanStack` 属于 integration layer
- integration layer 不反向定义作者面主链

对应 ledger：

- `integration-layer-ledger.md`

## 3. Cache Truth Contract

- query cache snapshot 必须投影回模块 state
- Query 不允许形成第二套 cache truth
- keyHash 与 snapshot phase 必须能直接从模块 state 断言

对应 ledger：

- `cache-truth-ledger.md`
