# 目录与依赖铁律（logix-core 实现侧）

在 `packages/logix-core/src` 的实现中，约定以下几条“铁律”来约束代码布局与依赖方向，确保后续重构时不至于陷入循环依赖或实现语义漂移。

## 1. 顶层子模块 vs internal

- `src/*.ts` 直系文件视为「子模块」：`Module.ts` / `Logic.ts` / `Bound.ts` / `Flow.ts` / `Runtime.ts` / `Link.ts` / `Platform.ts` / `Debug.ts` / `MatchBuilder.ts` 等。
- 这些子模块必须包含**实际实现代码**（工厂函数、Thin Wrapper、组合逻辑），**不能**仅作为 `export * from "./something"` 的纯 re-export。
- 多个子模块共享的实现细节，统一下沉到 `src/internal/**`，再由子模块引入：
  - 例如 Module 类型内核在 `src/internal/module.ts`，Bound 实现内核在 `src/internal/runtime/BoundApiRuntime.ts`；
  - 顶层 `Module.ts` / `Bound.ts` 等只通过 `import * as Internal from "./internal/..."` 拿到这些能力并收口为公共 API。
- **禁止**从 `src/internal/**` 反向 import 顶层子模块（`src/Module.ts` / `src/Logic.ts` / `src/Bound.ts` / `src/Flow.ts` 等），防止 internal 与公共 API 形成环依赖。

## 2. internal 内部的浅/深分层（浅 → 深 单向依赖）

为避免 internal 自身变成“黑盒大杂烩”，`src/internal/**` 内部也约定一条严格的浅/深分层原则：

- **核心实现一律下沉到 `src/internal/runtime/core/**`\*\*：
  - `src/internal/runtime/core/module.ts`：ModuleShape / ModuleRuntime / ModuleTag / ModuleImpl / BoundApi 等类型与核心契约；
  - `src/internal/runtime/core/LogicMiddleware.ts`：Logic.Env / Logic.Of / IntentBuilder / FluentMatch / Middleware 等 Logic 内核；
  - `src/internal/runtime/core/FlowRuntime.ts`：Flow.Api & `make(runtime)` 的具体实现；
  - `src/internal/runtime/core/Lifecycle.ts`：LifecycleManager / LifecycleContext 与生命周期调度实现；
  - `src/internal/runtime/core/Platform.ts`：Platform.Service / Platform.Tag 抽象；
  - `src/internal/runtime/core/DebugSink.ts`：Debug 事件模型与默认 Sink 实现；
  - `src/internal/runtime/core/MatchBuilder.ts`：`makeMatch` / `makeMatchTag` 的实现。

- **浅层 internal 文件只做 re-export 或薄适配，不再承载复杂实现**：
  - `src/internal/module.ts` 仅 `export * from "./runtime/core/module.js"`，给顶层子模块提供一个稳定入口；
  - `src/internal/LogicMiddleware.ts` / `src/internal/MatchBuilder.ts` / `src/internal/platform/Platform.ts` / `src/internal/debug/DebugSink.ts` 同理，全部只是从 `runtime/core/**` re-export；
  - `src/internal/runtime/FlowRuntime.ts` / `src/internal/runtime/Lifecycle.ts` 也只转发到对应 core 文件。

- **依赖方向约束**：
  - 浅层 internal（`src/internal/*.ts`、`src/internal/runtime/*.ts`）→ 允许 import `./runtime/core/**`；
  - `src/internal/runtime/core/**` → 只能依赖 `effect` 及 sibling core 文件，不得回头 import 上层 internal；
  - 检查方式：`rg "../" src/internal/runtime` 应保持为空（core 目录内除外），所有跨文件引用应表现为：
    - `./core/module.js`、`./core/LogicMiddleware.js`、`./Lifecycle.js` 这类“同级或更深”路径。

这一分层的目标是：

- 让“真正的运行时内核”在一个相对封闭的 core 子目录中演化，方便未来做拆包或抽取独立运行时；
- 浅层 internal 文件则承担“为顶层子模块提供稳定入口”的角色，避免顶层 API 与核心实现强耦合。
