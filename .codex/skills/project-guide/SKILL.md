---
name: project-guide
description: 在 intent-flow 仓库做架构/规划/Runtime/示例/日常开发时，用最短导航定位 SSoT、代码落点、示例与质量门（平台 SSoT：docs/specs；runtime SSoT：references/runtime-logix）
---

# intent-flow · project-guide

## 目标

- 用最少上下文定位：SSoT 在哪、代码落点在哪、示例在哪。
- 默认先用 auggie 做语义检索，再补读必要文档。
- 治理/质量门/安全约束：以 `AGENTS.md` 为准（此处不重复）。
- 需要优化/重构 skills（含本 skill）时，优先使用 `$skill-creator` 的流程与渐进披露原则。

## 内容边界（SKILL vs references）

- `SKILL.md`：只放入口导航 + 查询模板 + 最短路径（避免塞实现细节）。
- `references/*`：长链路/实现备忘录/完整示例；需要深入时再按需加载。
- `references/README.md`：references 根目录导航摘要（先从这里挑你要读的长文）。
  - 路径说明：本文中的 `references/...` 均指 `.codex/skills/project-guide/references/...`（从仓库根目录访问时请补全此前缀）。

## Spec 快速概览（对着文件直接聊）

> 新会话里如果你只给出一个“spec 文件路径”，先按下面三类判断它属于哪套体系，再进入讨论与实现。

### 1) 平台/方法论规格（SSoT）

- 位置：`docs/specs/intent-driven-ai-coding/*`
- 入口：`docs/specs/intent-driven-ai-coding/README.md`
- 按需深入：`docs/specs/intent-driven-ai-coding/concepts/README.md`、`docs/specs/intent-driven-ai-coding/design/README.md`、`docs/specs/intent-driven-ai-coding/platform/README.md`、`docs/specs/intent-driven-ai-coding/examples/README.md`、`docs/specs/intent-driven-ai-coding/decisions/README.md`
- 典型产物：术语与边界（`docs/specs/intent-driven-ai-coding/99-glossary-and-ssot.md`）、资产与 Schema（`docs/specs/intent-driven-ai-coding/03-assets-and-schemas.md`）、平台交互（`docs/specs/intent-driven-ai-coding/platform/*`）、执行模型（`docs/specs/intent-driven-ai-coding/97-effect-runtime-and-flow-execution.md`）

### 2) 草案系统（Drafts / Topics / Tiered）

- 位置：`docs/specs/drafts/*`（索引：`docs/specs/drafts/index.md`；Topics：`docs/specs/drafts/topics/*`；分级草案：`docs/specs/drafts/L*/*`）
- 典型产物：Topic 主规范 README、研究/对比、协议/架构草案（未定稿内容以此为准，不要混入用户文档叙事）

### 3) 具体特性 spec（工程内交付单）

- 位置：`specs/<NNN-*>/`（一特性一目录）
- 典型产物：`spec.md`（需求/验收）、`plan.md`（实现方案 + Constitution Check + 落点目录）、`tasks.md`（可执行任务分解）、`data-model.md`、`contracts/*`、`quickstart.md`、`research.md`

### 推荐流程（从 spec 到代码）

- 先定裁决层：硬约束看 `.specify/memory/constitution.md`；概念/术语/平台定位优先改 `docs/specs/intent-driven-ai-coding`；未定稿想法放 `docs/specs/drafts`；单个可交付特性用 `specs/<id>/spec.md`
- 再写可执行计划：把约束、落点目录、验收与质量门固化到 `plan.md`（尤其 Constitution Check / Project Structure），再拆 `tasks.md` 进入实现
- 最后同步三处“可交接事实源”：运行时规范（`.codex/skills/project-guide/references/runtime-logix/**`）→ 代码（`packages/*` / `examples/*`）→ 用户文档（`apps/docs/content/docs/*`）

## 新会话最短启动（建议顺序）

