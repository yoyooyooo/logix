# Quickstart: 013 Auto Converge Planner（auto 默认与可证明下界）

**Feature**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)  
**Created**: 2025-12-16

本 Quickstart 用于快速对齐三件事：

1. `auto/full/dirty` 三种 converge 策略分别解决什么问题；
2. 为什么 “auto 默认开启” 仍然可控（有下界、有刹车片、有回退）；
3. 如何用可序列化证据 + 014 跑道验证“无视场景也及格”。

## 1) 你将得到什么（可见结果）

- **默认 auto**：未显式配置时 `traitConvergeMode=auto`；模块级可覆盖为 `full|dirty` 并在**下一笔事务**生效。
- **full 下界**：任何场景下 `auto` 必须满足 `auto <= full * 1.05`（默认噪声预算 5%）；无法可靠判断时宁可回退 `full`。
- **稀疏写入加速**：重复 dirty-pattern 的场景（如连续输入）会复用 Execution Plan Cache，决策开销接近 0。
- **可解释证据（仅 light|full）**：每笔事务都能解释“为什么选 full/增量”、是否命中缓存、是否触发止损/失效/自保；`off` 不产出任何可导出的 `trait:converge` 事件/摘要（字段见 `contracts/*`）。

## 2) 三种模式怎么理解（最小心智模型）

- `full`：全量 topo 执行（稳定基线；也是 `auto` 的下界参照）。
- `dirty`：基于 dirty-roots + deps 的增量执行（依赖 deps 准确；可能触发 `dirtyAll` 降级）。
- `auto`：在 “full 下界” 约束下，尽量走增量；但有明确保底与止损：
  - **冷启动保底**：每个 module instance 第 1 笔事务必 `full`；
  - **决策预算止损**：决策超过 `traitConvergeDecisionBudgetMs`（默认 0.5ms）立刻回退 `full`；
  - **资源自保**：低命中率/高基数/抖动等对抗性场景会主动降低缓存带来的额外成本。

> 术语约束：`executedMode` 只允许 `full|dirty`；`auto` 仅出现在 `requestedMode`；`dirtyAll` 用独立 flag/原因字段表达。

## 3) 三张刹车片（默认开启仍可控的原因）

1. **模块级回退/固定模式**：业务可将某模块固定为 `full`（或 `dirty`）以立即恢复稳定基线，且不影响其他模块/实例。
2. **决策预算**：`traitConvergeDecisionBudgetMs` 是硬止损；一旦超时必须回退 `full`，并在证据中标注 `budget_cutoff`。
3. **缓存上界 + 自我保护**：Execution Plan Cache 必须有容量上界、逐出统计与低命中自保；generation 高频抖动视为负优化风险并触发保守策略。

## 4) 如何覆盖配置（Runtime 默认 + 按 `moduleId` 覆盖）

> 说明：以下示例即为当前实现（落点：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts` 的覆盖解析与 `packages/logix-core/src/Runtime.ts` 的便捷 Layer 构造器）。

```ts
import * as Logix from "@logixjs/core"

// key 是 Module.make("...") 的 moduleId
// root 是 program module（ModuleDef.implement(...) 的产物）或其 `.impl`
const runtime = Logix.Runtime.make(root, {
  stateTransaction: {
    // Runtime 级默认（未命中覆盖时使用）
    traitConvergeMode: "auto",
    traitConvergeDecisionBudgetMs: 0.5,

    // 模块级覆盖：优先级高于 Runtime 默认；切换在“下一笔事务”生效
    traitConvergeOverridesByModuleId: {
      OrderForm: { traitConvergeMode: "full" }, // 立即回退稳定基线（止血）
      SearchResults: {
        traitConvergeMode: "dirty",
        traitConvergeDecisionBudgetMs: 0.25,
      },
    },
  },
})
```

覆盖规则（必须可解释、可观测）：

- **优先级**：`RuntimeProvider override` > `moduleId override` > `runtime default` > 内置默认（未配置时默认 `auto`）。
- **作用域**：覆盖仅影响同一个 Runtime 实例内该 `moduleId` 的模块实例，不跨 runtime 传播。
- **证据**：evidence 必须输出 `configScope`（`provider|runtime_module|runtime_default|builtin`）；当覆盖导致模式/预算变化时，reasons 里应包含 `module_override`，并携带本次生效的阈值/预算。

## 4.1) React 子树内覆盖（更局部赢）

> 目标：不要为了局部调参去“新建 runtime 复制 middleware/layer”；在继承全局 runtime 的基础上，用 `RuntimeProvider.layer` 叠加差量覆盖。

> 说明：以下示例即为当前实现；内部通过 `StateTransactionOverridesTag` 向子树注入差量覆盖。

```tsx
import React from "react"
import { Layer } from "effect"
import * as Logix from "@logixjs/core"
import { RuntimeProvider } from "@logixjs/react"

