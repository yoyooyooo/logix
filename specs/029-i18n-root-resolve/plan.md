# Implementation Plan: 029 国际化接入与 `$.root.resolve(Tag)` 语法糖

**Branch**: `029-i18n-root-resolve` | **Date**: 2025-12-24 | **Spec**: `specs/029-i18n-root-resolve/spec.md`  
**Input**: `specs/029-i18n-root-resolve/spec.md`

## Summary

029 的目标是把「国际化作为领域特性」与「strict 默认、root 显式」这两条主线同时落到可交付、可验证的契约上：

- **新增语法糖**：在 Module Logic 的 `$` 上提供 `$.root.resolve(Tag)`，作为 `Logix.Root.resolve(Tag)` 的显式 root/global 入口，减少样板但不改变 strict 默认与隔离语义。
- **国际化接入模式**：允许宿主注入一个“外部国际化实例”（可异步就绪），并在 UI/业务代码与 Module Logic 内共享同一实例；优先以“message token（可延迟翻译）”承载可回放状态，提供“等待/不等待”两档翻译语义（`tReady` 默认等待上限 5 秒、支持覆盖），避免逻辑中扩散 `yield* ready` 样板。
- **双形态对接**：同时提供 I18n Service（Tag/Layer 注入）与 I18nModule（Root 单例模块，承载语法糖/控制面），且语言切换请求以 I18n Service 为主入口，I18nModule 仅转发封装（不另起事实源）。
- **包边界**：新增 `@logixjs/i18n` 作为 i18n 领域特性包；`@logixjs/core` 保持最小运行时内核（含 `$.root.resolve`），不引入对特定 i18n 引擎/资源加载的强绑定。

本次 `$speckit plan` 交付的设计物：

- 现状事实与决策：`specs/029-i18n-root-resolve/research.md`
- 数据模型：`specs/029-i18n-root-resolve/data-model.md`
- 契约：`specs/029-i18n-root-resolve/contracts/*`
- 最小演练：`specs/029-i18n-root-resolve/quickstart.md`

## Technical Context

**Language/Version**: TypeScript 5.x（ESM），Node.js 20+  
**Primary Dependencies**: `effect` v3、`@logixjs/core`、`@logixjs/react`、`@logixjs/i18n`（外部 i18n 以 i18next 风格实例为典型注入值；`@logixjs/i18n` 不依赖具体引擎；不新增 `@logixjs/i18n-react`）  
**Storage**: N/A（以 Effect Env/Context/Layer + runtime state 为主）  
**Testing**: Vitest + `@effect/vitest`（一次性运行；不使用 watch）  
**Target Platform**: Browser（React 适配）+ Node.js（测试/运行时）  
**Project Type**: pnpm workspace monorepo  
**Performance Goals**:

- `$.root.resolve` 的调用开销应与 `Root.resolve` 等价（O(1)，避免额外扫描/大对象分配）；热路径回归预算：diagnostics 关闭时 ≤1%。
- message token 必须 Slim & 可序列化：单个 token 序列化预算建议 ≤256B；超限稳定失败并给出可修复诊断。
- 基线/验证方式：以可复现 micro-benchmark（仅测解析/翻译 token 化路径）+ 关键集成测试（多 tree 隔离）锁死；基线建议在稳定环境（CI 或同一台固定机器）运行，并在 `perf.md` 记录 OS/CPU/Node 版本等环境信息以降低噪音。
  **Constraints**:
