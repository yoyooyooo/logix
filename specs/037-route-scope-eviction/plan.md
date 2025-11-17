# Implementation Plan: 037 限定 scope 的全局（路由 Host(imports) + ModuleScope）

**Branch**: `037-route-scope-eviction` | **Date**: 2025-12-26 | **Spec**: `specs/037-route-scope-eviction/spec.md`  
**Input**: `specs/037-route-scope-eviction/spec.md`

## Summary

本特性解决一个高频业务心智模型：「限定 scope 的全局」——同一路由下多个弹框需要尽可能保持状态（反复打开/关闭不丢），但离开路由后必须整体销毁，避免跨路由串状态与后台残留。

关键对齐：

- **路由不是特殊机制**：它只是“scope 边界”的一个典型场景；本特性不新增路由专用 API/Hook。
- **推荐路径必须语义清晰**：默认只暴露 Host(imports) 子模块句柄；把 `useModule(Tag/Def)` 归为高级区，避免业务误以为“它也绑定到 Host”。
- **降低业务心智负担**：提供一个可复用的 React Scope 工具（Provider + hook）解决 props 透传与手写 Context 样板代码。

本特性在 037 目录内固化的产物（作为单一事实源）：

- 现状事实与关键决策：`specs/037-route-scope-eviction/research.md`
- 数据模型（ScopeRegistry/lease/覆盖语义）：`specs/037-route-scope-eviction/data-model.md`
- 对外契约（Scope 工具与可选 Bridge 的行为语义）：`specs/037-route-scope-eviction/contracts/*`
- 最小演练（路由 scope + 弹框 keepalive）：`specs/037-route-scope-eviction/quickstart.md`
- 用户文档配方（甜点区/高级区）：`apps/docs/content/docs/guide/recipes/route-scope-modals.md`

显式 eviction/clear API 已从本阶段范围移除（如后续仍需要，另起 spec 或作为后续 phase 再评估）。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM），Node.js 22.x  
**Primary Dependencies**: `effect` v3、`@logix/core`、`@logix/react`  
**Storage**: N/A  
**Testing**: Vitest（`vitest run`）+ `@testing-library/react` + jsdom（React 19）  
**Target Platform**: 浏览器（React 适配）+ Node.js（测试）  
**Project Type**: pnpm workspace monorepo  
**Performance Goals**:
  - 不回退现有 `useModule(Impl)` 的 acquire/retain/release 热路径：Scope 工具必须是薄封装，不在 render 热路径引入额外 O(n) 工作。
  - ScopeRegistry/Bridge 属于低频边界操作：目标是“可解释 + 可预测”，不追求极致性能，但不得引入明显的额外分配或泄漏风险。
**Constraints**:
  - strict 默认：imports-scope/多实例语义不得隐式回退到全局兜底（不引入任何进程级正确性依赖）。
  - 诊断事件必须 Slim 且可序列化；默认关闭时接近零成本。
  - `@logix/react` 对外导出不得暴露 `./internal/*`；新增能力必须通过 public submodule 导出。
**Scale/Scope**: 单路由内 0–50 个潜在弹框模块；同一业务 scope 内的实例数量在可控范围内（避免“无边界全局缓存”）。

## Constitution Check

*GATE: Must pass before进入实现/优化阶段。*

- `Intent → Flow/Logix → Code → Runtime` 映射：
  - Intent/需求：以 `specs/037-route-scope-eviction/spec.md` 的 FR/NFR/SC 作为验收口径（路由内保状态、跨路由必销毁、Scope 工具化、文档分层与反例）。
  - Flow/Logix：用“父实例 scope（Host）+ imports 子模块”表达边界；UI 只拿“绑定父实例”的子模块句柄。
  - Code：主要落点在 `packages/logix-react`（Scope 工具与桥接能力）与 `apps/docs`（最佳实践与心智模型）。
  - Runtime：不改变 core 的事务/实例语义；仅新增一个按 runtime tree 隔离的 ScopeRegistry（用于跨路径复用同一 scope 的实验性能力）。