1. 用 auggie 定位你要改的“符号/能力/包”在哪（优先于 `rg`）。
2. 读导航入口：`docs/specs/intent-driven-ai-coding/README.md`
3. 读概念与术语：`docs/specs/intent-driven-ai-coding/99-glossary-and-ssot.md`
4. 读 runtime 编程模型：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md`
5. 读 `$`/Flow/IntentBuilder：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/03-logic-and-flow.md`
6. 看类型裁决与真实导出：`packages/logix-core/src/index.ts`
7. 看示例场景与 Pattern：`references/examples-logix-index.md`（再下钻到 `examples/logix/src/scenarios/*` / `examples/logix/src/patterns/*`）
8. （可选）需要长链路导览/定位：`.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/02-long-chain-tour.md`；需要总小抄：`references/long-chain-cheatsheet.md`；需要 A–K 索引：`references/long-chain-index.md`

## 常见任务场景（先读 → 再下钻）

| 你想做…                     | 先读…                                                                                            | 再按需下钻…                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 新增/迭代 feature spec      | `specs/<NNN-*>/spec.md`                                                                          | `docs/specs/drafts/index.md`                                                                                                                            |
| 改平台术语/方法论           | `docs/specs/intent-driven-ai-coding/README.md`                                                   | `docs/specs/intent-driven-ai-coding/99-glossary-and-ssot.md`                                                                                            |
| 修复 logix-core runtime bug | `references/troubleshooting.md`                                                                  | `references/codebase-playbook.md`                                                                                                                       |
| 定位长链路/热路径           | `.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/02-long-chain-tour.md` | `references/long-chain-index.md`                                                                                                                        |
| 调整诊断/Devtools 协议      | `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`  | `references/diagnostics-perf-baseline.md`                                                                                                               |
| 做 React 集成/适配          | `.codex/skills/project-guide/references/runtime-logix/logix-react/01-react-integration.md`       | `packages/logix-react/*`                                                                                                                                |
| 改 Sandbox / Alignment Lab  | `references/long-chain-i-sandbox-alignment-lab.md`                                               | `packages/logix-sandbox/*`                                                                                                                              |
| 写业务示例/Pattern          | `references/examples-logix-index.md`                                                             | `examples/logix/src/scenarios/*`、`examples/logix/src/patterns/*`、`.codex/skills/project-guide/references/runtime-logix/logix-core/examples/README.md` |

## 默认 auggie 查询模板（复制即用）

> 更完整的“检索链路压缩包”（含 smoke test + 典型长链路的分步查询）见：`references/auggie-playbook.md`。
>
> 若遇到 auggie 偶发 `fetch failed`：优先改为**单次小查询**（不要并行批量问），并在问题里显式写出目标落点（例如 `.codex/skills/project-guide/references/runtime-logix/logix-core/api/03-logic-and-flow.md`）再重试。

- “`@logix/core` 的 Bound API `$` 类型/实现在哪里（`$.onState`/`$.state.mutate`/`$.use`）？”
- “`Runtime.make` 如何把 `ModuleImpl`/Layer/Devtools 组合起来？相关文件/符号在哪？”
- “`LogicMiddleware` / `EffectOp middleware` 的注册点与执行链路在哪里？”
- “`examples/logix` 里哪个场景最接近：表单联动/搜索+详情/长任务/审批流/跨模块协作？”

## Logix 速查（下钻前先开这 4 个入口）

- references 总导航：`references/README.md`
- Runtime SSoT 导览：`.codex/skills/project-guide/references/runtime-logix/README.md`
- 总骨架/不变量/关键机制：`references/long-chain-cheatsheet.md`
- 示例场景与 Pattern 索引：`references/examples-logix-index.md`
- examples dogfooding 工程最佳实践（目录结构/Module 拆分/组合根）：`docs/specs/intent-driven-ai-coding/logix-best-practices/README.md`

## 子包用法速查（用户视角）

- 每包的“核心概念 / 最小组合 / 示例入口 / 常见坑”：`references/packages-user-view.md`

## 质量门与验证（建议顺序）

- Workspace 级最小闭环：`pnpm typecheck` → `pnpm lint` → `pnpm test`
- 浏览器集成测试（按需）：`pnpm test:browser`（logix-react + logix-sandbox）
- 构建（按需）：`pnpm build`（递归 build）/ `pnpm build:pkg`（turbo 只构建 packages）
- 详解与包内命令矩阵：`references/quality-gates.md`

