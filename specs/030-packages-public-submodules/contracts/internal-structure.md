# Contract: Internal Structure（src/internal 收敛与分区）

**Branch**: `030-packages-public-submodules`  
**Date**: 2025-12-25  
**Spec**: `specs/030-packages-public-submodules/spec.md`

> 目标：把“public surface 收口”与“internal 可自由重构”真正落地到目录结构上，让多人并行时冲突面最小、未来抽包成本可控。

## 1) Repo 级原则（适用于 packages/*）

- **概念入口单文件**：每个 Public Submodule 对应 `src/<Concept>.ts(x)`；该文件对外提供稳定 API，内部实现全部下沉。
- **实现下沉并按概念分区**：实现代码放在 `src/internal/<concept>/**`（或等价分区）；避免实现散落在包内各处。
- **禁止跨概念 internal 直依赖**：概念之间只能通过 Public Submodule API/Tag/Layer 交互；禁止 `internal/A` 直接 import `internal/B` 形成耦合链。
- **subpath = proto-package**：Independent Entry Point（例如 `@logix/form/react`、`@logix/sandbox/vite`）视为“未来可能独立成包”的候选：入口必须自洽、实现也应聚拢（不要跨包/跨概念偷连 internal）。
- **对齐 promotion path**：抽包的判据与步骤以 `contracts/promotion-to-package.md` 为准，本文件只给“现在就该长成什么样”。

## 2) `@logix/core` 特殊约束（强制遵守）

`@logix/core` 的 internal 不只是“实现细节”，还承载运行时内核分层。必须遵守以下拓扑铁律（避免 internal 变成蜘蛛网）：

- `packages/logix-core/src/*.ts` 是对外概念子模块，必须有实际实现（不是纯 re-export）。
- 共享实现下沉到 `packages/logix-core/src/internal/**`，并保持单向依赖：internal 不反向 import root `src/*.ts`。
- internal 再分层：
  - 深层内核放在 `packages/logix-core/src/internal/runtime/core/**`（FlowRuntime/Lifecycle/StateTransaction/DevtoolsHub 等）。
  - 浅层 `packages/logix-core/src/internal/runtime/*.ts` 只做薄适配/re-export，不得反向依赖更“浅”的模块。
- 日常自检：
  - `rg \"../\" packages/logix-core/src/internal/runtime` 应为空（`core/**` 目录内除外）。

## 3) 包级目标拓扑（Target Internal Topology）

> 说明：这里描述“目标分区”，不要求一次性到位；允许逐步迁移，但每一步必须让 verify gate 通过，且不得扩大 public surface。

### `@logix/form`

- `src/Form.ts` / `src/Rule.ts` / `src/Error.ts` / `src/Trait.ts` / `src/Path.ts` / ...（Public Submodules）
- `src/internal/form/**`：表单内核（controller/reducer/traits/rules/errors/arrays 等）
- `src/internal/dsl/**`：DSL 构造器（from/traits/derived/rules/node/list）
- `src/internal/schema/**`：schema 映射相关实现（path/error mapping）
- `src/internal/validators/**`：校验实现（如需拆分）
- Independent Entry Point：`src/react/index.ts`（`@logix/form/react` 聚合入口）

### `@logix/query`

- `src/Query.ts` / `src/Engine.ts` / `src/Traits.ts` / `src/Middleware.ts` / `src/TanStack.ts`（Public Submodules）
- `src/internal/engine/**`：engine 实现与状态
- `src/internal/tanstack/**`：TanStack 集成实现
- `src/internal/logics/**`：logics 实现
- `src/internal/middleware/**`：middleware 实现
- `src/internal/typecheck/**`：编译期回归/断言（不得泄漏到 root）

### `@logix/react`

- `src/RuntimeProvider.tsx` / `src/Hooks.ts` / `src/Platform.ts` / `src/ReactPlatform.ts`（Public Submodules）
- `src/internal/provider/**`：Provider 与上下文装配
- `src/internal/hooks/**`：hooks 实现
- `src/internal/platform/**`：平台适配实现
- `src/internal/store/**`：external store / cache / module ref 等实现

### `@logix/devtools-react`

- `src/LogixDevtools.tsx` / `src/DevtoolsLayer.ts` / `src/StateTraitGraphView.tsx`（Public Submodules）
- `src/internal/ui/**`：UI 实现
- `src/internal/state/**`：UI 状态管理实现
- `src/internal/snapshot/**`：snapshot 相关实现
- `src/internal/theme/**`：样式与主题资源

### `@logix/sandbox`

- `src/Client.ts` / `src/Service.ts` / `src/Protocol.ts` / `src/Types.ts` / `src/Vite.ts`（Public Submodules / Entry Points）
- `src/internal/worker/**`：worker 运行时实现
- `src/internal/compiler/**`：编译实现
- `src/internal/kernel/**`：kernel bundle/静态资源装配

### `@logix/test`

- `src/TestRuntime.ts` / `src/TestProgram.ts` / `src/Execution.ts` / `src/Assertions.ts` / `src/Vitest.ts`（Public Submodules）
- `src/internal/api/**`：测试 API 实现
- `src/internal/runtime/**`：测试 runtime 实现
- `src/internal/utils/**`：断言/辅助工具实现

### `@logix/i18n`

- `src/I18n.ts` / `src/I18nModule.ts` / `src/Token.ts`（Public Submodules）
- `src/internal/driver/**`：driver 适配与事件桥接
- `src/internal/token/**`：token 预算/规范/校验实现
- `src/internal/module/**`：module 逻辑实现

### `@logix/domain`

- `src/Crud.ts`（Public Submodule）
- `src/internal/crud/**`：crud 内核实现（controller/reducer/helpers）

