# 交接文档：022 · Module（定义对象）+ ModuleTag（身份锚点）

> 目标：让“wrap module”成为正式 `Module` 概念，彻底移除旧称；统一命名与入口语义（Logic/Runtime/React），并在不引入兼容层的前提下完成迁移与回归。

## ✅ 当前状态（已收口，2025-12-23）

- `specs/022-module/tasks.md`：已全部勾选 `[X]`
- 质量门：`pnpm test` / `pnpm typecheck` / `pnpm lint` 均已通过
- 迁移收口：仓库内已不再出现“把 Module 当 Tag/Effect 用”的调用点；测试/示例已统一用 `.tag` / `$.use(module)` / 入口 unwrap

## 0. 当前裁决（必须坚持）

### 0.1 命名矩阵（最终命名）

- `Module`：`Logix.Module.make(...)` 返回；带 `.tag`；可 `.logic(...)` 产出逻辑值；不带 `.impl`。
- `Program`：`Logix.Program.make(Module, config)` 返回；支持 `withLogic/withLayers`；作为装配期业务单元进入 Runtime 与 React 局部实例入口。
- `ModuleTag`：身份锚点（Context.Tag）；用于 Env 注入与“全局实例”解析。
- `Program`：装配对象；通过内部 runtime blueprint 承接 layer/imports 等实现细节；用于创建局部实例。
- `ModuleRuntime`：运行时实例（真正的“实例”语义）。
- `ModuleHandle`：`yield* $.use(...)` 返回的只读句柄（可含 controller 等扩展）。
- `ModuleRef`：React `useModule(...)` 返回的 ref（含 state/actions/dispatch + 扩展）。

### 0.2 入口语义矩阵（局部 vs 全局）

- Logic：`yield* $.use(module)` 等价 `yield* $.use(module.tag)`（只解析，不创建实例；扩展需通过 handle-extend 合并）。
- Logic：`yield* module.tag` 直接解析 `ModuleRuntime`（同样从当前 Env/scope 解析；不是“进程级全局”；若需固定 root provider，用 `Logix.Root.resolve(module.tag)`）。
- Runtime：`Logix.Runtime.make(program)` 创建新的 Runtime/Scope。
- React：
  - `useModule(program)` 默认走局部/会话级创建与缓存。
  - `useModule(module.tag)` 取 `RuntimeProvider` 中的全局实例。

### 0.3 “实例”语义裁决

- 不再引入/使用名为 `*Instance` 的“实例类型”；实例 = `ModuleRuntime`。
- `ModuleTag` 是身份锚点（Tag），不是实例。

## 1. spec 目录现状（已对齐、无旧称残留）

> 新会话继续用：`SPECIFY_FEATURE=022-module`

### 1.1 目录与文件

- `specs/022-module/` 已就位（原 feature 目录已更名）。
- 契约文件已更名：
  - `specs/022-module/contracts/schemas/module-descriptor.schema.json`
  - `specs/022-module/contracts/schemas/module-event.schema.json`
- perf 采样入口与产物已固化：
  - `pnpm perf bench:useModule`
  - `specs/022-module/perf/before.useModule.json`

### 1.2 文档补强点（已完成）

- `specs/022-module/spec.md` / `specs/022-module/quickstart.md` / `specs/022-module/data-model.md`：补齐并统一“命名矩阵 + 入口语义矩阵”。
- `specs/022-module/tasks.md`：路径已切到 `022-module`；新增 `T047` 用于最终收口“全仓旧称清理”（范围：`specs/022-module/` 之外）。

## 2. 代码侧已落地的关键进展（来自上一轮实现）

### 2.1 React：`useModule` 已支持直接吃 wrap module

- 入口：`packages/logix-react/src/hooks/useModule.ts`
  - 支持传入 `Program` / wrap module / `ModuleTag` / `ModuleRuntime` / `ModuleRef` 等句柄。
  - unwrap 规则：`Program` 默认走局部；`ModuleTag` 默认走全局。
- 扩展合并：`packages/logix-react/src/internal/ModuleRef.ts`
  - 复用 handle-extend 协议，把 controller/services 等扩展合并进返回的 `ModuleRef`。
- `useLocalModule` 同步支持 wrap module：`packages/logix-react/src/hooks/useLocalModule.ts`。

### 2.2 Core：Module/ModuleTag 命名与入口已收口

- `packages/logix-core/src/Module.ts` 已存在“定义对象 + 可选 impl + withLogic/withLayers”的实现雏形，并且具备：
  - 逻辑单元可复现 id 推导（derived id）与 last-write-wins 覆盖语义；
  - 反射字段槽位（schemas/meta/services/dev.source）；
  - unwrap helper（tag/impl）。

### 2.3 迁移期的“止血式适配”已出现

- 部分包/示例已为适配“wrap module 不再是 Tag”做了局部修正（典型：把原本当 Tag 使用的地方改为显式 `.tag` 或走入口 unwrap）。
- 命名上存在 `*Impl` 的尴尬点：示例里应改为 `SandboxProgram` / `SandboxModule` 这类最终语义命名，避免把实现细节当主阅读路径。

## 3. 后续（可选）

本特性已完成收口；如要继续提升质量，建议把工作拆成独立特性推进：

- 继续在 `packages/**/src` 内收敛显式 `any`（优先 public API 边界与运行时核心类型），避免一次性大改造成回归风险。

## 4. 新会话的最短启动建议（避免迷路）

- 先跑 `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`，确认 feature 目录与 docs 列表。
- 以 `specs/022-module/{spec.md,plan.md,tasks.md,quickstart.md}` 为执行与验收基线。
- 改动面建议优先聚焦这些文件/符号：
  - core：`packages/logix-core/src/Module.ts`、`packages/logix-core/src/internal/runtime/core/module.ts`、`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`、`packages/logix-core/src/Runtime.ts`
  - react：`packages/logix-react/src/hooks/useModule.ts`、`packages/logix-react/src/internal/ModuleRef.ts`
  - spec 契约：`specs/022-module/contracts/schemas/module-descriptor.schema.json`
