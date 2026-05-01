---
title: Core Residual Surface Contract
status: living
owner: core-residual-surface
target-candidates:
  - docs/ssot/runtime/01-public-api-spine.md
  - docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md
  - docs/ssot/runtime/09-verification-control-plane.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/ssot/runtime/11-toolkit-layer.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-18
---

# Core Residual Surface Contract

## 目标

冻结 `C2` 这组 core residual surface 的最终去向。

本页要裁三件事：

- `@logixjs/core` 里，`MPR-3 Spine` 之外还有哪些对象配继续公开
- 这些 residual 对象是否还配继续占 root
- 若仍继续公开，它们应停在 expert subpath、toolkit、internal，还是直接删除

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `C2` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `C2`
- 本页同时承接 `C1` 留下的 core carry-over surfaces
- 本页不重开 `C1 MPR-3 Spine`

## 当前 authority baseline

- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/04-capabilities-and-runtime-control-plane.md](../ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../ssot/runtime/09-verification-control-plane.md](../ssot/runtime/09-verification-control-plane.md)
- [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)
- [./core-canonical-spine-final-shape-contract.md](./core-canonical-spine-final-shape-contract.md)

## north-star-only freeze

本页 review 只把北极星当作固定前提：

- AI Native first
- Agent first runtime
- 更小、更一致、更可推导的公开面优先

除此之外，下面这些点全部允许被挑战：

- 当前 `C2` 分块本身
- 本页的 residual 分组方式
- live SSoT 里仍把某些对象描述成 expert route 的句子
- root 与 subpath 的现行分布
- `C1` 留下的 carry-over 对象是否真的该归 `C2`
- `ControlPlane / Debug / Observability / Reflection / Kernel` 的现有 public 位置
- `ModuleTag / Logic / Bound / Handle / State / Actions / Action` 的剩余公开价值

也就是说，本页里的 row sheet 只是 review 输入，不是预设答案。

## 当前 challenge override

下面这些 live 语句在本页只算 prior baseline witness，不算默认结论：

- `Kernel.ts` 作为显式 kernel expert 入口继续保留
- `Observability` 与 `Reflection` 继续保留 root export
- `runtime control plane` 继续由 `ControlPlane / Debug / Observability / Reflection` 这组 surface 共同承接
- `ReadQuery / ExternalStore / Resource` 继续作为 expert residual 公开存在
- `ModuleTag / Bound / Handle / State / Actions / Action` 只是从 `C1` 退出，因而默认会在 `C2` 存活

原因：

- 这些对象大多只是当前 live docs 或当前 root barrel 的存活 witness
- 它们仍可能过宽、过散、过度占 root、或者只是历史便利壳层
- 在零存量用户前提下，residual 不享有默认保留资格

### explicit override matrix

| surface family | superseded authority | future live-doc owner |
| --- | --- | --- |
| `Kernel / Observability / Reflection` root 存活句子 | `runtime/01` 中仍把它们写成 root surviving expert surface 的语句 | `C2` freeze 结果回写到 `runtime/01 + runtime/04 + runtime/09 + guardrails` |
| `runtime control plane` 现行多对象分摊口径 | `runtime/04`、`runtime/09` 里当前分散的 public names | `C2` freeze 结果回写到 `runtime/04 + runtime/09` |
| `ReadQuery / ExternalStore / Resource` 仍作为 residual 公开存在 | 总清单与当前 `package.json` exports | `C2` freeze 结果回写到总清单与 core package docs |
| `Logic / ModuleTag / Bound / Handle / State / Actions / Action` 作为 `C1` carry-over 默认存活 | `C1` proposal 中“后续去向交给 C2”的语句与现行 subpath/root witness | `C2` freeze 结果回写到总清单与相关 owner docs |

## 当前 residual universe

当前 `C2` 默认读取的 residual universe 固定为：

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
- `Kernel`
- `ScopeRegistry`
- `Root`
- `Env`
- `Platform`
- `Middleware`
- `ControlPlane`
- `Debug`
- `Observability`
- `Reflection`
- `InternalContracts`
- `./EffectOp`

其中：

- 前 7 项是 `C1` carry-over
- 中间 10 项是原始 `C2` residual
- 最后 5 项是 control-plane / evidence / internal-leak residual

## 核心问题

这轮先问下面这些问题：

1. `MPR-3 Spine` 之外，到底还有哪些对象配继续公开
2. 哪些对象只配停在 subpath，不该继续占 root
3. 哪些对象应合并成更小的 owner，避免 public family 继续膨胀
4. 哪些对象只是 internal helper 或 maintainer escape hatch，应直接 internalize
5. 哪些对象若保留，应挂 core、toolkit、test harness、还是别的 owner

## 目标论点

当前待审目标论点固定为：

