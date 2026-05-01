---
title: Core Canonical Spine Final Shape Contract
status: living
owner: core-canonical-spine-final-shape
target-candidates:
  - docs/ssot/runtime/01-public-api-spine.md
  - docs/ssot/runtime/03-canonical-authoring.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-18
---

# Core Canonical Spine Final Shape Contract

## 目标

冻结 `C1` 这组 core canonical spine 的最终形状。

本页要裁两件事：

- `@logixjs/core` 里到底哪些对象还配叫 canonical spine
- canonical spine 与 support / expert residual 的边界到底画在哪里

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `C1` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `C1`
- 本页只审 canonical spine 本身，不顺手吞掉 `C2`
- 本页必须给出 root 与 subpath 的最终裁决口径

## 当前 authority baseline

- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/03-canonical-authoring.md](../ssot/runtime/03-canonical-authoring.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)

## 当前 challenge override

下面这些 live 语句在本页只算 prior baseline witness，不算默认结论：

- `C1` 清单里把 `ModuleTag / Bound / Handle / State / Actions / Action` 一起打包进 canonical spine
- root barrel allowlist 当前把大量 support / expert surface 视作默认合理的 root 公开面
- root 与 subpath 只要都存在，就默认算合理分层

原因：

- 当前主链已经在 live SSoT 里压到 `Module / Logic / Program / Runtime`
- 若继续把 support types、identity types、reader helpers 也打包叫 canonical spine，主链会再次膨胀
- `C1` 若不先切清主链与 support 边界，`C2` 就会失去独立问题定义

## north-star-only freeze

本页 review 只把北极星当作固定前提：

- AI Native first
- Agent first runtime
- 更小、更一致、更可推导的公开面优先

除此之外，下面这些点全部允许被挑战：

- 当前 `C1` 分块本身
- 本页的 `目标论点`
- live SSoT 里现有的 quartet 表述
- `Logic` 是否必须保留独立 root namespace
- `ModuleTag` 是否还配留在 mainline
- root 与 subpath 是否都该继续保留
- 当前 tests / exports / barrel 的 witness 口径

也就是说，本页里的 row sheet 只是 review 输入，不是预设答案。

### explicit override matrix

| surface | superseded authority | future live-doc owner |
| --- | --- | --- |
| `Module / Logic / Program / Runtime` 被默认视为无需再挑战的 canonical quartet | `runtime/01` 与 `runtime/03` 中把 quartet 当现成主链的语句 | `C1` freeze 结果回写到 `runtime/01 + runtime/03 + guardrails` |
| `ModuleTag / Bound / Handle / State / Actions / Action` 被默认并入 canonical spine | 总清单 `C1` 行与 `packages/logix-core/src/index.ts` 当前 root 暴露 | `C1` freeze 结果回写到总清单；若移出主链，再交给 `C2` 或删除路径 owner |
| root barrel allowlist 被默认当作 canonical 真相源 | `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts` | `C1` freeze 结果回写到 barrel contract tests |

## 核心问题

这轮先问下面这些问题：

1. `Module / Logic / Program / Runtime` 之外，是否还有对象配继续进入 canonical spine
2. root `Logix.*` 到底应该承接“主链”还是“全家桶入口”
3. `ModuleTag / Bound / Handle / State / Actions / Action` 是主链组成部分，还是 support / expert adjacency
4. 若 support surface 仍保留，它们是否还该占 root，还是只配停在 subpath
5. `C1` 与 `C2` 的切面若不立刻切开，会不会把 canonical freeze 重新变成大杂烩

## 目标论点

当前待审目标论点固定为：

> `C1` 应冻结为 quartet-first contract。
> `Module / Logic / Program / Runtime` 是唯一 canonical mainline。
> 其余 `ModuleTag / Bound / Handle / State / Actions / Action` 只允许以 support adjacency 身份存活，并且必须重新证明自己为何仍该占 root、为何不应移交 `C2`、或为何不该直接退出公开主链叙事。

## adopted candidate

本轮 adopted candidate 已冻结为：

- `MPR-3 Spine`

冻结结果如下：

