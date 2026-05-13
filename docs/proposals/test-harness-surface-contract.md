---
title: Test Harness Surface Contract
status: living
owner: test-harness-surface
target-candidates:
  - docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md
  - docs/ssot/runtime/09-verification-control-plane.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-18
---

# Test Harness Surface Contract

## 目标

冻结 `T2` 这组 test harness surface 的最终去向。

本页要裁三件事：

- `@logixjs/test` 到底还配继续公开哪些 root 与 subpath
- `Act` 这类经 `@logixjs/core/repo-internal/* contracts` 直连宿主调度的 escape hatch 是否还配留在公开面
- test harness 的 owner law 与 public surface 是否还能继续收成同一条最小 contract

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `T2` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `T2`
- `runtime/04` 与 `runtime/09` 只作 authority input，不作 exact authority

## 当前 authority baseline

- [../ssot/runtime/04-capabilities-and-runtime-control-plane.md](../ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../ssot/runtime/09-verification-control-plane.md](../ssot/runtime/09-verification-control-plane.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)

## north-star-only freeze

本页 review 只把北极星当作固定前提：

- AI Native first
- Agent first runtime
- 更小、更一致、更可推导的公开面优先

除此之外，下面这些点全部允许被挑战：

- `TestRuntime / TestProgram / Execution / Assertions / Vitest / Act` 的全部公开价值
- root 与 subpath 是否都该继续保留
- `Act` 是否仍应继续作为公开逃生口
- test harness 是否该收口为只消费统一 verification control plane 的最小表面

## 当前 challenge override

下面这些 live 语句在本页只算 prior baseline witness，不算默认结论：

- `@logixjs/test` root 当前继续公开 `TestRuntime / TestProgram / Execution / Assertions / Vitest / Act`
- `./TestRuntime / ./TestProgram / ./Execution / ./Assertions / ./Vitest` 继续全部保留
- `Act` 虽然没有 subpath，但默认继续占 root

原因：

- 这些对象大多只是当前 package exports、root barrel 和测试样例的存活 witness
- 在零存量用户前提下，它们都必须重新证明 `why-public / why-root-or-subpath / why-not-internal`

## 当前 scope

- root:
  - `TestRuntime`
  - `TestProgram`
  - `Execution`
  - `Assertions`
  - `Vitest`
  - `Act`
- subpaths:
  - `./TestRuntime`
  - `./TestProgram`
  - `./Execution`
  - `./Assertions`
  - `./Vitest`

## 目标论点

当前待审目标论点固定为：

> `T2` 应冻结为 harness-minimized contract。
> `@logixjs/test` 默认不自动保留 escape hatch 与过宽 root roster。
> 除非能证明 `why-public / why-root-or-subpath / why-not-internal`，否则默认继续收口。

## adopted candidate

本轮 adopted candidate 已冻结为：

- `T2 Root-Minimized TestProgram Harness Contract`

冻结结果如下：

- `@logixjs/test` public survivor set 只保留：
  - root `TestProgram`

下面这些对象全部退出 exact public surface：

- `TestRuntime`
- `Execution`
- `Assertions`
- `Vitest`
- `Act`
- `./TestRuntime`
- `./TestProgram`
- `./Execution`
- `./Assertions`
- `./Vitest`

概念回收规则固定为：

- `TestProgram` 继续承接最小 harness 与 test consumer surface
- `TestRuntime / Assertions / Act` 全部回收到 internal 或 core testkit
- `Vitest` 只配 supporting residue，不再占 exact public surface
- `Execution` 的结果断言 helper 并回 `TestProgram` consumer law，不再独立成 noun

## Row Sheet

| surface | current-reach | candidate-disposition | main challenge |
| --- | --- | --- | --- |
| `TestRuntime` | root + subpath | `keep-canonical-default` | 是否仍是最小 harness 入口 |
| `TestProgram` | root + subpath | `keep-canonical-default` | 是否仍是最小 program harness 入口 |
| `Execution` | root + subpath | `keep-canonical-default` | 结果断言 helper 是否仍需继续公开 |
| `Assertions` | root + subpath | `delete-first` | 是否与 `Execution` 重复，或应回收到 harness 内部 |
| `Vitest` | root + subpath | `delete-first` | 是否只是 runner binding supporting surface |
| `Act` | root only | `delete-first` | InternalContracts 直连宿主调度的 escape hatch 是否应继续公开 |

## 当前一句话结论

`T2` 已冻结为 `Root-Minimized TestProgram Harness Contract`：`@logixjs/test` 只保留 root `TestProgram`，其余 root、subpath 与 `Act` 全部退出 exact public surface。
