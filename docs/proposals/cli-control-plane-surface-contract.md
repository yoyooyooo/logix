---
title: CLI Control Plane Surface Contract
status: living
owner: cli-control-plane-surface
target-candidates:
  - docs/ssot/runtime/09-verification-control-plane.md
  - docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-18
---

# CLI Control Plane Surface Contract

## 目标

冻结 `T1` 这组 CLI control-plane surface 的最终去向。

本页要裁三件事：

- `@logixjs/cli` 到底还配继续公开哪些 root / subpath / bin surface
- canonical route 是否只收成 `logix check / trial / compare`
- `Commands / ./Commands / logix-devserver` 与 archived residue 是否全部退出

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `T1` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `T1`
- 本页不把 [../ssot/runtime/09-verification-control-plane.md](../ssot/runtime/09-verification-control-plane.md) 当 exact authority 使用
- `runtime/09` 只作为 authority input，负责约束 CLI 的 route owner 与 report contract

## 当前 authority baseline

- [../ssot/runtime/09-verification-control-plane.md](../ssot/runtime/09-verification-control-plane.md)
- [../ssot/runtime/04-capabilities-and-runtime-control-plane.md](../ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)

## north-star-only freeze

本页 review 只把北极星当作固定前提：

- AI Native first
- Agent first runtime
- 更小、更一致、更可推导的公开面优先

除此之外，下面这些点全部允许被挑战：

- `Commands` root 与 `./Commands` 的继续公开资格
- `logix-devserver` 的存活资格
- `describe / ir.* / anchor.* / contract-suite.run / transform.module` 是否还配继续停在公开 CLI surface
- canonical route 是否该继续只留 `check / trial / compare`

## 当前 challenge override

下面这些 live 语句在本页只算 prior baseline witness，不算默认结论：

- `Commands` 继续作为 `@logixjs/cli` root 公开面
- `./Commands` 继续作为程序化命令族存在
- `logix-devserver` 继续作为 bin 存在
- `describe / ir.* / anchor.* / contract-suite.run / transform.module` 继续作为公开 expert residue 存在

原因：

- 这些对象大多只是当前 package exports、bin 与 tests 的存活 witness
- 在零存量用户前提下，这组对象都必须重新证明 `why-public / why-root-or-bin / why-not-archived`

## 当前 scope

- root:
  - `Commands`
- subpath:
  - `./Commands`
- bin:
  - `logix`
  - `logix-devserver`
- commands:
  - `check`
  - `trial`
  - `compare`
  - `describe`
  - `ir.export`
  - `ir.validate`
  - `ir.diff`
  - `contract-suite.run`
  - `anchor.index`
  - `anchor.autofill`
  - `transform.module`

## 目标论点

当前待审目标论点固定为：

> `T1` 应冻结为 route-minimized CLI contract。
> canonical CLI route 默认只保留 `logix check / trial / compare`。
> 除非能证明 `why-public / why-root-or-bin / why-not-archived`，否则 `Commands`、`./Commands`、`logix-devserver` 与其余 expert residue 默认继续收口。

## adopted candidate

本轮 adopted candidate 已冻结为：

- `Route-Minimal Runtime CLI Contract`

冻结结果如下：

- public survivor set 只保留：
  - `bin: logix`
- canonical public route 只保留：
  - `logix check`
  - `logix trial`
  - `logix compare`

下面这些对象全部退出公开 CLI surface：

- `Commands`
- `./Commands`
- `logix-devserver`
- `describe`
- `ir.export`
- `ir.validate`
- `ir.diff`
- `anchor.index`
- `anchor.autofill`
- `contract-suite.run`
- `transform.module`

概念回收规则固定为：

- CLI route 概念回收到 `runtime control plane`
- 程序化契约回收到 `@logixjs/core/ControlPlane` 与 `Runtime.trial`
- 低层执行、artifact、diff、proof 内核继续下沉到 core `internal/verification/**`
- 若未来还保留一部分 residue，它们只配 expert route 或仓内维护级入口

## Row Sheet

| surface | current-reach | candidate-disposition | main challenge |
| --- | --- | --- | --- |
| `Commands` | root | `delete-first` | root 程序化入口是否还必须继续公开 |
| `./Commands` | subpath | `delete-first` | 程序化命令族是否还必须继续公开 |
| `logix` | bin | `keep-canonical-default` | canonical route 是否仍应只保留 check/trial/compare |
| `logix-devserver` | bin | `delete-first` | archived residue 是否应直接退出 |
| `describe / ir.* / anchor.* / contract-suite.run / transform.module` | `logix` 子命令 | `delete-first` | 这些 expert residue 是否还应继续停在公开 CLI surface |

## 当前一句话结论

`T1` 已冻结为 `Route-Minimal Runtime CLI Contract`：公开 CLI surface 只保留 `bin: logix` 与 `check / trial / compare`，其余 root、subpath、bin 和 archived 命令全部退出公开面。