- canonical mainline 公式固定为：
  - `Module.logic(...)`
  - `Program.make(Module, { initial, capabilities, logics })`
  - `Runtime.make(Program)`
- root canonical noun 固定为：
  - `Module`
  - `Program`
  - `Runtime`
- `Logic` 继续存在于 canonical authoring，但只以 `Module.logic(...)` 方法位进入主链
- `Logix.Logic` / `./Logic` 退出 `C1` canonical-mainline 身份，后续去向改由 implementation plan 与 `C2` witness 切面承接
- `ModuleTag` 退出 `C1` mainline，authority 改挂到 React host law 与后续 residual owner
- `Bound / Handle / State / Actions / Action` 全部退出 `C1`

## Admissibility Table

### 可作为 survival proof 的证据

- 删除或降级后，会新长出更大的公开主链
- 删除或降级后，Agent authoring 明显更难生成或更难校验
- 删除或降级后，root / subpath 会形成更差的双入口关系
- 候选对象能给出明确 `why-mainline / why-root / why-not-C2`

### 只能算 witness 的证据

- 现在还在 root 暴露
- 现在还有对称 subpath
- 现在测试 allowlist 还在承认
- 以前为了类型便利或 namespace 完整度加过
- 它和 canonical quartet 常一起出现

这些 witness 最多只影响：

- `migration-cost`
- `docs cleanup cost`

不能单独影响：

- `canonical-mainline`
- `why-root`

## Row Sheet

| surface | current-reach | candidate-disposition | main challenge |
| --- | --- | --- | --- |
| `Module` | root + `./Module` | `keep-canonical` | `Module` 是否继续同时占 root 与 subpath |
| `Logic` | root + `./Logic` | `remove-from-mainline-adopted` | canonical 主链是否只保留 `Module.logic(...)` |
| `Program` | root + `./Program` | `keep-canonical` | `Program` 是否继续同时占 root 与 subpath |
| `Runtime` | root + `./Runtime` | `keep-canonical` | `Runtime` 是否继续同时占 root 与 subpath |
| `ModuleTag` | root + `./ModuleTag` | `remove-from-mainline-adopted` | host lookup authority 是否足以让它留在 `C1` |
| `Bound` | root + `./Bound` | `remove-from-mainline-adopted` | 它是否只是 support / expert adjacency |
| `Handle` | root + `./Handle` | `remove-from-mainline-adopted` | 它是否只是 read-side vocabulary |
| `State` | root + `./State` | `remove-from-mainline-adopted` | 类型便利是否足以占据 canonical spine |
| `Actions` | root + `./Actions` | `remove-from-mainline-adopted` | 类型便利是否足以占据 canonical spine |
| `Action` | root only | `remove-from-mainline-adopted` | root-only namespace 是否还能成立 |

## 冻结门槛

`remove-from-mainline-default` 的对象只有同时补齐下面三项，才允许继续留在 `C1`：

- `why-mainline`
- `why-root`
- `why-not-C2`

缺任一项，默认退出 canonical spine 叙事。

## C1 与 C2 的切面

本页预设的切面固定为：

- `C1` 只回答 canonical spine 的主链与最小 support 邻接
- `C2` 负责 read / projection / control-plane / evidence / root residual

因此本页不直接裁下面这些对象：

- `ReadQuery`
- `ExternalStore`
- `Resource`
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
- `EffectOp`
- `InternalContracts`
- `MatchBuilder`

它们全部仍由 `C2` 承接。

## 预期去向

本页消费后，后续至少要同步回写：

- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/03-canonical-authoring.md`
- `docs/standards/logix-api-next-guardrails.md`
- `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
- `packages/logix-core/package.json`
- `packages/logix-core/src/index.ts`
- `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- `packages/logix-core/test/Logix/Logix.test.ts`
- `packages/logix-core/test/Contracts/KernelBoundary.test.ts`
- 必要的 root/subpath reachability witness

## 当前一句话结论

`C1` 已冻结为 `MPR-3 Spine`：canonical mainline 固定为 `Module.logic(...) -> Program.make(...) -> Runtime.make(...)`，root canonical noun 固定为 `Module / Program / Runtime`；`Logic` namespace、`ModuleTag` 与其余 support surface 全部退出 `C1`。
