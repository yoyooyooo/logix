---
title: Core Read Projection Protocol Contract
status: consumed
owner: core-read-projection-protocol
target-candidates:
  - docs/ssot/runtime/01-public-api-spine.md
  - docs/ssot/runtime/11-toolkit-layer.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-21
---

# Core Read Projection Protocol Contract

## 目标

作为 `C2A2`，冻结 read/projection protocol residual 的最终去向。

本页要裁三件事：

- `ReadQuery / ExternalStore / Resource` 是否还配继续公开
- 若继续公开，是否只配停在 expert subpath
- 哪些应直接 internalize，哪些若未来还想活只配去 toolkit

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `C2A2` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `C2A2`
- 本页的 exact owner map 与 split gate，进一步统一看 [ReadQuery ExternalStore Resource Final Owner Map Contract](./read-query-external-store-resource-final-owner-map-contract.md)
- 本页后续实施入口，拆成 [ReadQuery Selector Law Internalization Contract](./read-query-selector-law-internalization-contract.md) 与 [ExternalStore Runtime Seam Cutover Contract](./external-store-runtime-seam-cutover-contract.md)；`Resource` owner relocation 交给 query owner 子 proposal
- 本页只审 read/projection protocol
- 本页不再混 carry-over support、runtime adjunct、verification/evidence

## 当前 authority baseline

- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)
- [./core-residual-adjunct-contract.md](./core-residual-adjunct-contract.md)

## north-star-only freeze

本页 review 只把北极星当作固定前提：

- AI Native first
- Agent first runtime
- 更小、更一致、更可推导的公开面优先

除此之外，下面这些点全部允许被挑战：

- `ReadQuery / ExternalStore / Resource` 的全部公开价值
- protocol 这个分组本身
- subpath 的默认保留资格
- toolkit 是否比 core 更适合承接可能存在的 DX sugar

## 当前 challenge override

下面这些 live 语句在本页只算 prior baseline witness，不算默认结论：

- `ReadQuery / ExternalStore / Resource` 继续默认作为 expert residual 公开存在
- `ReadQuery` 继续被当作 read-side protocol
- `ExternalStore` 继续被当作 source adapter family
- `Resource` 继续被当作 resource spec family

原因：

- 这些对象当前主要靠 subpath exports、测试和实现链存活
- 它们是否必须作为 public core protocol 存在，还没有被证明

## 当前 scope

- `./ReadQuery`
- `./ExternalStore`
- `./Resource`

## 目标论点

当前待审目标论点固定为：

> `C2A2` 应冻结为 public-zero read projection contract。
> `ReadQuery / ExternalStore / Resource` 默认没有继续停在 public core 的生存权。
> 除非能证明 `why-public / why-subpath / why-not-internal-or-toolkit`，否则默认 internalize。

## adopted candidate

本轮 adopted candidate 已冻结为：

- `C2A2 Public-Zero Read Projection Cut Contract`

冻结结果如下：

- `./ReadQuery`
- `./ExternalStore`
- `./Resource`

这 3 项全部退出 public core。

概念回收规则固定为：

- `ReadQuery` 概念回收到统一 selector law，也就是 `useSelector(handle, selector)` 与 core 内部的 selector compile / static IR / strict gate / runtime read metadata
- `ExternalStore` 能力回收到内部 ingest/install 协议；若未来还要 DX 入口，只配由 `@logixjs/toolkit` 提供薄 helper
- `Resource` 能力优先回收到 `@logixjs/query` owner；只有出现跨领域高频共性后，才允许由 toolkit 提供薄包装

## Row Sheet

| surface | current-reach | candidate-disposition | main challenge |
| --- | --- | --- | --- |
| `./ReadQuery` | subpath only | `delete-first` | 是否真是不可替代的公开 protocol |
| `./ExternalStore` | subpath only | `delete-first` | 是否真是不可替代的 source adapter family |
| `./Resource` | subpath only | `delete-first` | 是否真是不可替代的 resource spec family |

## 当前一句话结论

`C2A2` 已冻结为 public-zero read projection contract：`ReadQuery / ExternalStore / Resource` 全部退出 public core，概念分别回收到 selector law、内部 ingest/install 协议与 query owner。

## 去向

- 消费日期：2026-04-21
- 已拆分并由以下 proposal 完成落地：
  - `docs/proposals/read-query-selector-law-internalization-contract.md`
  - `docs/proposals/external-store-runtime-seam-cutover-contract.md`
  - `docs/proposals/resource-query-owner-relocation-contract.md`
- 已回写：
  - `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - `docs/ssot/runtime/08-domain-packages.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/runtime/11-toolkit-layer.md`
