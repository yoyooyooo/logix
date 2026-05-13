---
title: Core Residual Adjunct Contract
status: living
owner: core-residual-adjunct
target-candidates:
  - docs/ssot/runtime/01-public-api-spine.md
  - docs/ssot/runtime/03-canonical-authoring.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/ssot/runtime/11-toolkit-layer.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-18
---

# Core Residual Adjunct Contract

## 目标

作为 `C2A`，冻结 core residual adjunct surface 的最终去向。

本页要裁三件事：

- `MPR-3 Spine` 之外这组 adjunct residual 里，哪些对象还配继续公开
- 哪些对象若继续公开，只配停在 subpath
- 哪些对象应转 internal 或 toolkit

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `C2A` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `C2A`
- 本页只审 carry-over support、read/projection 与 runtime adjunct residual
- 本页不再混入 verification / evidence / kernel family

## 当前 authority baseline

- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/03-canonical-authoring.md](../ssot/runtime/03-canonical-authoring.md)
- [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)
- [./core-canonical-spine-final-shape-contract.md](./core-canonical-spine-final-shape-contract.md)
- [./core-residual-surface-contract.md](./core-residual-surface-contract.md)

## north-star-only freeze

本页 review 只把北极星当作固定前提：

- AI Native first
- Agent first runtime
- 更小、更一致、更可推导的公开面优先

除此之外，下面这些点全部允许被挑战：

- `C2A` 这个切面本身
- `Logic / ModuleTag / Bound / Handle / State / Actions / Action` 的剩余公开价值
- `ReadQuery / ExternalStore / Resource` 是否还该继续公开
- `ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp / MatchBuilder` 是否还该存在于 core
- subpath 的默认保留资格
- toolkit 是否比 core / internal 更适合承接某些 sugar 或 helper

## 当前 challenge override

下面这些 live 语句在本页只算 prior baseline witness，不算默认结论：

- `@logixjs/core/Logic` 在 root canonical 退出后仍默认继续公开
- `ModuleTag` 因为 host law 使用，所以默认继续停在 core subpath
- `ReadQuery / ExternalStore / Resource` 继续默认作为 expert residual 公开存在
- `Root / Env / Platform / Middleware / ScopeRegistry / InternalContracts` 只是因为目前有 root 或 subpath，所以默认继续存在

原因：

- 它们大多只是历史便利面、support vocabulary、或者当前实现链露出的壳层
- 在零存量用户前提下，这组对象都必须重新证明 `why-public / why-subpath / why-not-internal`

## 当前 scope

- `Action`
- `./Actions`
- `./Bound`
- `./Handle`
- `./Logic`
- `./ModuleTag`
- `./State`
- `MatchBuilder`
- `./ReadQuery`
- `./ExternalStore`
- `./Resource`
- `ScopeRegistry`
- `Root`
- `Env`
- `Platform`
- `Middleware`
- `InternalContracts`
- `./EffectOp`

## 核心问题

这轮先问下面这些问题：

1. `Logic / ModuleTag / Bound / Handle / State / Actions / Action` 里，还有没有对象配继续停在 public core
2. `ReadQuery / ExternalStore / Resource` 是真正的 protocol，还是只是当前实现便利壳层
3. `ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp / MatchBuilder` 是否应继续存在于 core
4. 哪些对象若还保留，应转 expert subpath
5. 哪些对象若保留，应转 toolkit 或 test-only surface

## 目标论点

当前待审目标论点固定为：

> `C2A` 应冻结为 root-zero adjunct contract。
> 这组对象默认没有任何 root 生存权。
> 除非能证明 `why-public / why-subpath / why-not-internal-or-toolkit`，否则默认 internalize、toolkitize 或 delete。

## adopted candidate

本轮 adopted candidate 已冻结为：

- `C2A Three-Owner Residual Split Contract`

冻结结果如下：

- `C2A` 单块方案被推翻
- 下一轮不再硬审一个混合 carry-over support、read/projection、runtime adjunct 的大块
- `C2A` 先拆成三个更小 owner 面：
  - `C2A1 Core Carry-Over Support Contract`
  - `C2A2 Core Read Projection Protocol Contract`
  - `C2A3 Core Runtime Adjunct Escape Hatch Contract`
- `C2A1` 承接：
  - `Action`
  - `./Actions`
  - `./Bound`
  - `./Handle`
  - `./Logic`
  - `./ModuleTag`
  - `./State`
- `C2A2` 承接：
  - `./ReadQuery`
  - `./ExternalStore`
  - `./Resource`
- `C2A3` 承接：
  - `MatchBuilder`
  - `ScopeRegistry`
  - `Root`
  - `Env`
  - `Platform`
  - `Middleware`
  - `InternalContracts`
  - `./EffectOp`
- reviewer 当前共同指向的强方向是：
  - `C2A` public core survivor set 可能为零
  - `./ModuleTag` 是最难删的一项，但也只构成 host concept witness，不自动构成 public surface 生存权

## Row Sheet

| surface | current-reach | candidate-disposition | main challenge |
| --- | --- | --- | --- |
| `Action` | root only | `delete-first` | root-only namespace 是否仍有公开意义 |
| `./Actions` | subpath only | `delete-first` | 纯类型便利是否足以继续公开 |
| `./Bound` | subpath only | `delete-first` | 是否只是 `Module.logic` 之外的残余壳层 |
| `./Handle` | subpath only | `delete-first` | 是否只是 vocabulary helper，而非 owner truth |
| `./Logic` | subpath only | `delete-first` | root canonical 退出后，subpath 是否还有独立存在理由 |
| `./ModuleTag` | subpath only | `delete-first` | host lookup owner 是否足以让它继续停在 core |
| `./State` | subpath only | `delete-first` | 纯类型便利是否应继续公开 |
| `MatchBuilder` | root only | `delete-first` | 是否只是历史便利面 |
| `./ReadQuery` | subpath only | `delete-first` | 是否应继续公开成 read-side protocol |
| `./ExternalStore` | subpath only | `delete-first` | 是否应继续公开成 source adapter family |
| `./Resource` | subpath only | `delete-first` | 是否应继续公开成 resource spec family |
| `ScopeRegistry` | root only | `delete-first` | scope-bound registry 是否应继续公开 |
| `Root` | root + `./Root` | `delete-first` | root provider resolution 是否应继续公开 |
| `Env` | root + `./Env` | `delete-first` | env helper 是否配继续占 core |
| `Platform` | root + `./Platform` | `delete-first` | host/platform bridge 是否该继续留在 core |
| `Middleware` | root + `./Middleware` | `delete-first` | EffectOp middleware shell 是否有公开价值 |
| `InternalContracts` | root only | `delete-first` | in-repo integration surface 是否还配公开 |
| `./EffectOp` | subpath only | `delete-first` | effect-op shell 是否应继续公开 |

## 冻结门槛

所有 `delete-first` 的对象只有同时补齐下面三项，才允许继续保留：

- `why-public`
- `why-subpath`
- `why-not-internal-or-toolkit`

缺任一项，默认不保留。

## 当前一句话结论

`C2A` 单块方案已被冻结为三切面 split：下一轮分别审 `carry-over support`、`read projection protocol`、`runtime adjunct escape hatch`，不再把三类不同 owner 混在一页。