- strict 默认：`$.use(...)` 等 strict 入口缺失必须稳定失败，禁止隐式回退到 root/global。
- root/global 必须显式：`$.root.resolve(Tag)` / `Root.resolve(Tag)` 才表达单例语义；禁止进程级全局兜底作为正确性语义。
- 多 runtime tree 隔离：root 语义必须以“当前 runtime tree 的 root provider”为准，禁止跨 tree 串实例。
- 事务窗口禁止 IO：国际化异步初始化/加载语言包必须在事务外表达（或以受控后台流程表达），事务内只允许纯同步读写。
- 诊断事件 Slim 且可序列化：禁用时接近零成本；启用成本可预估并落档。
  **Scale/Scope**: 多 root（同进程多棵运行时树）+ 多模块实例（key）+ 高频依赖解析（Logic/React 双入口）

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- `Intent → Flow/Logix → Code → Runtime` 映射：
  - Intent/需求：以 `specs/029-i18n-root-resolve/spec.md` 的用户故事与成功标准作为验收口径（显式 root 解析、共享外部 i18n、异步就绪两档语义、多 tree 隔离）。
  - Flow/Logix：Module Logic 侧通过 `$` 的显式 root 入口获取全局单例能力；国际化以“可注入服务 + 可订阅快照 + message token”承载，避免把最终字符串强行塞进 state。
  - Code：核心落点在 `packages/logix-core`（Bound API `$` 的类型/实现、Root provider 解析、`$.root.resolve` 语法糖）与 `packages/i18n`（`@logixjs/i18n`：I18n Service / I18nModule / message token / 最小形状注入）；必要时补 `packages/logix-react` 的示例/文档对齐（不改变现有语义，只增补 DX）。
  - Runtime：root provider 必须 tree-scoped；strict 默认不得隐式回退 root；i18n 就绪/语言变化必须可解释、可回放。
- 依赖或修改的规格/事实源（docs-first & SSoT）：
  - 解析语义依赖：`specs/008-hierarchical-injector/contracts/resolution.md`（strict 默认 + 显式 root/global 的裁决口径）。
  - Runtime SSoT（需要补齐/更新的契约落档点）：
    - `docs/ssot/runtime/logix-core/api/03-logic-and-flow.md`（Bound API `$`：新增 `$.root.resolve` 的语义边界与推荐用法）
    - `docs/ssot/runtime/logix-core/api/02-module-and-logic-api.md`（Root provider / `Root.resolve` 的使用建议与 strict 对比）
    - 如新增国际化领域特性公共 API，需要在同目录补一个 i18n 专章或在现有“横切能力”章节中落档（避免仅存在于代码）。
- Effect/Logix 契约变更：
  - 新增对外 API：`$.root.resolve(Tag)`（显式 root/global 解析语义）；属于增量能力但必须保持 strict 默认不变（避免隐式兜底）。
  - 国际化接入：以“可注入服务契约”表达（mockable / per runtime tree / 可隔离），避免通过进程全局变量共享实例。
- IR & anchors：
  - 不修改统一最小 IR；message token 属于“可回放状态的业务数据结构”，必须保持 Slim/可序列化与稳定形状，且不得把非序列化对象（函数/Effect/大对象图）写入 state/事件。
- Deterministic identity：
  - `$.root.resolve` 的解析必须固定落在“当前 runtime tree 的 rootContext”，不得依赖 process-global 单例表；诊断字段需包含可复现锚点（例如 moduleId/instanceId/tree 标识等可推导信息）。
- Transaction boundary：
  - `$.root.resolve` 与 message token 组装必须是纯同步；i18n 异步初始化/加载语言包不得在事务窗口内发生，等待就绪必须以 Effect/流程边界表达。
- Internal contracts & trial runs：
  - 新增 `$` 的 root 能力属于内部 hooks 扩展，必须通过显式可注入的 RootContext/服务契约实现（不引入 magic 字段/参数爆炸），可在测试中按 tree 隔离 mock。
  - 国际化实例注入必须可替换与可 mock（按 tree/会话隔离），避免依赖进程级 `i18n` 单例。
- Performance budget：
  - 热点：`$` 构造与 root 解析属于高频路径；需以 micro-benchmark + 回归测试锁死（budget ≤1%）。
- Diagnosability & explainability：
  - root 解析失败、i18n 未就绪/初始化失败、message token 超限/不可序列化等必须提供结构化诊断信息（dev 丰富、prod 精简），且禁用时接近零成本。
- User-facing performance mental model：
  - 不引入新的自动策略；对外只需强调“root 解析是 O(1)”“message token 轻量”“语言切换以订阅/快照驱动更新”，并给出推荐用法与优化梯子（必要时补到 docs）。
- Breaking changes：
  - 预期为增量 API（新增 `$.root.resolve` 与 i18n 领域特性入口）；不改变既有 strict 默认与已有入口语义。
- Quality gates（merge 前）：
  - `pnpm typecheck`、`pnpm lint`、`pnpm test` 必须通过；新增契约需配套单测与最小演练示例。

## Project Structure

### Documentation (this feature)

