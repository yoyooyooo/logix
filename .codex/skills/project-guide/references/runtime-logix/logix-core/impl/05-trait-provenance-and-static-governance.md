# Trait Provenance & Static Governance（023 · ModuleTraits）

> **Status**: Impl Notes (023 Logic Traits in Setup)
> **Scope**: 解释 Logix 如何用「静态溯源（Static Provenance）+ 图执行（Graph Execution）」治理 Trait 爆炸与可解释性问题，并明确为什么**拒绝** Runtime Listeners。

当业务复杂度上升（大量 Module / Form / Link / Feature Kits 混用）时，Trait 系统最容易“黑盒化”：

- 你能看到某个字段/规则存在（computed/check/link/source），但不知道它是谁声明的；
- 你能看到最终行为，但无法回答“这条规则来自哪个模块/哪个逻辑单元/哪个 kit？”；
- 一旦出现冲突或装配错误，错误往往滞后到运行期才暴露，定位代价极高。

本文件记录 023（Logic Traits in Setup）在实现层的裁决：**Trait 的治理不靠运行时监听，而靠静态快照 + 可导出的溯源索引**。

---

## 目录

- 1. 核心裁决：Static Provenance + Graph Execution
- 2. 总链路：Contribution → Finalize → Snapshot → Install
- 3. Provenance 模型：originType / originId / path
- 4. Snapshot 与 Devtools 回溯：provenanceIndex + trace 事件
- 5. 冲突处理：Duplicate / Missing Requires / Excludes（全静态）
- 6. 为什么拒绝 Runtime Listeners（非目标）
- 7. 实践建议：让溯源稳定、可用、可解释

---

## 1. 核心裁决：Static Provenance + Graph Execution

Logix 的策略是：

1. **Static Provenance（静态溯源）**：所有 trait 声明在模块装配期（setup）被一次性收敛为 `ModuleTraitsSnapshot`，并为每个 `traitId` 写入 `TraitProvenance`。
2. **Graph Execution（图执行）**：运行时只执行“已构建的图与计划”，例如 `StateTraitProgram.graph/plan`；不提供“监听 trait 变更并动态重建图”的能力。

这意味着：

- Trait 的“来源是谁”属于**静态事实**，应该在 **setup** 阶段就被固化；
- Trait 的“怎么执行”属于**图执行**问题，应该由 Program/Plan 驱动并在事务窗口内完成；
- 如果需要动态开关/条件化行为：用 state/Effect 表达（例如 derive 内部根据状态分支、或用 Flow/Logic 编排），而不是在运行期增删 trait 定义。

---

## 2. 总链路：Contribution → Finalize → Snapshot → Install

### 2.1 Contribution：所有来源统一为「贡献」

实现事实源：`packages/logix-core/src/internal/runtime/core/ModuleTraits.ts`

- `TraitContribution = { traits: TraitSpec; provenance: TraitProvenance }`
- `TraitSpec` 是“traits 声明”的最小形态：以 `traitId -> value` 的 object（value 由具体 trait 家族决定；允许包含函数等不可序列化内容）。

两类贡献入口（023）：

1. **Module-level contribution**（模块图纸层）
   - 入口：`packages/logix-core/src/ModuleTag.ts`
   - 在 `ModuleTag.make(id, { traits })` 中将 `def.traits` 注册为 contribution；
   - provenance 固定锚点：`originType="module"`, `originId=<moduleId>`, `originIdKind="explicit"`。

