---
title: Domain Exact Surface Contract
status: living
owner: domain-exact-surface
target-candidates:
  - docs/ssot/runtime/08-domain-packages.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-18
---

# Domain Exact Surface Contract

## 目标

冻结 `D1` 这组 domain exact surface 的最终去向。

本页要裁三件事：

- `@logixjs/domain` root 到底还配继续保留哪些 noun
- `./Crud` 是否还配继续作为单独公开入口存在
- 当前 `./*` wildcard 与 domain/toolkit 分工是否还成立

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `D1` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `D1`
- 本页不再把 [../ssot/runtime/08-domain-packages.md](../ssot/runtime/08-domain-packages.md) 当 exact authority 使用
- 本页只审 `@logixjs/domain` 的 exact root、`./Crud` 与 wildcard

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

- `Crud` 是否还配继续作为公开 noun
- root 是否只该保留极薄 type barrel，还是继续公开具体 kit contract
- `./Crud` 是否真是最小公开入口
- `./*` wildcard 是否必须删除
- domain 与 toolkit 的分工是否还要继续收口

## 当前 challenge override

下面这些 live 语句在本页只算 prior baseline witness，不算默认结论：

- `@logixjs/domain` 是 program-first pattern kits 包
- root 当前主要暴露 `Crud` 相关类型
- `./Crud` 继续作为公开 kit 入口
- `./*` wildcard 继续存在

原因：

- 这些对象目前主要靠 package exports、root type barrel 与 boundary tests 存活
- 在零存量用户前提下，它们都必须重新证明 `why-public / why-root-or-subpath / why-not-internal-or-toolkit`

## 当前 scope

- root:
  - thin type barrel
  - `Crud` 相关公开类型
- subpath:
  - `./Crud`
- wildcard:
  - `./*`

## 目标论点

当前待审目标论点固定为：

> `D1` 应冻结为 root-minimized domain contract。
> `@logixjs/domain` root 默认不自动保留过宽 type barrel 与 wildcard。
> 除非能证明 `why-public / why-root-or-subpath / why-not-internal-or-toolkit`，否则默认继续收口。

## adopted candidate

本轮 adopted candidate 已冻结为：

- `D1 Rootless Crud Minimal Contract`

冻结结果如下：

- `@logixjs/domain` root 退出 exact public surface
- `./*` 删除
- 继续保留的唯一显式入口固定为：
  - `@logixjs/domain/Crud`

这个入口只保留：

- `make`
- `CrudProgram`
- `CrudSpec`
- `CrudApi`

下面这些对象全部退出 exact public surface：

- `CrudCommandsHandle`
- `CrudHandleExt`
- 其余 root thin type barrel
- 其余由 `./*` 隐式抬升的顶层文件

owner split 固定为：

- `@logixjs/domain` 只持有 CRUD 语义、DSL、默认行为与最小 `./Crud` contract
- `@logixjs/toolkit` 只持有未来跨领域的 commands sugar、recipe、preset、wrapper

## Row Sheet

| surface | current-reach | candidate-disposition | main challenge |
| --- | --- | --- | --- |
| root thin type barrel | root | `delete-first` | 是否还需要作为独立 root 继续存在 |
| `./Crud` | explicit subpath | `keep-canonical-default` | CRUD program kit 是否仍是最小公开入口 |
| `./*` | wildcard subpath | `delete-first` | wildcard 是否必须删除 |
| `CrudCommandsHandle` 及相关类型 | root types | `delete-first` | 类型面是否比运行时注入面更宽、是否应收口 |

## 当前一句话结论

`D1` 已冻结为 `Rootless Crud Minimal Contract`：`@logixjs/domain` root 与 `./*` 全部退出 exact public surface，只保留 `@logixjs/domain/Crud` 这一条最小 CRUD program-kit 入口。
