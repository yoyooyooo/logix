---
title: Query Exact Surface Contract
status: consumed
owner: query-exact-surface
target-candidates:
  - docs/ssot/runtime/08-domain-packages.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-21
---

# Query Exact Surface Contract

## 目标

冻结 `Q1` 这组 query exact surface 的最终去向。

本页要裁三件事：

- `@logixjs/query` root 到底还配继续保留哪些 noun
- `make / Engine / TanStack` 三者是否都还配继续公开
- 哪些能力若未来还要活，只配去 toolkit 或领域内 supporting residue

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `Q1` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `Q1`
- 本页与 `ReadQuery / ExternalStore / Resource` 的共享 exact landing，进一步统一看 [ReadQuery ExternalStore Resource Final Owner Map Contract](./read-query-external-store-resource-final-owner-map-contract.md)
- `Resource` 的具体 owner relocation 与 `Query.Engine.Resource` family landing，进一步看 [Resource Query Owner Relocation Contract](./resource-query-owner-relocation-contract.md)
- 本页不再回到已 consumed 的旧 Form proposal 体系
- 本页只审 `@logixjs/query` root exact surface

## 当前 authority baseline

- [../ssot/runtime/08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)

## north-star-only freeze

本页 review 只把北极星当作固定前提：

- AI Native first
- Agent first runtime
- 更小、更一致、更可推导的公开面优先

除此之外，下面这些点全部允许被挑战：

- `Query.make / Query.Engine / Query.TanStack` 的全部公开价值
- `program-first` 这个表述是否已足够小
- `Engine` 是否该继续留在 root
- `TanStack` 是否该继续留在 root
- query package 是否还藏着第二 runtime、第二 cache truth 或第二 middleware truth

## 当前 challenge override

下面这些 live 语句在本页只算 prior baseline witness，不算默认结论：

- `@logixjs/query` root 当前只保留 `Query.make / Query.Engine / Query.TanStack`
- Query 视为 resource-oriented program kit
- `Engine` 继续作为 capability / middleware / integration layer

原因：

- 这些对象大多只是当前 route budget 与当前 package root 的存活 witness
- 在零存量用户前提下，它们都必须重新证明 `why-public / why-root / why-not-internal-or-toolkit`

## 当前 scope

- `make`
- `Engine`
- `TanStack`

## 目标论点

当前待审目标论点固定为：

> `Q1` 应冻结为 root-minimized query contract。
> `@logixjs/query` root 默认不自动保留 `Engine` 与 `TanStack`。
> 除非能证明 `why-public / why-root / why-not-internal-or-toolkit`，否则默认继续收口。

## adopted candidate

本轮 adopted candidate 已冻结为：

- `Q1 Make-Engine Minimal Contract`

冻结结果如下：

- `@logixjs/query` root 只保留：
  - `make`
  - `Engine`
- `TanStack` 退出 public root

owner 规则固定为：

- `make` 继续承接 query 的 program-first domain act
- `Engine` 继续承接 query domain 的 integration capability / middleware shell
- `TanStack` 不再作为 root exact surface，能力回收到 query internal owner

## Row Sheet

| surface | current-reach | candidate-disposition | main challenge |
| --- | --- | --- | --- |
| `make` | root | `keep-canonical-default` | program-first query act 是否仍是最小公开入口 |
| `Engine` | root | `delete-first` | capability / middleware shell 是否还该继续公开 |
| `TanStack` | root | `delete-first` | integration adapter 是否还该继续公开 |

## 当前一句话结论

`Q1` 已冻结为 `make + Engine` 的最小 root contract：`TanStack` 退出 public root，query root 只保留 program-first act 与 integration capability shell。

## 去向

- 消费日期：2026-04-21
- 已回写：
  - `docs/ssot/runtime/08-domain-packages.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `docs/proposals/resource-query-owner-relocation-contract.md`