```text
specs/029-i18n-root-resolve/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
├── checklists/
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/                                               # `$`/Root 语义（运行时内核）
packages/i18n/                                                     # `@logixjs/i18n` 领域特性包（Service/Module/token/driver）
packages/logix-react/                                              # React 适配（如需补齐示例/Hook 语义）
docs/ssot/runtime/              # Runtime SSoT（契约落档）
apps/docs/content/docs/                                            # 用户文档（如需要面向业务开发者的使用指南）
examples/                                                          # 最小演练与验收场景（建议补一个 i18n + 多 tree 演练）
```

**Structure Decision**: 本仓为 pnpm workspace monorepo；029 遵循“先固化契约与数据模型（research/data-model/contracts/quickstart），再进入 tasks 拆分与实现”的顺序推进，避免 DX/语义漂移。

## Implementation Strategy（分阶段落地与交付物）

> 说明：本节是路线图级别计划；更细可交付任务拆分在后续 `tasks.md`（$speckit tasks）中完成。

### Phase 0：事实对齐与契约固化（本次 $speckit plan 的交付物）

- 汇总现状与约束：strict 默认、root provider 隔离、多 tree 与外部 i18n 共享实例的边界（`research.md`）。
- 定义 i18n 快照、message token、翻译模式（等待/不等待）的数据模型（`data-model.md`）。
- 输出对外契约：`$.root.resolve` 的行为、错误口径与 i18n 注入/就绪语义（`contracts/*`）。
- 给出最小演练（`quickstart.md`）：Logic 内 root resolve；UI/Logic 共享同一 i18n；语言切换下 message token 自动渲染更新。

### Phase 1：Core 增量能力（`$.root.resolve`）+ `@logixjs/i18n` 领域特性包

- 在 Module Logic 的 `$` 上新增 `root` 命名空间（或等价形态），提供 `resolve(Tag)`：
  - 语义等价于 `Logix.Root.resolve(Tag)`：固定解析当前 runtime tree 的 root provider；
  - 不改变 strict 默认：不会让 `$.use(...)` 变成“缺失时自动 root 兜底”。
- 为国际化提供“可注入服务契约”的最小入口（落点在 `@logixjs/i18n`，类似 Query 的 layer 思路）：
  - 宿主注入“符合最小形状（I18nDriver）的外部 i18n 实例”（可异步初始化，例如 i18next 风格实例可直接作为注入值）；
  - 运行时暴露最小 I18nSnapshot（language/ready/seq）以支持订阅驱动的更新；
  - 提供两档翻译语义：不等待（立即回退可展示结果）与等待（就绪后返回确定结果，默认等待上限 5 秒、支持覆盖）。
  - 提供从 Logix 侧发起“请求切换语言”的能力：以 I18n Service 为主入口（I18nModule 仅转发），并确保变更通过 I18nSnapshot 作为单一事实源对外传播。
- message token 作为推荐形态：
  - 可写入可回放 state/事件；
  - 最终字符串在展示边界生成；若业务选择把最终字符串落到 state，必须显式依赖 I18nSnapshot 的变化触发重算（不隐式魔法）。

### Phase 2：回归测试、示例与文档落档

- 回归测试：
  - strict vs root 的入口同构：缺失提供者/多 tree 隔离/override 不影响 root；
  - i18n：共享同一实例、语言切换传播、ready 两档语义与失败降级。
- 示例与文档：
  - 更新 runtime SSoT（`docs/ssot/runtime/*`）确保新入口与 i18n 契约有单一事实源；
  - 增补最小示例（`examples/*` 或 `apps/docs`）用于“零 useEffect”场景验收与 DX 验证。

## Constitution Re-check（Post Phase 1 Design）

- PASS：未引入进程级全局兜底；root/global 语义保持显式（`$.root.resolve` 仅为 DX 语法糖）。
- PASS：未修改统一最小 IR；message token 被定义为 Slim & 可序列化的数据结构（预算与错误口径已落档到 `contracts/*`）。
- PASS：事务窗口禁止 IO 的约束保持：等待就绪属于 Effect 边界；token 构造为纯函数路径。
- PASS：内部协作协议显式化：i18n 以可注入服务契约接入（Layer 注入、可 mock、per tree 隔离）。
- TODO（实现阶段必须补齐证据）：`$.root.resolve`/token 校验的性能基线与回归预算（diagnostics off ≤1%）。