2. **LogicUnit-level contribution**（逻辑单元层）
   - 入口：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` 的 `$.traits.declare(...)`
   - 仅允许在 setup 期调用；run 期调用会抛 `LogicPhaseError(code="traits_declare_in_run")`；
   - provenance 来自“被装配后的逻辑单元身份”（见 3.2）。

### 2.2 Finalize：一次性合并 + 冻结

实现事实源：

- 合并与检测：`packages/logix-core/src/internal/runtime/core/ModuleTraits.ts` 的 `finalizeTraitContributions`
- 执行点：`packages/logix-core/src/ModuleTag.ts` 注入的 internal `traits:finalize` logic

Finalize 的关键约束：

- **单次 finalize**：模块初始化阶段只 finalize 一次，得到最终 merged spec；
- **freeze**：Finalize 后调用 `freezeModuleTraits()`，禁止后续再注册贡献（后续注册会抛 `[ModuleTraitsFrozen] ...`）。

### 2.3 Install：从 merged spec 构造 Program（图）并安装

当前 023 在 `ModuleTag.ts` 的 finalize logic 内：

- 调用 `StateTrait.build(stateSchema, mergedSpec)` 构造 `StateTraitProgram`；
- `yield* StateTrait.install($, program)` 将图执行入口安装到运行时；
- 若最终只有 module-level contribution 且 `ModuleTag.make` 已预构建 `baseProgram`，则复用以避免重复 build。

此处体现“Graph Execution”的含义：**运行时只执行 Program/Plan，不解析或监听 traits 本身的变化**。

---

## 3. Provenance 模型：originType / originId / path

实现事实源：`packages/logix-core/src/internal/runtime/core/ModuleTraits.ts`

```ts
export interface TraitProvenance {
  readonly originType: "module" | "logicUnit"
  readonly originId: string
  readonly originIdKind: "explicit" | "derived"
  readonly originLabel: string
  readonly path?: string
}
```

### 3.1 originType：来源类型（治理分层）

- `"module"`：模块图纸层的 traits（moduleId 作为稳定锚点）
- `"logicUnit"`：逻辑单元在 setup 中声明的 traits（logic unit id 作为稳定锚点）

该分层用于：

- Devtools 展示时的来源分类（模块 vs 逻辑单元）；
- 排序与稳定输出（module-level 优先于 logicUnit-level；见 `compareTraitIdByProvenance`）。

### 3.2 originId / originIdKind：稳定身份（可追踪、可 diff）

LogicUnit provenance 的 `originId` 不是“运行时随机生成”，而是由模块装配过程确定并回写到 Logic meta 中：

- 装配裁决：`packages/logix-core/src/Module.ts` 的 `mountLogicUnit(...)`
  - id 决策优先级：`options.id` → logic meta 默认 `id` → derived id（基于组合顺序的可复现生成）
  - 并将 `resolvedId/resolvedIdKind/resolvedSource/...` 写回 `LogicUnitMeta`（供运行时读取）
- 运行时读取：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts` 的 `resolveLogicUnitService(...)`
  - `logicUnitId = meta.resolvedId ?? meta.id ?? derived`
  - `logicUnitIdKind = meta.resolvedIdKind ?? (meta.id ? "explicit" : "derived")`
  - label/path 从 resolved meta 中读取（见下）。

这保证了 provenance 的 `originId` 是**装配期静态裁决结果**，而不是运行期状态。

### 3.3 path：声明位置摘要（只用于定位，不参与语义）

`path` 只是一段用于 Devtools/错误信息的定位摘要（当前实现形态为 `file:line:column`），来源同样来自装配期写回的 meta：

- 来源：`Module.ts` 装配时可通过 `LogicUnitOptions.source` 或 logic meta 的 source 提供；
- 转换：`ModuleRuntime.logics.ts` 中将其格式化为 `file:line:column` 字符串；
- 使用边界：`path` **不参与语义裁决**（不影响 trait 的“是什么”），但会影响 provenance 排序与快照 digest（用于稳定输出与对比）。

---

## 4. Snapshot 与 Devtools 回溯：provenanceIndex + trace 事件

### 4.1 ModuleTraitsSnapshot：冻结后的“可导出索引”

实现事实源：`packages/logix-core/src/internal/runtime/core/ModuleTraits.ts`

- `ModuleTraitsSnapshot` 仅保留可序列化的治理信息：
  - `digest`：稳定摘要（用于对齐/缓存/回放锚点）
  - `traits`：最小清单（`traitId/name/description?`，顺序确定）
  - `provenanceIndex`：`traitId -> TraitProvenance` 的完整索引

注意：Snapshot 的目标不是承载完整可执行语义（traits value 可能含函数），而是承载**可解释与可回溯**所需的最小事实。

### 4.2 Debug/Devtools 如何消费 provenance

两条消费路径：