## 常见坑与排错（最短定位）

- phase/setup-run：`LogicPhaseError` / `code: logic::invalid_phase`（入口：`packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts`）
- strict imports：`MissingModuleRuntimeError`（入口：`packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts`）
- root provider：`MissingRootProviderError`（入口：`packages/logix-core/src/Root.ts`）
- tag collision：`_tag: TagCollisionError`（入口：`packages/logix-core/test/internal/Runtime/AppRuntime.test.ts`）
- 排错清单（症状→入口→修复）：`references/troubleshooting.md`

## 诊断与性能基线（runtime 核心路径）

- Debug/Devtools/Evidence 入口：`packages/logix-core/src/Debug.ts`、`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- Trait 静态治理与溯源（023）：`.codex/skills/project-guide/references/runtime-logix/logix-core/impl/05-trait-provenance-and-static-governance.md`
- Runtime 诊断/预算旋钮：`packages/logix-core/src/Runtime.ts`（`devtools` / `stateTransaction` / `concurrencyPolicy`）
- perf 基线脚本：`.codex/skills/logix-perf-evidence/package.json` 的 scripts（实现脚本目录：`.codex/skills/logix-perf-evidence/scripts/*`）
- 详解与最小证据闭环：`references/diagnostics-perf-baseline.md`

## 长链路导航（实现视角，按需加载）

- 导览（从业务写法到实现落点）：`.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/02-long-chain-tour.md`
- 正交分解（A–K）：`references/long-chain-index.md`
- 小抄（总骨架 / 不变量 / 关键机制 / auggie 模板）：`references/long-chain-cheatsheet.md`
- 冲突裁决：与规范/类型提示冲突时，以 SSoT + TypeScript 类型定义为准。

### A–K 快捷入口（一行索引）

- A｜状态数据面：`references/long-chain-a-data-plane.md`
- B｜执行面：`references/long-chain-b-execution-plane.md`
- C｜模块图谱：`references/long-chain-c-module-graph-plane.md`
- D｜副作用总线：`references/long-chain-d-effect-plane.md`
- E/F/G｜观测/证据/回放：`references/long-chain-efg-observability-evidence-replay.md`
- H｜宿主生命周期：`references/long-chain-h-program-runner.md`
- I｜Sandbox / Alignment Lab：`references/long-chain-i-sandbox-alignment-lab.md`
- J｜测试面：`references/long-chain-j-test-plane.md`
- K｜业务能力包：`references/long-chain-k-feature-kits.md`

## 常见任务落点（先定目录再动手）

- Runtime API/类型/语义：`packages/logix-core/src/*` + `.codex/skills/project-guide/references/runtime-logix/logix-core/api/*` + `.codex/skills/project-guide/references/runtime-logix/logix-core/runtime/*`
- logix-core 实现备忘录（实现细节/取舍/风险；非对外 API 契约）：`.codex/skills/project-guide/references/runtime-logix/logix-core/impl/README.md`
- React 适配：`packages/logix-react/*` + `.codex/skills/project-guide/references/runtime-logix/logix-react/01-react-integration.md`
- Devtools：`packages/logix-devtools-react/*` + `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`
- Sandbox/Alignment Lab：`packages/logix-sandbox/*`（同时参考 runtime-logix 与 drafts 的 sandbox 主题）
- Feature Kits（表单/查询/i18n/领域）：`packages/form/*`、`packages/query/*`、`packages/i18n/*`、`packages/domain/*`
- 测试与回归：`packages/logix-test/*` + `examples/logix/src/scenarios/*` / `examples/logix/src/patterns/*`
- 用户文档（产品视角）：`apps/docs/content/docs/*`

## 进一步阅读

- `references/project-architecture.md`：更细的目录地图与决策落点。
- `references/codebase-playbook.md`：源码导航压缩包（入口 → 内核 → 回归），用于快速定位实现与测试。
- `docs/specs/intent-driven-ai-coding/concepts/README.md`：方法论映射与概念补篇索引（渐进披露入口）。
- `references/long-chain-index.md`：长链路正交分解（A–K）索引与“分贝”指针（按需加载）。