const providerConvergeOverride = Logix.Runtime.stateTransactionOverridesLayer({
  traitConvergeOverridesByModuleId: {
    OrderForm: { traitConvergeMode: "full" },
  },
})

export const LocalConvergeOverrideDemo = () => (
  <RuntimeProvider layer={Layer.mergeAll(providerConvergeOverride)}>
    {/* 仅该 Provider 子树内生效 */}
    <div />
  </RuntimeProvider>
)
```

## 5) 如何解释一笔事务（你应该能回答）

对任意一次事务（`Diagnostics Level=light|full`），你应该能回答：

- 请求的策略是什么（`requestedMode`）？实际执行了什么（`executedMode`）？
- 为什么这次没走增量（或为什么走了增量）？（`reasons[]` / 回退原因）
- 这次执行影响面是多少？（`stepStats.totalSteps / executedSteps / affectedSteps`）
- 是否命中计划缓存？缓存是否健康？（`cache.hit / hits/misses/evicts / disabled`）
- 是否发生了失效/抖动？（`generation.generation / lastBumpReason / generationBumpCount`）
- Static IR 的构建成本是否可接受？（`staticIr.buildDurationMs`；在 014 报告中看 p50/p95）
- 本次事件引用的是哪份 ConvergeStaticIR？（`staticIrDigest = instanceId + ":" + generation`）

诊断分档差异：

- `off`：不产出任何可导出的 `trait:converge` 事件/摘要（用于最干净的性能基线）。
- `light`：`data.dirty` 只允许 `dirtyAll`（不输出 roots/rootIds/rootCount）；不导出 `ConvergeStaticIR`。
- `full`：允许输出受控的 roots 摘要（`rootCount` + `rootIds` 前 K 个 + `rootIdsTruncated`，默认 K=3，可配置；硬上界 16）；并在 EvidencePackage 内按 `staticIrDigest` 去重导出 `ConvergeStaticIR` 到 `summary.converge.staticIrByDigest`，用于离线解释/回放（可通过 `ConvergeStaticIR.fieldPaths` + `stepOutFieldPathIdByStepId` 将 `rootIds/stepId` 映射为可读 `FieldPath`）。

这些字段的 schema 由本特性 `contracts/openapi.yaml` 与 `contracts/schemas/*` 固化（并复用 009 的 DynamicTrace 外壳与 005 的 EvidencePackage 导出边界）。

## 6) 如何验收与回归（复用 014 跑道）

- 主跑道以 `specs/014-browser-perf-boundaries` 为准：用相同维度矩阵与统计口径比较 `full` vs `auto`。
- 及格线门槛写成可执行断言：所有矩阵点 `auto/full ≤ 1.05`（中位数与 p95），硬 gate 默认在 `Diagnostics Level=off` 下跑；并在 014 报告/diff 中绑定 `metricCategories.category=runtime`（`category=e2e` 仅记录）。
- 对抗性场景必须覆盖并能在报告中区分：
  - 重复 pattern（应稳定 hit）；
  - 高基数/低命中（应自保，缓存不失控）；
  - 图变化（应失效，旧缓存不误用）；
  - 列表/动态行（索引归一化，避免 pattern 基数爆炸）。

## 7) 迁移说明（无兼容层）

本特性会带来破坏性变更：默认 converge 策略从 `full` 调整为 `auto`，并新增决策预算/缓存证据字段。

迁移原则：

1. 若你需要维持旧行为：在 Runtime 或模块级显式设置 `traitConvergeMode="full"`；
2. 若某模块在 `auto` 下出现异常波动：优先用模块级覆盖回退 `full`，再用证据字段定位原因并调参；
3. 合并前以 014 报告作为唯一验收口径（“无视场景的及格线”必须可复现）。