1. **运行时事件（推荐）**：`trace:module:traits` / `trace:module:traits:conflict`
   - 发出点：`packages/logix-core/src/ModuleTag.ts`
   - Slim/可导出约束：`packages/logix-core/src/internal/runtime/core/DebugSink.ts` 会在 light 档位裁剪为 `{ digest, count }`，full 档位保留 `traits + provenanceIndex`。
   - 协议说明：`.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`

2. **调试 API（便于测试/脚本）**：`Debug.getModuleFinalTraits(runtime)`
   - 实现：`packages/logix-core/src/Debug.ts`
   - 返回结构中直接把 `snapshot.provenanceIndex[traitId]` 拼回到每个 trait item 上，适合做断言与打印。

由此 Devtools 可以回答：

- “这个 traitId 是从 module-level 还是 logicUnit-level 来的？”
- “具体来自哪个 moduleId / logicUnitId？”
- “如果提供了 source，它大概在源码哪个位置？”

---

## 5. 冲突处理：Duplicate / Missing Requires / Excludes（全静态）

实现事实源：`packages/logix-core/src/internal/runtime/core/ModuleTraits.ts`

`finalizeTraitContributions` 在 build/install 之前做静态一致性检查，发现冲突会：

1. 生成结构化 `conflicts`（每条含 `kind/traitId/sources/...`）；
2. 抛出 `ModuleTraitsConflictError(moduleId, conflicts)`；
3. 在 `ModuleTag.ts` 中（diagnostics 非 off 时）额外发出 `trace:module:traits:conflict`，避免只靠错误 message 定位。

### 5.1 Duplicate（`duplicate_traitId`）

- 判定：同一个 `traitId` 在多条 contribution 中出现（module 与 logicUnit 混用也算重复）
- 结果：冲突 sources 中保留所有 provenance（按 provenance 稳定排序）

对 StateTraitSpec 来说，这等价于“同一字段路径被声明了多次”，属于典型的装配错误，应 fail-fast。

### 5.2 Missing Requires（`missing_requires`）

- 约定：若 trait value 是 object，且包含 `requires: string[]`，则表示该 trait 依赖的其他 traitId 必须同时存在
- 判定：对每个已存在的 `traitId`，检查其 requires 中是否存在缺失项
- 结果：输出 `missing` 列表（去重+排序），sources 仅包含该 traitId 自身的 provenance

### 5.3 Excludes Violation（`excludes_violation`）

- 约定：若 trait value 包含 `excludes: string[]`，表示这些 traitId 不能与当前 traitId 共存
- 判定：若 excludes 中存在当前集合 present，则为冲突
- 结果：输出 `present` 列表，并把被排斥 traitId 的 provenance 一并写入 sources

以上三类冲突都发生在 finalize 阶段：**基于静态定义而不是运行时报错**。

---

## 6. 为什么拒绝 Runtime Listeners（非目标）

提供“运行时监听 trait 变更并自动重建”的代价非常高，且与 Logix 的核心不变量冲突：

- **确定性与可回放**：运行时动态改图会让“同一份源码定义”在同一实例内出现多版本语义，难以用 digest/IR 对齐；
- **事务窗口与性能**：图重建与依赖分析是昂贵的，并且会引入不可控的热路径成本；
- **可诊断性**：监听+热更新会把错误从装配期推迟到运行期，使问题更难复现与解释。

因此 023 的裁决是：Trait 的“定义与来源”必须在 setup 阶段静态冻结；运行期只做图执行与事件观测。

---

## 7. 实践建议：让溯源稳定、可用、可解释

1. **显式命名逻辑单元**：在 `module.logic(build, { id, kind, name, source })` 或 `module.withLogic(logic, options)` 中提供稳定 `id`，避免依赖 derived id（derived 只保证“在同一组合顺序内可复现”）。
2. **补齐 source**：对复杂业务/Feature Kits，建议通过 `LogicUnitOptions.source` 填写 `file/line/column`，以便 provenance `path` 可跳回源码。
3. **把冲突当装配错误处理**：Duplicate / Missing Requires / Excludes 都属于静态定义冲突，应在模块初始化阶段就 fail-fast；不要试图通过运行时兜底隐藏它们。
4. **把“动态规则”放到图或 Flow 里**：需要按条件启用/禁用的行为，优先用 state 驱动的 derive/validate 分支，或用 Flow/Logic 编排，不要把“增删 trait”当成运行期机制。
