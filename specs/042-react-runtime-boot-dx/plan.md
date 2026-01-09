# Implementation Plan: React 集成冷启动策略与 DX 优化

**Branch**: `042-react-runtime-boot-dx` | **Date**: 2025-12-27 | **Spec**: `./spec.md`

## Summary

将 Logix React 集成中“可能在渲染关键路径触发同步重活/冷启动”的行为收敛为可配置策略，并建立可复现性能基线与回归防线；使业务默认集成更少踩坑（错误可行动、策略可解释、性能可控）。

本特性聚焦 `@logixjs/react` 的三类关键路径：

1. `RuntimeProvider` 挂载阶段（运行时/配置快照/Layer 绑定）
2. `useModule` / `useModuleRuntime` 的首次解析（ModuleImpl 构建 / ModuleTag 解析）
3. 相关诊断事件与 perf-boundary 测量用例（防止同步阻塞回归）

**Decision Digest**（2025-12-27）

- 裁决：本轮交付 `defer`（延后模式），并补齐“统一 fallback / 不泄漏半初始化句柄 / 预加载与回归基线”这条链路的实现与文档
- 保留：`onlyWhenOverBudgetMs` 的“首次运行”判定需对 remount 足够鲁棒（以 runtime/session 维度而不是组件 mount 维度记忆），避免开发环境反复闪烁

**Review Digest**（2025-12-27，来源：`specs/042-react-runtime-boot-dx/review.md`）

- 接受（R101）：Yield 策略需验证有效性（microtask vs macrotask）；实现上保留 `none/microtask/macrotask` 策略，并在 perf-boundaries 证据字段中记录 `yieldStrategy` 以便对比与回归定位
- 接受（R102）：补齐 `defer` 的“部分 preload”预期管理：明确保证边界 + Troubleshooting（“启用了 defer 仍卡顿？”→ 检查 preload 列表/默认解析策略），并在 guardrails 中对 “defer 下 render 期触发 sync init” 给出提示
- 接受（R103）：`configVersion` 与 cache invalidation 解耦需可维护：显式定义 cache-critical 派生（当前仅 `gcTime`），并在用例/检查点中防止未来新增 critical 字段时漏改派生逻辑
- 接受（R201）：在 `data-model.md` 显式声明 `DEFAULT_PRELOAD_CONCURRENCY = 5`，并作为 `ModulePreloadPolicy.concurrency` 的默认值，避免实现散落魔数
- 接受（R202）：裁减 `YieldPolicy.strategy` 枚举为 `none/microtask/macrotask`，与 Plan/Tasks 对齐
- 接受（R203）：统一 `quickstart.md` 的 CLI 占位符为 `${VAR}` 形式，并补充占位符说明
- 接受（R204）：明确 `defer` 下的 “layer 未就绪 + preload 未完成” 都统一复用 `RuntimeProvider.fallback`（无需业务侧组合等待态）

## Technical Context

**Language/Version**: TypeScript 5.8.x（ESM）  
**Primary Dependencies**: `effect` v3（workspace override 固定 3.19.13）、`@logixjs/core`、`@logixjs/react`、React 19  
**Storage**: N/A（内存态）  
**Testing**: Vitest（含浏览器 perf-boundaries 用例）  
**Target Platform**: Node.js 22.x + 现代浏览器（Vitest browser）  
**Project Type**: pnpm workspace（packages + examples + apps）  
**Performance Goals**: 避免在“渲染提交关键路径”引入不可控同步阻塞；为关键路径建立 browser perf-boundary 基线与阈值 gate（详见下文预算与测量口径）  
**Constraints**: 诊断事件 Slim & 可序列化；禁用时接近零成本；稳定标识（instance/txn/op）不漂移  
**Scale/Scope**: 以真实业务路由切换/首次进入模块页面为主要场景；需要覆盖 StrictMode/Suspense 行为矩阵

## Constitution Check

_GATE: PASS（本计划不引入宪法违例；若最终选择破坏性默认策略变更，迁移说明需在 Phase 1 落地）_

