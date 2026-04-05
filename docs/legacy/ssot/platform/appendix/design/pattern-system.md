---
title: 模式系统设计 (Pattern System Design)
status: living
---

> **核心共识**：在当前阶段，Pattern 的运行时定义收敛为“普通的 `(input) => Effect` 函数”，平台侧只在其外部包一层资产 metadata（id / configSchema / tags 等）。
> 本文件用于补充 Pattern 在主线体系中的角色，聚焦最小必要约定；早期构想的 `definePattern` / 自定义 DSL / Spy Runtime 等高级特性视为历史思路，不作为当前规范的一部分。

## 1. Pattern 资产定义

在当前架构中，Pattern 不再是静态配置，而是标准的 TypeScript 代码资产。

- **Pattern Function（源码形态）**：形如 `(config: C) => Effect.Effect<A, E, R>` 的普通函数，内部使用 Effect / Store / Logic / Flow 与结构化控制流（Effect.* + `$.match`）等原语完成业务逻辑；
- **Pattern Asset（平台形态）**：在 Pattern Function 外再包一层 metadata（id / version / configSchema / tags 等），用于平台注册、可视化和治理。

开发者日常主要关心 **Pattern Function** 的编写；Pattern Asset 可以由 Builder / CLI 工具自动生成或补全。

## 2. Pattern 的形态分类

### 2.1 原子 Pattern (Atomic Pattern)
只包含单一功能的逻辑片段，通常用于替代基础算子。
*   **示例**: `Debounce`, `Retry`, `Poll`。
*   **画布表现**: 小型的功能节点。

### 2.2 场景 Pattern (Scenario Pattern)
包含完整交互闭包的微应用。它通常会创建局部状态和信号。
*   **示例**: `ModalFormWorkflow` (包含 Open/Close 信号, Loading 状态, 表单提交逻辑)。
*   **画布表现**: 大型容器节点，暴露 Signal 端口。

## 3. Pattern 与 ModuleImpl 的协同关系

随着 React 侧 `ModuleImpl` 方案的引入，Pattern 在业务落地中的角色得到了进一步明确。Pattern 是“模具”，`ModuleImpl` 是“成品”。

### 3.1 消费映射

在 `ModuleImpl` 体系下，Pattern 的产出物有了明确的归宿：

- **原子 Pattern** (Retry, Debounce)：作为 **Logic Helper**，在 `Module.logic` 内部被调用。
- **逻辑 Pattern** (CRUD, Pagination)：作为 **Logic Factory**，在 `ModuleImpl` 的 `logics` 数组中被配置和实例化。
  ```ts
  // 示例：在 program module 中消费 Pattern（logics 数组）
  export const UserListDef = Logix.Module.make("UserList", { ... })

  export const UserListModule = UserListDef.implement({
    initial: { ... },
    logics: [
      // PaginationPattern.make 返回一个 ModuleLogic
      PaginationPattern.make({ fetch: UserApi.list })
    ]
  })

  export const UserListImpl = UserListModule.impl
  ```
- **场景 Pattern** (完整工作流)：作为 **Module Factory**，直接返回配置好的 `ModuleImpl`，或者生成包含完整 Shape 的 `Module`。
  场景 Pattern 也可以在 `ModuleImpl` 基础上进一步封装 Env，例如通过 `ModuleImpl.withLayer` 预绑定 Service：
  ```ts
  // 场景 Pattern：返回一个已经绑定 Service 的 Impl
  export const makeRegionImplWithService = () => {
    const RegionModule = RegionDef.implement<RegionService>({
      initial,
      logics: [RegionLogicFromPattern],
    })

    const RegionImpl = RegionModule.impl.withLayer(RegionServiceLive)
    return RegionImpl
  }
  ```

这种分层使得 Pattern 库专注于“通用逻辑的可复用性”，而 `ModuleImpl` 专注于“具体页面的组装与落地”。

## 4. Pattern 与平台的关系

在当前阶段，推荐的工程实践是：

- 在运行时代码中，将常见长逻辑封装为 Pattern Function：
  - 例如审批流、Job 执行、表单提交、长任务轮询等；
  - 通过清晰的输入参数与 Effect 行为，保持逻辑可测试、可组合。
- 在平台层，将这些 Pattern Function 与元数据（id/configSchema/tags）关联：
  - 用于在 Galaxy 视图中以“黑盒积木”的形式呈现；
  - 用于在 Pattern Studio 中提供配置表单与模拟运行。
- 更复杂的 AI 协同（例如智能填槽、自动提炼 Pattern、富交互 Playground）可以在后续阶段中按需引入，不作为当前阶段的前置依赖。

