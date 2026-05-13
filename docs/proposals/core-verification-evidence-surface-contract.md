---
title: Core Verification And Evidence Surface Contract
status: living
owner: core-verification-evidence-surface
target-candidates:
  - docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md
  - docs/ssot/runtime/09-verification-control-plane.md
  - docs/ssot/runtime/11-toolkit-layer.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-18
---

# Core Verification And Evidence Surface Contract

## 目标

作为 `C2B`，冻结 core verification / evidence / kernel surface 的最终去向。

本页要裁三件事：

- 这组对象里，哪些还配继续公开
- verification、evidence、kernel 这三条线的 owner 是否应合并
- 若继续公开，哪些只配停在 expert subpath

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `C2B` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `C2B`
- 本页只审 verification / evidence / kernel residual
- 本页不再混 carry-over support、read/projection、runtime adjunct

## 当前 authority baseline

- [../ssot/runtime/04-capabilities-and-runtime-control-plane.md](../ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../ssot/runtime/09-verification-control-plane.md](../ssot/runtime/09-verification-control-plane.md)
- [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)
- [./core-residual-surface-contract.md](./core-residual-surface-contract.md)

## north-star-only freeze

本页 review 只把北极星当作固定前提：

- AI Native first
- Agent first runtime
- 更小、更一致、更可推导的公开面优先

除此之外，下面这些点全部允许被挑战：

- `ControlPlane / Debug / Observability / Reflection / Kernel` 的全部公开价值
- 这组对象当前分成多 owner 的做法
- root 与 subpath 的现行分布
- expert route 的默认保留资格
- toolkit 是否比 core 更适合承接未来 DX 层

## 当前 challenge override

下面这些 live 语句在本页只算 prior baseline witness，不算默认结论：

- `@logixjs/core/ControlPlane` 继续作为 shared control-plane contract 公开存在
- `Debug` 继续作为公开 diagnostics / sink / devtools family 存在
- `Observability` 与 `Reflection` 继续作为公开 evidence / export expert route 存在
- `Kernel` 继续作为公开 runtime upgrade / experimental route 存在

原因：

- 它们当前大多只是实现链、tests 或现行 docs 的存活 witness
- 在零存量用户前提下，它们都必须重新证明 `why-public / why-root-or-subpath / why-not-internal-or-toolkit`

## 当前 scope

- `./ControlPlane`
- `Debug`
- `Observability`
- `Reflection`
- `Kernel`

## 核心问题

这轮先问下面这些问题：

1. verification / evidence / kernel 里，到底还有哪些对象配继续公开
2. `ControlPlane / Observability / Reflection` 是否应合并成同一 owner family
3. `Debug` 是否真需要作为公开 family 存在
4. `Kernel` 是否真需要作为公开 route 存在
5. 哪些对象若未来还要活，只配停在 expert subpath，哪些应直接 internalize

## 目标论点

当前待审目标论点固定为：

> `C2B` 应冻结为 root-zero verification/evidence contract。
> 这组对象默认没有继续停在 root 的生存权。
> 除非能证明 `why-public / why-subpath / why-not-internal-or-toolkit`，否则默认 internalize。

## adopted candidate

本轮 adopted candidate 已冻结为：

- `VerificationControlPlane`

冻结结果如下：

- root public survivor set 归零
- `Debug`
- `Observability`
- `Reflection`
- `Kernel`

这 4 项全部退出 public core。

唯一继续公开的对象固定为：

- `./ControlPlane`

它的公开内容只允许保留：

- `stage`
- `mode`
- `report`
- `artifact ref`
- `repair hint`

owner 归并规则固定为：

- `ControlPlane / Observability / Reflection` 的 owner 统一归到 `runtime verification/evidence`
- 其中只有 `ControlPlane` 继续承担 shared protocol shell
- `Observability / Reflection` 全部 internalize
- `Kernel` 不并入上面这组，单独归 `runtime upgrade / experimental gate` owner，并退出公开面
- `Debug` internalize；其概念分别回收到 `Runtime`、`@logixjs/devtools-react` 与 internal runtime debug layer

## Row Sheet

| surface | current-reach | candidate-disposition | main challenge |
| --- | --- | --- | --- |
| `./ControlPlane` | subpath only | `delete-first` | shared shell 是否真是最小 owner |
| `Debug` | root + `./Debug` | `delete-first` | diagnostics / sink / devtools family 是否过宽 |
| `Observability` | root + `./Observability` | `delete-first` | evidence route 是否应继续独立公开 |
| `Reflection` | root only | `delete-first` | export / verify helper 是否应继续独立公开 |
| `Kernel` | root + `./Kernel` | `delete-first` | runtime upgrade / experimental route 是否应继续公开 |

## 当前一句话结论

`C2B` 已冻结为 `VerificationControlPlane`：root survivor 归零，只保留 `./ControlPlane` 这一条最小 verification contract subpath；`Debug / Observability / Reflection / Kernel` 全部退出公开面。