- **Intent → Flow/Logix → Code → Runtime 映射**：此特性属于 Runtime 适配层（React Adapter）对 Runtime 行为的“启动/解析策略”治理；不改变业务 Intent/Flow 语义，但会改变运行时装配与模块解析的时序与可观测性。
- **依赖/修改的 specs**：主落点是 `packages/logix-react`；如需对外文档心智模型与 DX 指引，后续需要补齐 `apps/docs` 的 React 集成指南（避免 “代码先变、文档漂移”）。
- **契约变更**：预计会新增/调整 `@logixjs/react` 的“策略配置”契约（RuntimeProvider props / ReactRuntimeConfigTag 扩展 / hooks options）；必须同步更新 `docs/ssot/runtime/logix-react/*` 中的 SSoT（至少补齐策略语义、默认值与成本模型）。
- **IR & anchors**：不改变统一最小 IR；但会影响 Devtools 的解释链路“何时产生 trace/diagnostic”与事件序列，需要保持事件字段稳定且 Slim。
- **Deterministic identity**：不引入随机/时间默认 ID；所有新增诊断字段须复用现有 instanceId/txn/op 体系。
- **Transaction boundary**：不改变事务窗口语义；本特性只涉及 React adapter 的初始化/解析调度与外层可观测。
- **Internal contracts & trial runs**：策略配置必须以显式可注入契约提供（Tag/Layer 或 props），禁止新增隐式全局开关；perf/基线用例可在浏览器内独立运行，不依赖进程级全局单例。
- **Performance budget & regression**：新增 browser perf-boundaries 用例覆盖 runtime boot / module resolve / route navigation 级别的同步阻塞风险；阈值以 p95 预算表达，并输出 PerfReport 以便证据化对比。
- **Diagnosability & explainability**：为“发生了同步阻塞/发生了延后/发生了挂起/发生了错误”补齐结构化事件；禁用时不引入显著额外分配。
- **User-facing performance mental model（≤5 keywords）**：准备对外心智模型（建议关键词：`boot policy` / `suspend` / `yield` / `key` / `baseline`），并在文档中给出成本模型与优化阶梯（默认 → 观测 → 启用策略 → 细化 key/分区 → 预热/拆分）。
- **Breaking changes**：本仓拒绝向后兼容；若最终决定“默认行为收紧/切换”，需提供迁移说明（但不保留兼容层）。
- **Public submodules**：改动若触及 `packages/logix-react/src/*.ts` 的对外导出结构，必须保持 public submodules 规则，内部实现下沉到 `src/internal/**`。
- **质量门**：至少跑通 `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`；涉及 browser perf-boundary 则需确保对应用例稳定可跑（可在 tasks 阶段细化）。

## Migration Notes（破坏性变更，无兼容层）

> 本仓拒绝向后兼容：迁移说明用于“告诉调用方需要做什么”，而不是提供兼容层。

1. `RuntimeProvider` 默认策略变更：默认 `policy.mode="suspend"`。
   - 建议：为所有 Provider 提供 `fallback`（统一等待态，避免空白渲染）。
   - 若你需要确定性/无挂起：显式切回 `policy.mode="sync"`（必要时配 `syncBudgetMs`）。
2. `useModule(Impl, { suspend: true })` 行为收紧：显式 `suspend:true` 必须提供稳定 `key`。
   - 若只是想跟随 Provider 默认策略：移除 `suspend:true`，直接 `useModule(Impl)`。
   - 若需要跨组件共享实例/分区语义：提供显式 `key`（例如业务 id / useId）。
3. `defer` 的保证边界：仅保证 `policy.preload` 列表内模块在子树 mount 时就绪。
   - 若出现二次 fallback：补齐 `preload` 列表，或切回默认 `suspend`。
4. 新增对外契约导出：`RuntimeProviderPolicy` / `YieldPolicy` / `YieldStrategy` / `ModuleHandle` 等从 `@logixjs/react` 导出（见 `packages/logix-react/src/RuntimeProvider.ts`）。

## Project Structure

### Documentation (this feature)

