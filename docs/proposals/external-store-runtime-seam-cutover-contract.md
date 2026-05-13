---
title: ExternalStore Runtime Seam Cutover Contract
status: consumed
owner: external-store-runtime-seam
target-candidates:
  - docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/ssot/runtime/11-toolkit-layer.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-21
---

# ExternalStore Runtime Seam Cutover Contract

## 目标

冻结 `ExternalStore` 的终局 delta contract，确保它完整回收到 runtime / field / React seam internal，并把 repo consumer 级 noun、workspace repo-internal grouped route 与未来 sugar reopen 一起收口。

本页只补五件事：

- `ExternalStore` noun extinction
- workspace `repo-internal` exact closure
- authoring / injection exact boundary
- toolkit reopen gate
- closure proof matrix

## 页面角色

- 本页是 umbrella proposal 的 `Proposal B`
- 本页承接 [ReadQuery ExternalStore Resource Final Owner Map Contract](./read-query-external-store-resource-final-owner-map-contract.md) 里关于 `ExternalStore` 的冻结结果
- 本页只补 `ExternalStore` 特有 delta
- 本页不重写 umbrella owner map
- 本页不重写 React host public formula
- 本页不重写 toolkit baseline
- 本页不处理 `ReadQuery` selector law internalization
- 本页不处理 `Resource` owner relocation

## 当前 authority baseline

- [./read-query-external-store-resource-final-owner-map-contract.md](./read-query-external-store-resource-final-owner-map-contract.md)
- [./core-read-projection-protocol-contract.md](./core-read-projection-protocol-contract.md)
- [../ssot/runtime/04-capabilities-and-runtime-control-plane.md](../ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)

## Adopted Candidate

本轮 adopted candidate 固定为：

- `ExternalStore Closure-First Delta Contract`

## Frozen Decisions

### 1. noun extinction

`ExternalStore` 不再保留任何 repo consumer 级主名词地位。

冻结要求：

- 对用户与 repo consumer，`ExternalStore` 不再构成 day-one authoring family
- 非 archive 文档、examples、公开类型面与公开教学口径不再出现 explicit `ExternalStore` authoring route
- `ExternalStore` 只作为 runtime / field / React seam internal 工件存在

### 2. internal owner

`ExternalStore` 的唯一 owner 固定为三段 internal seam：

- core runtime seam
- field install seam
- React internal store / hook seam

本页只冻结语义，不冻结具体目录、具体 helper 名或当前测试家族名。

### 3. workspace repo-internal exact closure

本页冻结一个单值终局：

- 任意 workspace `repo-internal` export 都不得再暴露 `ExternalStore` noun

这条 closure 至少同时覆盖：

- `repo-internal/read-contracts`
- `repo-internal/InternalContracts`

若执行阶段必须存在短期桥接，只能进入 implementation plan 或 migration annex。桥接文本不具备 authority，不改变本页终局 contract，并且必须满足：

- 不继续暴露 `ExternalStore` noun
- 绑定 exact path
- 绑定唯一消费者
- 绑定 sunset gate
- 绑定删除触发条件

### 4. authoring / injection exact boundary

外部输入接入只允许通过下面两条 route 进入 runtime：

- `Program.capabilities.services`
- runtime scope layer overlay

React 侧只允许被既有 host truth 消费：

- `RuntimeProvider`
- 既有 host hooks

明确禁止：

- `capabilities.externalStores`
- `ExternalStoreProvider`
- `ExternalStore` 专属 hook family
- 第二套 host/runtime acquisition route

### 5. neutral seam invariants

本页只冻结语义级 seam obligations：

- service-backed ingest
- subscription-backed ingest
- stream-backed ingest
- module-as-source recognizability
- tick / notify / no-tearing

`module-as-source` 只依赖 selector-input 语义，不在终局 contract 中保留任何 `ReadQuery` noun 级桥接。

本页不冻结当前 `from*` constructor lineage。

### 6. toolkit reopen gate

未来若确实要重开更高层 sugar，只能走 toolkit reopen。

冻结条件：