- 依赖或修改的规格/事实源（docs-first & SSoT）：
  - 依赖：`specs/022-module/*`（useModule/多实例/key 语义）、`specs/008-hierarchical-injector/*`（strict/default 解析口径）。
  - 对外文档：`apps/docs/content/docs/guide/recipes/react-integration.md`、`apps/docs/content/docs/guide/recipes/route-scope-modals.md`。
  - 运行时 SSoT（按需补齐）：`.codex/skills/project-guide/references/runtime-logix/logix-react/01-react-integration.md`。
- Effect/Logix contracts 变更：
  - 新增 `@logix/react` 的 Scope 工具（public API）。
  - 新增 `@logix/core` 的 ScopeRegistry（按 runtime tree 隔离；不作为业务日常入口，仅支撑高级/实验性 Bridge）。
- Deterministic identity：
  - 不引入随机/时间默认；scopeId/key 由业务提供并应稳定。
- Transaction boundary：
  - 不引入事务窗口内 IO；scope 注册/释放属于生命周期管理，不进入 stateTransaction 写入路径。
- Public submodules：
  - 所有新增对外能力必须通过 `packages/logix-react/src/*.ts` 与 `packages/logix-core/src/*.ts` 导出，不暴露 internals。
- Quality gates（merge 前）：
  - `pnpm typecheck`、`pnpm lint`、`pnpm test` 必须通过；新增能力需补齐最小单测覆盖（尤其缺 Provider 抛错与 key 隔离语义）。

## Project Structure

### Documentation (this feature)

```text
specs/037-route-scope-eviction/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── perf.md
├── quickstart.md
├── contracts/
└── checklists/
```

### Source Code (repository root)

```text
packages/logix-react/                                             # ModuleScope（Scope 工具）与可选 Bridge
packages/logix-core/                                              # ScopeRegistry（按 runtime tree 隔离）
apps/docs/content/docs/                                           # 用户文档（指南与配方）
```

## Implementation Strategy（分阶段落地与交付物）

> 说明：本节是路线图级别计划；更细可交付任务拆分在后续 `tasks.md`（$speckit tasks）中完成。

### Phase 0：事实对齐与规格固化（本次收敛的交付物）

- `research.md`：澄清“句柄语义”（Host(imports) vs useModule(Impl) vs useModule(Tag)），并拍板推荐路径与高级区边界。
- `data-model.md`：固化 ScopeRegistry/lease 的数据模型与不变量（避免未来 Bridge 实现随意漂移）。
- `contracts/*`：固化 Scope 工具（Provider + hook）与可选 Bridge 的行为语义与错误口径。
- `quickstart.md`：给出“路由 scope + 弹框 keepalive”最小演练（不引入显式 eviction/clear）。
- 用户文档：`apps/docs/content/docs/guide/recipes/route-scope-modals.md`（甜点区/高级区 + 反例与排错）。

### Phase 1：`@logix/react` Scope 工具（实现与测试）

- 提供一个 public API：输入 Host ModuleImpl（+ defaults），产出 `{ Provider, use, useImported, Context }`。
- Provider 行为：
  - 内部创建/持有 Host 实例；允许传入 `options` 覆盖（含 stable scopeId 与 `gcTime`）。
  - 若缺少 Provider，`use()` 必须抛出可读错误。
- 测试：
  - 缺 Provider 抛错；
  - Provider 内稳定引用（同 scopeId 不串实例）；
  - defaults 与 Provider options 的 scopeId 隔离与覆盖语义。

### Phase 2：（可选）跨 React 子树复用同一 scope（Bridge，实验性）

- 在 `@logix/core` 提供 ScopeRegistry（按 runtime tree 隔离）。
- 在 `@logix/react` 提供 Bridge：通过 scopeId 从 registry 取回 runtime + module runtime，并在另一棵子树重新提供 RuntimeProvider 与模块句柄。
- 风险与验收：
  - 必须补齐单测（注册/释放不泄漏、并发重入安全、缺注册时报错明确）；
  - 文档只能放在“高级区”，并明确其前提条件与推荐场景。

## Constitution Re-check（Post Phase 1）

- PASS：未引入任何进程级全局兜底；ScopeRegistry 按 runtime tree 隔离。
- PASS：未修改统一最小 IR 与事务边界；新增能力集中在生命周期与使用方式。
- TODO（Phase 2 前必须补齐）：Bridge 的测试矩阵与诊断成本说明（避免把实验能力误放进甜点区）。
