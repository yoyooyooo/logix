# Research: Query Logic Contract Cutover

## Decision 1: Query 默认主输出继续收成 program-first kit

- `08-domain-packages` 已给出方向
- day-one 作者面要直接映射到 `Module + Program + Logic`

## Decision 2: root `fields` helper 退出 package root

- query declarations 仍可存在
- 但它们应移动到 `@logixjs/query/Fields`
- root `fields` 会持续制造第二作者面
- 当前已通过 root boundary 与 submodule boundary 测试把这条边界钉住

## Decision 3: `Engine / TanStack` 继续保留为 integration layer

- 它们有真实价值
- 它们不应反向定义默认主输出

## Decision 4: cache snapshot 仍需投影回模块 state

- Query 不允许形成第二套 cache truth
- state projection 是 program-first 口径的关键约束
- 当前已通过 refreshAll、invalidate、cache reuse、race 四组测试把 `data/status/keyHash` 都钉在 `state.queries.*`

## Decision 5: root boundary 需要 runtime 与 type-level 双重锁定

- runtime 层直接断言 root 只有 `make / Engine / TanStack`
- type-level 层继续允许 `@logixjs/query/Fields` 暴露 helper types
- root 不再重新引出 `source / fields / querySurface`

## Validation Note

- 验证期间曾命中过 `proto 0.50.2` shim 的系统代理探测崩溃
- 当前已升级到 `proto 0.56.0`，常规 `pnpm -C packages/logix-query typecheck` 恢复可用