> `C2` 应冻结为 root-zero-first residual contract。
> `@logixjs/core` root 在 `MPR-3 Spine` 之外，不再自动保留 residual noun。
> 所有 residual surface 都必须重新证明三件事：为什么还该公开、为什么还该占 root 或 subpath、为什么不该转 internal 或 toolkit。

## adopted candidate

本轮 adopted candidate 已冻结为：

- `C2 Two-Cut Split Contract`

冻结结果如下：

- `C2` 单块方案被推翻
- 下一轮不再硬审一个大而散的 residual 超集
- `C2` 先拆成两个更小 owner 面：
  - `C2A Core Residual Adjunct Contract`
  - `C2B Core Verification And Evidence Surface Contract`
- `C2A` 承接：
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
- `C2B` 承接：
  - `./ControlPlane`
  - `Debug`
  - `Observability`
  - `Reflection`
  - `Kernel`
- 本轮只冻结 split，不提前替 `C2A / C2B` 做最终 disposition

## Admissibility Table

### 可作为 survival proof 的证据

- 删除后会新长出更大的公开边界
- 删除后会直接伤害 diagnostics、verification、runtime clarity 或 agent authoring
- 下沉到 subpath / toolkit / internal 后，会明显损伤 owner law 或可诊断性
- 候选对象能给出明确 `why-public / why-root-or-subpath / why-not-internal`

### 只能算 witness 的证据

- 当前 root barrel 还在导出
- 当前 package subpath 还存在
- 当前某几个测试还在引用
- 当前 live docs 还写着 expert route
- 当前 examples 或内部实现链仍然使用

这些 witness 最多只影响：

- `migration-cost`
- `docs cleanup cost`

不能单独影响：

- `public existence`
- `root or subpath right`

## Row Sheet

| surface | current-reach | candidate-disposition | main challenge |
| --- | --- | --- | --- |
| `Action` | root only | `delete-first` | root-only namespace 是否仍有公开意义 |
| `./Actions` | subpath only | `delete-first` | 纯类型便利是否足以继续公开 |
| `./Bound` | subpath only | `delete-first` | 是否只是 `$.use / Module.logic` 之外的残余壳层 |
| `./Handle` | subpath only | `delete-first` | 是否只是 vocabulary helper，而非 owner truth |
| `./Logic` | subpath only | `delete-first` | root canonical 退出后，subpath 是否还有独立存在理由 |
| `./ModuleTag` | subpath only | `delete-first` | host lookup owner 是否足以让它继续停在 core |
| `./State` | subpath only | `delete-first` | 纯类型便利是否应继续公开 |
| `MatchBuilder` | root only | `delete-first` | 是否只是历史便利面 |
| `./ReadQuery` | subpath only | `delete-first` | 是否应继续公开成 read-side protocol |
| `./ExternalStore` | subpath only | `delete-first` | 是否应继续公开成 source adapter family |
| `./Resource` | subpath only | `delete-first` | 是否应继续公开成 resource spec family |
| `Kernel` | root + `./Kernel` | `delete-first` | kernel expert route 是否真需要公开存在 |
| `ScopeRegistry` | root only | `delete-first` | scope-bound registry 是否应继续公开 |
| `Root` | root + `./Root` | `delete-first` | root provider resolution 是否应继续公开 |
| `Env` | root + `./Env` | `delete-first` | env helper 是否配继续占 core |
| `Platform` | root + `./Platform` | `delete-first` | host/platform bridge 是否该继续留在 core residual |
| `Middleware` | root + `./Middleware` | `delete-first` | EffectOp middleware shell 是否有公开价值 |
| `ControlPlane` | root + `./ControlPlane` | `delete-first` | control-plane shell 是否是最小 owner |
| `Debug` | root + `./Debug` | `delete-first` | debug sink + hub + helper family 是否过宽 |
| `Observability` | root + `./Observability` | `delete-first` | evidence route 是否应继续独立公开 |
| `Reflection` | root only | `delete-first` | reflection/export helper 是否应继续独立公开 |
| `InternalContracts` | root only | `delete-first` | in-repo integration surface 是否还配公开 |
| `./EffectOp` | subpath only | `delete-first` | effect-op shell 是否应继续公开 |

## 冻结门槛

所有 `delete-first` 的对象只有同时补齐下面三项，才允许继续保留：

- `why-public`
- `why-root-or-subpath`
- `why-not-internal`

缺任一项，默认不保留。

## 预期去向

本页消费后，后续至少要同步回写：

- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/11-toolkit-layer.md`
- `docs/standards/logix-api-next-guardrails.md`
- `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
- `packages/logix-core/package.json`
- `packages/logix-core/src/index.ts`
- 必要的 core residual witness tests

## 当前一句话结论

`C2` 单块方案已被冻结为 split contract：先拆成 `C2A residual adjunct` 与 `C2B verification/evidence` 两个更小 review 面，再分别决定谁该留、谁该降、谁该删。
