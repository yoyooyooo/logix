# Implementation Plan: 008 层级 Injector 语义统一（Nearest Wins + Root Provider）

**Branch**: `008-hierarchical-injector` | **Date**: 2025-12-15 | **Spec**: `specs/008-hierarchical-injector/spec.md`  
**Input**: `specs/008-hierarchical-injector/spec.md`

## Summary

008 的目标是：在保留现有 `effect` 函数式 DI（Layer/Context/Tag/Scope）优势的前提下，统一 Logix Runtime 在“模块实例分形（imports）+ 多实例（key）+ root 单例”并存时的 **依赖解析语义**，并确保在 Logic/跨模块协作/UI 读取三个入口下都遵循同一套规则：

- **最近 wins（Nearest Wins）**：优先解析当前实例 scope 的提供者；不得静默回退到更远作用域拿到“看起来对但其实是别的实例”的 runtime。
- **strict 默认**：缺失提供者应失败并给出可修复的诊断；任何“跨 scope / 全局单例”语义必须显式选择。
- **root provider**：全局单例来自 root runtime（或其等价 Provider）的显式提供；多 root 互不影响。

阶段性资产（本次 $speckit plan 输出）：

- 现状事实与关键决策：`specs/008-hierarchical-injector/research.md`
- 数据模型与关键术语：`specs/008-hierarchical-injector/data-model.md`
- 行为契约：`specs/008-hierarchical-injector/contracts/*`
- 最小使用演练：`specs/008-hierarchical-injector/quickstart.md`

## Technical Context

**Language/Version**: TypeScript 5.x（ESM），Node.js 20+  
**Primary Dependencies**: `effect` v3、`@logixjs/core`、`@logixjs/react`（以及 Devtools 相关包作为诊断展示）  
**Storage**: N/A（纯运行时语义；以内存 Context/Scope 为主）  
**Testing**: Vitest + `@effect/vitest`（一次性运行；不使用 watch）  
**Target Platform**: Browser（React 适配）+ Node.js（测试）  
**Project Type**: pnpm workspace monorepo  
**Performance Goals**: 解析路径在禁用诊断时保持“接近零额外成本”（避免额外 O(n) 扫描与大对象分配）；常见深度（≤3 层 imports）解析为 O(depth)；多实例场景不得依赖全局 tag→runtime 单槽表  
**Constraints**: 默认 strict；global/root 语义必须显式；破坏性变更用迁移说明替代兼容层；错误诊断 dev 丰富、prod 精简  
**Scale/Scope**: 多 root（多棵运行时树）+ 多 host 实例（key）+ 深层 imports（2~4 层）并存

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- `Intent → Flow/Logix → Code → Runtime` 映射：
  - Intent/需求：以 `specs/008-hierarchical-injector/spec.md` 的 P1~P3 用户故事与成功标准为验收口径（最近 wins、root provider、strict + 诊断）。
  - Flow/Logix：Logic 侧以 Bound API（`$.use`）与跨模块协作入口（`Link.make`）作为入口；React 侧以 `useModule/useLocalModule/useImportedModule` 与 `imports.get` 作为入口；这些入口必须共享同一套“作用域边界”语义。
  - Code：主要落点在 `packages/logix-core`（模块 runtime 解析/注册表/跨模块能力）与 `packages/logix-react`（imports-scope 桥接与错误诊断一致性）。
  - Runtime：多实例/多 root 下不得串 runtime；任何 fallback 语义都必须可解释、可测试。
- 依赖或修改的 `docs/specs/*`（docs-first & SSoT）：
  - 需要把“strict 默认 + 显式 root/global + 最近 wins”的对外契约回写到：
    - `.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md`（`$.use` 与 `Link.make`/跨模块协作 的语义边界）
    - `.codex/skills/project-guide/references/runtime-logix/logix-react/01-react-integration.md`（`useModule/useLocalModule/useImportedModule` 的推荐用法与错误语义）
    - `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`（缺失提供者/作用域不匹配的诊断口径）
  - 如新增/调整公开术语（例如 “imports-scope / root provider / strict/global” 的裁决口径），需要同步到 `.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/10-runtime-glossary.md`。
- Effect/Logix 契约变更与落档：
  - 若改变 `$.use(ModuleTag)` 的默认解析（从“可能回退全局注册表”变为 strict），属于对外行为变更，必须先在 runtime-logix 文档落档并提供迁移说明。
- 性能预算与回归防线：
  - 热点：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`（`resolveModuleRuntime`）、`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（注册表）、`packages/logix-react/src/internal/resolveImportedModuleRef.ts`（imports 解析与缓存）。
  - 方式：新增最小“多 root + 多实例 + 深 imports”集成测试锁死语义；并提供可复现 micro-benchmark（仅测解析/订阅开销），基线/对比记录在 `specs/008-hierarchical-injector/perf.md`（入口：`pnpm perf bench:008:resolve-module-runtime`）。
- 可诊断性与解释链路：
  - dev 环境错误必须包含：请求 token、发生入口（Logic/React）、当前 scope 标识（moduleId/instanceId/key）、修复建议；prod 错误保持短消息。
  - 诊断事件/错误载荷必须 Slim：禁止携带 `Effect`/闭包/Context 等大对象；错误对象仅保留可序列化字段（string/number/readonly array）。
- 稳定标识（Identity Model）：
  - 本特性新增/调整的 scope 标识（rootScopeId/startScopeId 等）必须来源于“可注入/可重建”的稳定信息（例如 moduleId + React key/hostKey），不得引入新的 `Math.random()/Date.now()` 作为 id 源。
  - `RootContextTag` 必须以“每棵 runtime tree 一份”隔离（禁止跨 root 全局缓存），避免把其他 root 的标识/实例误串到当前解析中。