- 先过 `runtime/12` intake
- 不继承已删除的 `ExternalStore` noun lineage
- 必须机械回解到 runtime / field / React truth
- 不得新增 acquisition route
- 不得引入第二 authoring 主链
- 不得改写 runtime 语义

## Non-goals

- 不冻结当前 constructor/helper 名
- 不冻结当前内部目录或测试家族名
- 不定义 implementation bridge 细节
- 不重开 React host public formula
- 不处理 `ReadQuery` 与 `Resource`

## Closure Proof Matrix

| closure obligation | required proof | authority owner | reopen condition |
| --- | --- | --- | --- |
| public root / subpath closure | `@logixjs/core` root 与 package exports 不出现 `ExternalStore` | `runtime/01 + guardrails` | 只有出现新的 canonical public external-input noun 需求时，才允许 reopen |
| workspace repo-internal closure | workspace export map 与 allowlist 证明 `ExternalStore` 已从 `read-contracts`、`InternalContracts` 与任何 workspace grouped route 消失 | 本页 | 只有证明存在不可替代的 repo consumer 窄合同，且能通过单独 reopen 绑定 exact path / sole consumers / sunset gate 时，才允许 reopen |
| public type closure | 公开 d.ts、公开 helper type proof 与 host 文案不出现 `ExternalStore` noun | `runtime/10 + 本页` | 只有 host exact contract 被正式重开时，才允许 reopen |
| docs / examples / tests residue closure | 非 archive docs、examples、长期 proof 不再把 `ExternalStore` 当显式 authoring route；残余若保留，必须显式标记为 stale / residue | 本页 + inventory | 只有 residue 被提升回 active authority 时，才允许 reopen |
| semantic capability continuity | runtime seam 的 service-backed ingest、subscription-backed ingest、stream-backed ingest、module-as-source recognizability、tick / notify / no-tearing 继续成立 | seam internal owner | 只有低层语义本身被判定不足时，才允许 reopen |

## 当前实现 proof

- `repo-internal/read-contracts` 与 `repo-internal/InternalContracts` 已不再暴露 `ExternalStore`
- runtime seam 当前固定通过 `RuntimeContracts.ExternalInput` 消费 service / subscriptionRef / stream / module-as-source 四条路径
- React internal store 当前已改到 `RuntimeContracts.ExternalInput` 与 `RuntimeContracts.Selector`
- non-archive scenario `examples/logix/src/scenarios/external-store-tick.ts` 已改成 runtime seam 口径，不再教学旧 noun factory
- focused proof 已覆盖：
  - `packages/logix-core/test/PublicSurface/Core.InternalContractsBoundary.test.ts`
  - `packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts`
  - `packages/logix-core/test/internal/ExternalStore/ExternalStore.Sugars.test.ts`
  - `packages/logix-core/test/internal/Runtime/ModuleAsSource.recognizability.test.ts`
  - `packages/logix-core/test/internal/Runtime/ModuleAsSource.tick.test.ts`
  - `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStore.Ownership.test.ts`
  - `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStore.TxnWindow.test.ts`
  - `packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetFanoutFusion.contract.test.ts`
  - `packages/logix-react/test/browser/perf-boundaries/external-store-ingest.test.tsx`
  - `packages/logix-react/test/integration/runtime-yield-to-host.integration.test.tsx`

## Writeback Targets

### Live authority

- `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/ssot/runtime/11-toolkit-layer.md`
- `docs/standards/logix-api-next-guardrails.md`
- `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

### Superseded Authorities

下面这些页在 `ExternalStore` 议题上不再持有活 authority，后续若仍保留相关旧句，必须显式去权威或改口径：

- `docs/proposals/core-residual-surface-contract.md`
- `docs/proposals/core-residual-adjunct-contract.md`

## 当前一句话结论

`ExternalStore` 的终局是 runtime / field / React seam internal；这页只负责把 noun extinction、workspace repo-internal closure、authoring boundary、toolkit reopen gate 与 closure proof 一次性收成单值 contract。

## 去向

- 消费日期：2026-04-21
- 已回写：
  - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/runtime/11-toolkit-layer.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `examples/logix/src/scenarios/external-store-tick.ts`
