# Tasks: 042 - React 集成冷启动策略与 DX 优化

**Input**: `specs/042-react-runtime-boot-dx/`（`spec.md` / `plan.md` / `research.md` / `data-model.md` / `quickstart.md` / `contracts/`）
**Scope**: `packages/logix-react`（RuntimeProvider / hooks / ModuleCache / perf-boundaries）+ 文档同步（runtime SSoT SSoT、apps/docs、examples）

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无强依赖）
- **[Story]**: 对应用户场景（`[US1]`/`[US2]`/`[US3]`）
- 每条任务必须包含明确文件路径

---

## Phase 1: Setup（证据与契约骨架）

- [x] T001 建立 042 的基线证据落点与说明（baseline/预算口径/运行方式 + 命名约定）：`specs/042-react-runtime-boot-dx/plan.md`、`specs/042-react-runtime-boot-dx/quickstart.md`、`specs/042-react-runtime-boot-dx/perf/after.worktree.json`
- [x] T002 [P] 采集并落盘“变更前 baseline evidence”（browser perf-boundaries / 关键指标口径）：`specs/042-react-runtime-boot-dx/perf/before.${GIT_SHA}.${ENV_ID}.json`
- [x] T003 定义 `RuntimeProvider` 的 `policy` 契约（`mode: sync|suspend|defer` + `preload`）并对外导出：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`、`packages/logix-react/src/RuntimeProvider.ts`
- [x] T004 [P] 扩展 Provider Context 承载“解析后的策略快照”（供 hooks 默认读取）：`packages/logix-react/src/internal/provider/ReactContext.ts`
- [x] T005 [P] 在 runtime SSoT SSoT 中固化对外心智模型与默认值（含 `defer+preload` 与边界）：`docs/ssot/runtime/logix-react/01-react-integration.01-core-hooks.md`

---

## Phase 2: Foundational（阻塞前置：错误可行动 + 消除抖动 + preload 基础）

- [x] T006 [P] 提升 `RuntimeProvider not found` 的可行动性（FR-004）：统一错误类型/消息与修复建议（典型原因：hook 脱离 Provider、Provider 未提供 runtime、Provider 层级错误等）：`packages/logix-react/src/internal/hooks/useRuntime.ts`、`packages/logix-react/src/internal/hooks/useModule.ts`、`packages/logix-react/src/internal/hooks/useLocalModule.ts`、`packages/logix-react/src/internal/hooks/useSelector.ts`、`packages/logix-react/src/internal/hooks/useProcesses.ts`、`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- [x] T007 将 `configVersion` 派生规则收敛为“仅 cache-critical 字段触发”（当前为 `gcTime`）：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- [x] T008 [P] 为 `configVersion` 派生增加回归用例：非 critical 字段（如 `initTimeoutMs/lowPriority*`）变化不再导致 `ModuleCache` dispose：`packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx`
- [x] T009 实现 ModuleCache 的非 Suspense 预加载入口（不 throw Promise）：`packages/logix-react/src/internal/store/ModuleCache.ts`
- [x] T010 [P] 为 ModuleCache preload 增加单测（覆盖：去重、并发/取消、pending→success、错误短 GC）：`packages/logix-react/test/internal/store/ModuleCache.preload.test.ts`

---

## Phase 3: User Story 1 - 默认无卡顿的集成体验 (Priority: P1) 🎯 MVP

**Goal**: 默认配置下避免路由切换/首渲染出现可感知同步阻塞；fallback 语义统一；错误可行动。
**Independent Test**: 运行 `examples/logix-react` 默认 demo，首次进入模块页面/切换路由无明显“先卡住再跳转”，且缺少 Provider 的错误提示清晰可行动。

- [x] T011 [P] 让 `useModule` 默认读取 Provider 策略并选择 `ModuleCache.read`（suspend）或 `readSync`（sync），并输出 `react.module.init` 诊断事件（Slim）：`packages/logix-react/src/internal/hooks/useModule.ts`、`packages/logix-react/src/internal/store/ModuleCache.ts`
- [x] T012 [P] 调整 `useModule` 的 suspend 默认 key 策略：允许“Provider 默认 suspend”时使用组件级稳定 key（保留显式 key 用于跨组件共享与分区）：`packages/logix-react/src/internal/hooks/useModule.ts`
- [x] T013 为 `RuntimeProvider` 增加内部统一 fallback（覆盖 layer 未就绪 + suspend 模式的 Suspense），并输出 `react.runtime.config.snapshot` 诊断事件（Slim）：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- [x] T014 引入 cooperative yield（默认 `microtask`，并提供 `none/macrotask` 选项），确保 `suspend` 场景尽早进入 pending；同时在诊断/证据字段中记录 `yieldStrategy` 以支持对比：`packages/logix-react/src/internal/store/ModuleCache.ts`
- [x] T015 [P] 为渲染期同步阻塞增加 dev/test guardrail（source + duration + fix + 去噪/去重）；在 `defer` 模式下若 render 期触发 sync init，提示检查 `policy.preload`/默认解析策略：`packages/logix-react/src/internal/store/ModuleCache.ts`、`packages/logix-react/src/internal/hooks/useModuleRuntime.ts`
- [x] T016 修复/同步 examples 默认用法，避免旧 demo 在新默认策略下报错或卡顿：`examples/logix-react/src/demos/DiShowcaseLayout.tsx`、`examples/logix-react/src/demos/ProcessSubtreeDemo.tsx`