```text
specs/042-react-runtime-boot-dx/
├── checklists/
├── spec.md
├── plan.md
├── tasks.md
├── research.md
├── data-model.md
├── quickstart.md
├── review.md
├── perf/
│   └── after.worktree.json
└── contracts/
    └── README.md
```

### Source Code (repository root)

```text
packages/logix-react/
├── src/
│   ├── Hooks.ts
│   ├── RuntimeProvider.ts
│   └── internal/
│       ├── hooks/
│       │   ├── useModule.ts
│       │   ├── useModuleRuntime.ts
│       │   └── useRuntime.ts
│       ├── provider/
│       │   ├── RuntimeProvider.tsx
│       │   └── config.ts
│       └── store/
│           └── ModuleCache.ts
└── test/browser/perf-boundaries/
    ├── harness.ts
    ├── converge-steps.test.tsx
    └── ...（新增本特性的 boot/resolve perf 用例落点）

packages/logix-core/
└── src/internal/root.ts  # MissingRootProviderError 等错误语义参考（DX 对齐）

examples/logix-react/      # 集成 demo（用于手工验收与场景回归）
```

**Structure Decision**: 本特性为 `packages/logix-react` 的 adapter/runtime 行为治理；规格产物落在 `specs/042-react-runtime-boot-dx/*`，回归基线优先落 `packages/logix-react/test/browser/perf-boundaries/*`。

## Complexity Tracking

无（当前计划不需要引入宪法违例的复杂结构）。

## Phase 0: Research（产物：`research.md`）

研究目标：把“同步/冷启动阻塞点”清单列全，并把现有实现里已存在的机制（Suspense/ModuleCache/ConfigTag/Layer 绑定）纳入可配置策略的设计空间，避免拍脑袋新增第二套机制。

研究范围（必须覆盖，且在 `research.md` 中逐项落证据落点）：

- `RuntimeProvider`：同步 `runSync(ReactRuntimeConfigSnapshot.load)` 的渲染期阻塞风险与替代策略（例如完全异步快照、或带 budget/阈值的同步尝试）。
- `useModule`（ModuleImpl 路径）：`ModuleCache.readSync` 与 `read` 的差异；`suspend:true` 的真实收益边界（runPromise 仍可能同步执行到第一个异步点）；`key`/StrictMode/Suspense 的稳定性约束。
- `useModuleRuntime`（ModuleTag 路径）：`runtime.runSync(tag)` 在渲染期可能触发的同步重活与替代策略（例如 suspense/延后/预热）。
- `ModuleCache`：`read/readSync` 的关键同步点、Scope 生命周期与 GC 策略，及其对 DX（StrictMode jitter / 渲染 abort）的影响。
- perf-boundaries：现有用例覆盖面（当前以 runtime converge/diagnostics 为主），以及新增“React boot/resolve”测量口径的对齐策略。

## Phase 1: Design（产物：`data-model.md`、`contracts/README.md`、`quickstart.md`）

设计目标：在不引入隐式全局开关的前提下，提供清晰的策略配置入口，让使用者可以用“同一套心智模型”控制：

1. Provider 冷启动行为（尤其是渲染期同步 work）
2. 模块解析行为（ModuleImpl/ModuleTag）
3. 可观测与回归防线（诊断事件 + 性能基线）

拟定方案（允许在 tasks 阶段进一步细化命名，但必须保持语义不漂移）：