- Breaking changes 与迁移说明：
  - strict 默认会让“之前依赖全局 fallback 的误用”暴露为错误，这是预期的破坏性演进；迁移说明放在本特性 `tasks.md`（后续生成）与相关 runtime-logix 文档中。
- 质量门（merge 前必须通过）：
  - `pnpm typecheck`、`pnpm lint`、`pnpm test`（一次性运行）；至少覆盖 `packages/logix-core` 与 `packages/logix-react` 的相关用例。

## Project Structure

### Documentation (this feature)

```text
specs/008-hierarchical-injector/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── checklists/
```

### Source Code (repository root)

```text
packages/logix-core/                  # Bound API、ModuleRuntime、跨模块/诊断内核（主落点）
packages/logix-react/                 # React 适配：useModule/useLocalModule/useImportedModule、imports-scope 桥接
packages/logix-devtools-react/        # 诊断展示（如需要补充错误事件可视化）

.codex/skills/project-guide/references/runtime-logix/             # Runtime SSoT（契约落档）
apps/docs/content/docs/               # 用户文档（产品视角；必要时外链到 runtime SSoT）
examples/                             # 示例验收（如需补一个“多实例 + 深 imports”演练）
```

**Structure Decision**: 本仓为 pnpm workspace monorepo；008 的推进顺序遵循“先固化契约与诊断口径（docs/specs + tests），再改核心解析实现，再补文档/示例迁移说明”。

## Implementation Strategy（分阶段落地与交付物）

> 说明：本节是路线图级别计划；更细可交付任务拆分在后续 `tasks.md`（$speckit tasks）中完成。

### Phase 0：事实对齐与契约固化（本次 $speckit plan 的交付物）

- 汇总现状与冲突点（全局注册表 fallback、多 root、多实例）并固化决策：`research.md`。
- 定义“Token/Scope/Resolution/Mode/Diagnostic”的数据模型：`data-model.md`。
- 用契约文件锁死入口一致性与错误口径：`contracts/*`。
- 给出最小演练：React/Logic 侧如何在 strict 默认下正确获取子模块与全局单例：`quickstart.md`。

### Phase 1：统一解析语义（Core）

- 将“Module runtime 解析”收敛为单一策略：默认 strict（只认当前 scope 的 Context/Layer 提供），禁止静默回退到跨 root 的全局 tag→runtime 单槽注册表。
- 为“明确的 root/global 语义”提供显式入口（或显式选项），并在多实例场景下提供可解释的失败（要求调用方持有明确实例句柄，而不是靠 tag 猜）。
- 收敛跨模块协作入口：移除 `$.useRemote` 作为公共 API；跨模块协作/IR 承载统一使用 `Link.make`，业务层默认只使用 `$.use`（strict）。
- 在 React 层面明确 `useModule(Impl)`/`useModule(Impl,{ key })` 永远走“局部实例”语义；`key` 是实例标识（同 key 复用、异 key 隔离、缺省 key 为组件级临时 key），`label`（如有）仅用于 DevTools 展示。要拿单例语义应显式选择：`useModule(Impl.module)`/`useModule(ModuleTag)`（当前运行环境）或 `Root.resolve(Tag)`（固定 root provider）。
- 将 imports-scope（实例 injector）下沉到 core：`ModuleRuntime` 构造时捕获并保存该实例 scope 的 `ImportsScope`（模块 runtime 映射的最小 injector，不持有完整 Context），React 的 `useImportedModule/host.imports.get` 只做 strict（读取该 `ImportsScope` 解析子模块），并删除 React 侧 `ImportedModuleContext.ts` 外部 registry；root/global 单例语义统一走 `Root.resolve(Tag)`（而不是在 imports API 上提供 mode 选项）。
- 明确 root provider 与 React override 的边界：`Root.resolve(Tag)` 固定解析当前 runtime 树的 rootContext，不受 `RuntimeProvider.layer` 的局部覆写影响；支持解析 ServiceTag 与 ModuleTag（ModuleTag 仅表达 root 单例，不用于实例选择）。同时，`useModule(ModuleTag)` 仍按当前运行环境解析（受 `RuntimeProvider.layer` 影响，最近 wins）；如需忽略 override 并强制 root 单例，使用 `Root.resolve(Tag)`。
- 明确 imports.get 的适用范围：root 也是一种模块实例；只要某个 host 实例确实提供了 imports（`implement({ imports: [Child.impl] })`），则 strict 下 `host.imports.get(Child.module)` / `useImportedModule(host, Child.module)` 均应可解析（不区分 root/local）。

### Phase 2：入口一致性（React）+ 诊断体验

- 明确并文档化 `useModule(ModuleTag)`（当前运行环境单例语义）与 `useModule(Impl,{key})/useLocalModule`（实例 scope 语义）的边界；确保 imports-scope 解析对深层 `imports.get` 始终可用且不会串实例。
- 让 `useImportedModule(host, Child.module)` 与 `host.imports.get(Child.module)` 在 strict 语义上完全一致；root/global 单例语义通过 `Root.resolve(Tag)`；错误信息在 dev 环境给出同构修复建议。
- 必要时补充 Devtools 侧可视化（例如“解析失败/作用域不匹配”作为结构化事件），并保证禁用诊断时接近零成本。

### Phase 3：Docs / Migration

- 回写 runtime SSoT（`.codex/skills/project-guide/references/runtime-logix/*`）与用户文档（`apps/docs`），补齐“最佳实践：优先在边界 resolve 一次、组件传递 ModuleRef”的推荐写法。
- 为 breaking 行为提供迁移说明与示例修订（不保留兼容层）。
