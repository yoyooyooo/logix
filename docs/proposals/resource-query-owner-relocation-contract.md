---
title: Resource Query Owner Relocation Contract
status: consumed
owner: resource-query-owner-relocation
target-candidates:
  - docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md
  - docs/ssot/runtime/08-domain-packages.md
  - docs/ssot/runtime/11-toolkit-layer.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-21
---

# Resource Query Owner Relocation Contract

## 目标

冻结 `Resource` 的终局 delta contract，确保它完整迁到 `@logixjs/query` owner，并把 family landing、workspace repo-internal closure、query self-host rule 与 relocation proof 一起收口。

本页只补六件事：

- `Resource` owner 固定为 `@logixjs/query`
- query root minimality 只留指针
- `Query.Engine.Resource` family landing
- workspace `repo-internal` exact closure
- query self-host rule
- relocation proof matrix

## 页面角色

- 本页是 umbrella proposal 的 `Proposal C`
- 本页承接 [ReadQuery ExternalStore Resource Final Owner Map Contract](./read-query-external-store-resource-final-owner-map-contract.md) 里关于 `Resource` 的冻结结果
- 本页只补 `Resource` 特有 delta
- 本页不重写 `Q1` 的 root-minimality
- 本页不重写 `runtime/04` 的 capability baseline
- 本页不重写 toolkit baseline
- 本页不处理 `ReadQuery` 与 `ExternalStore`

## 当前 authority baseline