- **方案选择（拍板）**：以 **方案 B（cooperative yield）为主线**，优先治理“纯同步重活导致的渲染期阻塞”，并覆盖 ModuleImpl init + ModuleTag resolve；在此基础上交付两层 DX 收敛：**方案 A（Provider 统一 fallback / Suspense 包装）** 与 **方案 C（defer：Provider gating + 可选 preload）**，避免业务侧在“阻塞/挂起/延后”之间散落样板与错误用法。
- **关键约束（必须显式治理）**：`RuntimeProvider` 当前会在快照变化时递增 `configVersion`，而 `useModule`/`useLocalModule` 通过 `getModuleCache(runtime, snapshot, configVersion)` 在版本变化时 dispose 旧 cache 并重建；因此“Provider 异步加载快照”若导致快照在子树 mount 后发生变化，会引发 **模块实例被动重建/状态抖动/额外成本**。本特性必须把这条链路收敛为明确策略：要么在子树 mount 前就确定 cache-critical 快照（通过 gating/fallback），要么将快照更新与 cache 版本解耦（只让真正影响 cache 的字段触发版本变更）。
- **DX 一致性（fallback 统一）**：`RuntimeProvider` 的 `fallback` 作为统一入口：当选择 Provider 级 `suspend/defer`（以及现有 “layer 未就绪”）时都使用同一个 `fallback`，避免业务侧形成两套 fallback 心智。
- **默认策略（倾向性能友好）**：若业务使用 `RuntimeProvider` 且未显式指定策略，默认推荐走 `suspend`（ModuleImpl init + ModuleTag resolve），并由 `RuntimeProvider.fallback` 承接“未就绪占位”；需要强确定性/无挂起（例如部分测试或极简场景）时，显式切回 `sync`。
- **实现落点补充（DX 默认策略如何生效）**：`useModule`/`useModuleRuntime` 不要求业务每次显式传 `{ suspend: true }`；而是在内部读取 `RuntimeProvider` 下发的 policy（Context 字段），计算“有效模式”（调用点 options > Provider policy > 内置默认），并据此选择 `ModuleCache.read(...)`（suspend）或 `ModuleCache.readSync(...)`（sync）。ModuleImpl 在 suspend 模式下默认 key 策略为 `autoUseId`（组件级），仅当需要跨组件共享实例时才要求显式 `key`。
- **审查结论补强（必须解耦 cache invalidation）**：配置刷新（`ReactRuntimeConfigSnapshot.load` 的结果更新）必须与 `ModuleCache` 失效解耦：传递给 `getModuleCache(...)` 的版本标识（现有 `configVersion`）应当仅在 **cache-critical 字段**实际变化时才变化（当前实现里实际影响 `ModuleCache` 的只有 `gcTime`）；`initTimeoutMs` / `lowPriority*` 等非 critical 字段变化不应触发 cache dispose。
- **协作式让出默认语义（yieldNow）**：cooperative yield 的默认实现建议使用 `Effect.yieldNow()`（microtask 语义）以打断同步前缀并尽快进入 pending；同时保留可配置项（microtask/macrotask/none），避免强制引入 4ms+ 的 macrotask 延迟。
- **Yield 抖动风险（需要可控默认）**：yield 可能让“原本同步可用”的模块短暂进入 pending，造成极少数场景的 UI 闪烁；默认策略应偏保守：`sync` 模式不引入 yield，`suspend` 模式默认使用 `microtask`（可显式切换为 `none`/`macrotask`），并提供策略入口让调用方只在需要时启用更激进的让出。
- **Yield 自适应语义（onlyWhenOverBudgetMs）**：`onlyWhenOverBudgetMs` 作为“自适应跳过 yield”的阈值：首次初始化默认仍执行 `microtask` yield（“首次”以 runtime/session 维度记忆，而不是组件 mount 维度），以确保能尽早进入 pending；后续基于历史统计（例如 p95）判断初始化是否稳定低于阈值，若是则可跳过 yield 以减少不必要的 fallback 闪烁。
- **Perf 阈值口径**：perf-boundaries 的预算应优先使用“相对基线/相对阈值”（relative budgets），而非硬编码绝对值（例如固定 5ms），以减少不同设备/浏览器波动造成的误判。
- **策略配置入口（可注入）**：在 `@logixjs/react` 的 RuntimeConfig（`packages/logix-react/src/internal/provider/config.ts`）基础上扩展一组“启动/解析策略”字段（通过 Layer 覆盖/ConfigProvider/调用点显式传参三段优先级模型），并在 `RuntimeProvider` 提供 props 级覆盖（局部 override）。
- **Provider 冷启动策略**：默认不在渲染期做不可控 `runSync`；若需要同步读取配置（例如避免闪烁），必须提供可配置的 `syncBudgetMs` 与诊断事件，超过预算时自动回退到 async（而不是继续卡住）。
- **Module 解析策略**：在 `useModule`/`useModuleRuntime` 层提供“可选择的解析模式”（同步/挂起），并在 `defer` 模式下通过 Provider 级 preload+gating 把“首次解析”从渲染关键路径挪走；明确每种模式的约束（是否要求显式 key、是否允许异步 Layer、缺失 preload 时的默认行为）。
- **defer 交付形态（收敛、避免心智分裂）**：`defer`（延后模式）不引入“返回半初始化句柄”的新 hook 语义；而是收敛为 **Provider 级 gating + 可选 preload**：Provider 在就绪前显示 `fallback`，并在 commit 后完成“配置快照稳定 +（可选）关键模块预初始化”，ready 后再 mount 业务子树，使业务组件拿到的一定是可用的 runtime/module 句柄。
- **defer preload 的并发默认值（防止“异步阻塞”）**：`ModulePreloadPolicy.concurrency` 提供保守默认值（建议 `5`），并输出诊断事件以便定位“预加载过多导致变慢”的场景。
- **defer 的保证边界（Double-Suspend 预期）**：`defer` 只保证 `preload` 列表内模块在子树 mount 时就绪；未 preload 的模块仍可能在子组件 `useModule` 时触发 suspend 并产生二次 fallback。该行为属于预期，需要在 quickstart/用户文档中明确，并提供“如何消除闪烁”的行动建议（补齐 preload 列表/调整策略）。
- **Cooperative Yield（关键）**：提供可配置的“让出主线程/让出渲染关键路径”的策略（例如在初始化 Effect 的前缀插入可控的 yield/延后），使 `runPromise` 能尽快返回 pending 并被 Suspense 捕获，从而避免“suspend:true 但仍同步卡住”的假象。
- **诊断与告警**：当发生渲染期同步阻塞（例如 `runSync` 超过阈值）时，必须产出 Slim 的结构化事件（包含入口点、耗时、模块/实例标识、策略来源），并在 dev/test 环境提供可读错误/告警提示。
- **DX Guardrails（开发期强提示）**：在开发环境下，若检测到 React render 阶段发生了超过阈值的同步 Logix 初始化/解析（例如 `ModuleCache.readSync` / `useModuleRuntime(tag)` / Provider sync 路径），应输出可行动的 warning（提示切到 `suspend`、开启 yield、或切换 `sync` 预算策略），避免问题只在“卡顿体验”层面暴露。
- **DX Guardrails（告警格式约束）**：warning 至少包含：阻塞入口点、阻塞时长、可复制修复片段、以及指向用户文档的指针（最终落 `apps/docs`）。
- **性能基线与回归**：新增 browser perf-boundaries 用例，至少覆盖：RuntimeProvider mount、ModuleTag resolve、ModuleImpl init（sync vs suspend/yield 策略）三个维度，并与 `$logix-perf-evidence` 的证据格式对齐（用于后续提炼性能基线）。

## Phase 2: Tasks（在 `$speckit tasks` 中细化）

任务拆分方向：

1. RuntimeConfig/Provider 策略字段定义与默认值
2. `RuntimeProvider` 渲染期同步点收敛（含诊断/预算/回退）
3. `useModule` / `useModuleRuntime` 解析模式与 cooperative yield 支持（含 DX 错误与文档）
4. `configVersion` 与 cache invalidation 解耦（仅 cache-critical 触发）+ 回归用例：Provider 配置更新不会单纯导致 ModuleImpl 实例重建/remount
5. perf-boundaries 新用例 + 阈值 gate（relative budgets）+ 证据输出口径
6. DX Guardrails（render 阶段超阈值同步阻塞告警）+ 对应用例覆盖
7. 文档与示例同步（runtime SSoT SSoT + apps/docs + examples）
8. `defer` 模式：Provider gating + preload（不泄漏半初始化句柄）+ 用例验证 `defer+preload` 下子组件 `useModule` 不再触发二次 fallback/suspend + 诊断/基线/回归用例
9. `onlyWhenOverBudgetMs` 的“首次运行”记忆实现：以 runtime/session 维度持久化（对 HMR/remount 鲁棒）+ 对应用例