本设计文件后续如需扩展（例如重新引入更强的 Builder DSL、AI Slot 等），应结合 Roadmap 与 `docs/ssot/runtime` / `docs/ssot/platform` 规范更新后再补充章节；当前以 pattern-style `(input) => Effect` + 资产 metadata 为唯一事实源。

## 5. 工程约定：目录、命名与复用验证

从“真实业务开发”的视角出发，为了让 Pattern 在仓库内可查、可测、可复用，当前阶段补充以下工程约定。当前示例的参考落点为：

- 代码位置：
  - `examples/logix/src/patterns/*.ts`：Pattern Function 的示例实现（Level 2 资产）；
  - `examples/logix/src/scenarios/*.ts`：场景示例，作为 Pattern 的消费方（Level 3 代码）。

- 命名约定（源码级）：
  - 纯 Effect Pattern（不直接依赖 Logix.Env）：
    - 函数：`runXxxPattern(input: XxxPatternInput): Effect.Effect<A, E, R>`；
    - 输入类型：`XxxPatternInput`；
    - 错误类型（如有）：`XxxPatternError`。
  - Logic Pattern（依赖 `Logic.Env<Sh,R>` / Store / Flow / 结构化控制流）：
    - 工厂函数：`makeXxxLogicPattern(config?: C) => Logic.Of<Sh, R, A, E>`；
    - 可选导出一个语法糖：`XxxLogicFromPattern = makeXxxLogicPattern()`，方便直接挂到 Store 上。

- Tag-only Service vs 自带实现：
  - 对真实业务更有复用价值的模式，推荐 **只在 Pattern 中定义 Service 契约（Tag + interface），不提供默认实现**：
    - Module 领域服务（ApprovalService、ArchiveService 等）建议归类在 Module 层（如 `module/order/service.ts`），Tag 代表业务语言中的“动词”；
    - 通用能力（Notification/Confirm 等）可以放在 `patterns/shared` 或 `patterns/<pattern-name>/service.ts`，作为 Pattern 的“插槽”；
    - Pattern 内部只 `yield* SomeServiceTag`，不 `provide` 实现。
  - 具体实现由消费方在“运行组合层”提供：
    - 示例场景中，可以在单文件内使用 `Effect.provideService(Tag, impl)` 闭环演示；
    - 真正应用中，推荐集中在 RuntimeLayer / App Root 中通过 `Layer.succeed` / `Layer.mergeAll` 注入真实实现或测试替身。

- 场景文件（scenarios）要求：
  - 每个场景文件应当是**单文件完备**：
    - 明确 import 使用的 Pattern / Service Tag；
    - 在文件内或通过注释展示“如何提供依赖并运行”：
      - 对纯 Effect Pattern，至少给出一个 `const program = ...` 并在文件底部用 `Effect.runPromise(program)` 或等价入口；
      - 对依赖 Service Tag 的 Pattern，演示如何在场景内 `provideService`（或说明由上层 Runtime 提供）；
    - 让读者在不额外查找其它文件的情况下，理解“从 Action / 输入到 Effect 执行”的完整链路。

- 复用验证约束（多对多关系）：
  - 为了防止 Pattern 设计成“只适配单一 demo”，每个进入 `patterns/` 的 Pattern，理想状态应至少被 **两个及以上** 场景使用：
    - 例如：
      - `patterns/optimistic-toggle.ts` 同时被 `scenarios/optimistic-toggle.ts` 与 `scenarios/optimistic-toggle-from-pattern.ts` 消费；
      - `patterns/long-task.ts` 同时被 `scenarios/long-task-pattern.ts` 与 `scenarios/long-task-from-pattern.ts` 消费；
      - `patterns/notification.ts` 同时被 `scenarios/notify-simple-run.ts` 与 `scenarios/notify-with-bulk-and-import.ts` 消费。
  - 平台化阶段，可以将这种“一个 Pattern 被多个场景引用”的关系直接映射为 Pattern 资产的健康度指标，避免只服务某个孤立案例的“伪复用”。
  - 门禁：`pnpm -C examples/logix typecheck` 会执行 Pattern 复用检查（脚本：`examples/logix/scripts/check-pattern-reuse.mjs`，配置：`examples/logix/pattern-reuse.config.json`）。

这些约定不强制束缚未来的 Builder / Codegen 形态，但为当前示例提供了一套清晰、一致的“Pattern 工程实践”，兼顾业务开发视角（能在真实需求里直接用）与平台视角（资产可解析、可管理）。