- [./read-query-external-store-resource-final-owner-map-contract.md](./read-query-external-store-resource-final-owner-map-contract.md)
- [./query-exact-surface-contract.md](./query-exact-surface-contract.md)
- [../ssot/runtime/04-capabilities-and-runtime-control-plane.md](../ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../ssot/runtime/08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
- [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)

## Adopted Candidate

本轮 adopted candidate 固定为：

- `Resource Closure-First Delta Contract`

## Frozen Decisions

### 1. owner

`Resource` 的唯一 owner 固定为 `@logixjs/query`。

### 2. query root minimality

`@logixjs/query` root minimality 继续由 `Q1` 单点持有。

本页只承认一条指针：

- query root 继续只保留 `make + Engine`

### 3. family landing

`Resource` 的公开 landing 固定为：

- `Query.Engine.Resource`

本页冻结的是 family landing 与最小 authoring / integration 角色，不在终局合同里一把锁死当前 child members、type family、helper family 或 support lineage。

若未来要把 family landing 下的具体成员升格为长期 public surface，必须单独补 `why-public / why-Engine-child / why-not-internal-or-supporting-residue` 证明。

### 4. workspace repo-internal exact closure

本页冻结一个单值终局：

- 任意 workspace 级 core `repo-internal` export 都不得再暴露 `Resource` noun

这条 closure 至少同时覆盖：

- `repo-internal/read-contracts`
- `repo-internal/InternalContracts`

若执行阶段必须存在短期桥接，只能进入 implementation plan 或 migration annex。桥接文本不具备 authority，不改变本页终局 contract，并且必须满足：

- 绑定 exact path
- 绑定唯一消费者
- 绑定 sunset gate
- 绑定删除触发条件

### 5. query self-host rule

relocation 完成后，`packages/logix-query/src/**` 的 public type、internal declaration 与 runtime integration 不得再依赖 core `ReadContracts.Resource` lineage 或 core `Resource.ts`。

query package 自持的 contract 至少包括：

- `ResourceSpec`
- `ResourceSnapshot`
- `keyHash`
- registry / resolver 所需的 query-owned resource contracts

### 6. exact injection boundary

资源相关注入分两类：

- `Query.Engine.Resource.layer(...)`
- `Query.Engine.layer(...)`

这两类都属于 `Layer` 注入，合法落点只有：

- `Program.capabilities.services`
- runtime layer overlay

`Query.Engine.middleware()` 只属于 runtime middleware slot，不进入 `Program.capabilities.services` 叙事。

明确禁止：

- `capabilities.resources`
- `capabilities.middleware`
- `ResourceProvider`
- `useResource`
- query-specific host family

### 7. future reopen gate

`Query.Engine.Resource` 之外的任何 wrapper、helper、provider、recipe，都不得直接在 `@logixjs/query` 增长。

若未来确有需要，必须同时通过：

- `runtime/12` intake
- `runtime/11` toolkit gate

并且必须满足：

- 机械回解到下列 surviving slots 中的一个或多个：
  - `Query.Engine.Resource.layer(...)`
  - `Query.Engine.layer(...)`
  - runtime middleware slot 下的 `Query.Engine.middleware()`
  - `Query.make + Program.capabilities.services`
  - runtime layer overlay
- 不新增第二 authoring 主链
- 不改写 runtime 语义

## Non-goals

- 不冻结当前 child members、type family 或 helper lineage
- 不冻结当前内部目录、示例名单或测试家族名
- 不定义 implementation bridge 细节
- 不处理 `ReadQuery` 与 `ExternalStore`

## Relocation Proof Matrix

| closure obligation | required witness | authority owner | reopen condition |
| --- | --- | --- | --- |
| query root minimality | `@logixjs/query` root 仍只保留 `make + Engine` | `Q1 + inventory` | 只有 query root exact surface 被正式重开时，才允许 reopen |
| workspace repo-internal closure | core 所有 workspace repo-internal export 与 allowlist 不再暴露 `Resource` noun | 本页 | 只有证明存在不可替代的 repo consumer 窄合同，且能通过单独 reopen 绑定 exact path / sole consumers / sunset gate 时，才允许 reopen |
| query self-host closure | `packages/logix-query/src/**` 的 public type、internal declaration 与 runtime integration 不再引用 core `ReadContracts.Resource` lineage | 本页 | 只有 query owner 自持 contracts 被证明不足时，才允许 reopen |
| public landing coherence | `Query.Engine.Resource` 的 public d.ts 与 adopted contract 一致 | 本页 + `Q1` | 只有 family landing 本身被正式重开时，才允许 reopen |
| docs / examples / tests residue closure | non-archive docs、examples、长期 witness 的旧 `ReadContracts.Resource` route 已清扫或显式标成 stale / residue | 本页 + inventory | 只有 residue 被提升回 active authority 时，才允许 reopen |
| behavior continuity | direct-load、engine takeover、snapshot single-truth 等正向行为仍成立 | query owner | 只有低层语义被证明不足时，才允许 reopen |

## 当前实现 witness

- core workspace `repo-internal/read-contracts` 与 `repo-internal/InternalContracts` 已不再暴露 `Resource`
- `packages/logix-query/src/**` 已切到 query-owned `internal/resource.ts`
- field-source runtime 当前通过 generic source registry seam 取 spec，query owner 不再依赖 core `ReadContracts.Resource`
- `Query.Engine.Resource` 已承接 `make / layer / keyHash / Snapshot`
- `packages/logix-query/test/**` 与 `examples/logix-react/**` 的活跃样例已切到 `Query.Engine.Resource`
- focused witness 已覆盖：
  - `packages/logix-core/test/PublicSurface/Core.InternalContractsBoundary.test.ts`
  - `packages/logix-query/test/Query/Query.RootSurfaceBoundary.test.ts`
  - `packages/logix-query/test/Query/Query.PackageExportsBoundary.test.ts`
  - `packages/logix-query/test/Engine.combinations.test.ts`
  - `packages/logix-query/test/Query/Query.MissingClient.test.ts`
  - `packages/logix-query/test/Query.invalidate.test.ts`
  - `packages/logix-query/test/Query/Query.CacheReuse.test.ts`
  - `packages/logix-query/test/Query/Query.Race.test.ts`
  - `packages/logix-query/test/Query/Query.CachePeekSkipLoading.test.ts`
  - `packages/logix-query/test/Query.edge-cases.test.ts`
  - `packages/logix-query/test/TanStack.engine.cacheLimit.test.ts`
  - `packages/logix-query/test/Query.controller.refreshAll.test.ts`

## Writeback Targets

### Live authority

- `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- `docs/ssot/runtime/08-domain-packages.md`
- `docs/ssot/runtime/11-toolkit-layer.md`
- `docs/standards/logix-api-next-guardrails.md`
- `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

### Superseded Authorities

下面这些页在 `Resource` 议题上不再持有活 authority，后续若仍保留相关旧句，必须显式去权威或改口径：

- `docs/proposals/core-residual-surface-contract.md`
- `docs/proposals/core-residual-adjunct-contract.md`

## 当前一句话结论

`Resource` 的终局是 query owner 自持 contracts 与 `Query.Engine.Resource` family landing；这页只负责把 workspace repo-internal closure、query self-host rule、exact injection boundary 与 relocation proof 一次性收成单值 contract。

## 去向

- 消费日期：2026-04-21
- 已回写：
  - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - `docs/ssot/runtime/08-domain-packages.md`
  - `docs/ssot/runtime/11-toolkit-layer.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
