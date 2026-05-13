# Quickstart: Query Logic Contract Cutover

## 1. 先看哪些页面和路径

- `docs/ssot/runtime/08-domain-packages.md`
- `packages/logix-query/src/index.ts`
- `packages/logix-query/src/Query.ts`
- `packages/logix-query/src/Fields.ts`

## 2. 先回答哪些问题

1. Query 的 day-one 主输出是什么
2. root exports 的 keep 或 move 或 remove ledger 是否已经写死
3. `Engine / TanStack / invalidate / refresh` 属于哪一层
4. 这次改动会不会重新引入第二 cache truth 或第二作者面