---

## Phase 4: User Story 2 - 可控的一致性与确定性 (Priority: P2)

**Goal**: 支持显式策略选择（sync/suspend/defer），语义清晰一致；`defer` 不泄漏半初始化句柄；fallback 统一。
**Independent Test**: 在同一 demo 中切换策略：`sync`（确定性）/`suspend`（响应性）/`defer+preload`（延后冷启动）行为可解释且无语义漂移。

- [x] T017 实现 `RuntimeProvider` 的 `policy.mode="sync"`（含 syncBudgetMs + 超预算回退），并输出诊断事件（Slim）：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- [x] T018 实现 `RuntimeProvider` 的 `policy.mode="defer"`（Provider gating：commit 后完成快照稳定 + preload，ready 后再 mount children）：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- [x] T019 实现 `policy.preload`：支持预初始化 ModuleImpl 列表并复用 ModuleCache（不依赖 Suspense），并提供 `concurrency` 且设置保守默认值（建议 `5`），同时输出 `react.module.preload` 诊断事件（Slim）：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`、`packages/logix-react/src/internal/store/ModuleCache.ts`
- [x] T020 在 `defer+preload` 下补齐用例：验证子组件 `useModule(PreloadedImpl)` 不再触发二次 fallback/suspend（无闪烁冷启动）：`packages/logix-react/test/browser/perf-boundaries/react-defer-preload.test.tsx`
- [x] T021 为 `useModuleRuntime(handle=ModuleTag)` 增加策略入口（至少支持 suspend + yield 的可控路径），并输出 `react.moduleTag.resolve` 诊断事件（Slim）：`packages/logix-react/src/internal/hooks/useModuleRuntime.ts`
- [x] T022 实现 `onlyWhenOverBudgetMs` 的“首次运行”记忆（runtime/session 维度，HMR/remount 鲁棒）：`packages/logix-react/src/internal/store/perfWorkloads.ts`、`packages/logix-react/src/internal/store/ModuleCache.ts`

---

## Phase 5: User Story 3 - 可复现的性能基线与回归防线 (Priority: P3)

**Goal**: 为 boot/resolve 建立 browser perf-boundary 基线与阈值 gate，防止同步阻塞回归。
**Independent Test**: 浏览器 perf-boundaries 用例能稳定跑通，并在策略退化时可检测到回归。

- [x] T023 新增 React boot/resolve 相关 perf-boundaries 指标与用例：`packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.test.tsx`
- [x] T024 将预算口径收敛为 relative budgets，并在用例内输出可对比的证据字段（policy/yield/key）：`packages/logix-react/test/browser/perf-boundaries/harness.ts`
- [x] T025 采集并落盘“变更后 evidence（after）”，并生成 before/after 对比（PerfDiff）：`specs/042-react-runtime-boot-dx/perf/after.worktree.json`、`specs/042-react-runtime-boot-dx/perf/diff.before.${GIT_SHA}.${ENV_ID}__after.worktree.json`
- [x] T026 在 `specs/042-react-runtime-boot-dx/quickstart.md` 补齐最终 API 与基线跑法，并补齐 Troubleshooting（“启用了 defer 仍卡顿？”→ preload 列表/默认解析策略/guardrails）：`specs/042-react-runtime-boot-dx/quickstart.md`

---

## Phase 6: Polish & Docs（跨故事收口）

- [x] T027 [P] 同步用户文档（产品视角，不出现 PoC 术语）：`apps/docs/content/docs/`（新增或更新 React 集成指南页）
- [x] T028 [P] 补齐示例与迁移说明（本仓拒绝兼容但需说明迁移动作）：`examples/logix-react/`、`specs/042-react-runtime-boot-dx/plan.md`
