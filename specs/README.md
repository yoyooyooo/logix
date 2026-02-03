# specs/ 未完成需求索引（Backlog Index）

> 目的：快速回答三件事：**还有哪些 spec 没做完**、**它们怎么串起来**、**建议先做哪条主线**。
> 备注：本文是导航与排期辅助，不是裁决来源；具体语义以各 spec 目录内的 `spec.md/plan.md/tasks.md` 为准。

## 状态口径

- `Active`：正在持续推进/扩展中的跑道或实验场。
- `Draft`：已成文但未落地（或仅局部落地），实现路径可能仍会随新裁决调整。
- `Planned`：明确想做，但尚未进入可执行任务阶段。
- `Frozen`：暂缓/冻结，不应排入近期实施顺序；需要重新裁决才会解冻。
- `Done/Complete/Superseded/Archived`：已完成/已关闭/已替代/已归档（不在本文主清单）。

## 关系总览（建议顺序＝“先打地基，再做出码跑道”）

行业模式地图（用于把“页面常见问题域”映射到本仓落点）：`docs/ssot/platform/appendix/concepts/01-frontend-pattern-landscape.md`

### 路线总控（真理→路线：先收口“调度 spec”，再展开实现）

- 控制律主线总控：[`077-logix-control-laws-v1`](./077-logix-control-laws-v1)（调度 073/075/076；避免 tick/时间语义/控制律漂移成双真相源）
- 全双工前置总控：[`080-full-duplex-prelude`](./080-full-duplex-prelude)（调度 078/075/081/082/079/085/…；以 M0–M3 门槛推进回写闭环）

### 实施路线（v1，按 080 的 M0–M3 里程碑门槛推进）

> 下面是“可执行的顺序建议”；更细的门槛/风险标记以 `specs/080-full-duplex-prelude/spec-registry.md` 为准。

1. **M0（锚点与证据硬门）**：先把可序列化/去随机化与 TrialRun 输出打实（优先 `016`、`025`；必要时补 `005/031` 的协议与 artifacts 槽位）。
2. **M1（结构可见）**：让平台能枚举并对齐 actions/servicePorts/ports&typeIR（优先 `067`、`078`、`035`）；同时把 `Π` 的 workflow slice（`075`）与 `078.servicePorts` 对齐，避免 workflow 的 `serviceId` 变成灰区字符串。
3. **M2（已达标：Agent 自证跑道）**：以 `085` 收口 CLI 工具箱（Oracle/Gate/Transform），并把 `081 → 082 → 079` 的保守回写闭环接入同一跑道（含 workflow `stepKey`）；达标定义见下方「M2 里程碑」。
4. **M3（语义与证据增强，可选）**：在回写闭环达标后再推进 `083/084`（能看见/能建议之前先确保能写回，避免演进死角）。
5. **消费者回归面（可选增强）**：`086` 作为 Manifest/Diff/TrialRun/Workflow slices 的可视化试验场与 UI 回归面，字段缺失必须显式提示（不作为 M0–M3 硬门槛）。

### M2 里程碑：Agent 自证跑道（Oracle→Gate→(可选)Transform→WriteBack）

```text
085 logix CLI（Oracle：ir export/trialrun；Gate：ir validate/ir diff；Transform：transform module）
  consumes: 078 Manifest + 075 workflowSurface（Root IR slices）
  drives:   081 AnchorIndex → 082 PatchPlan/WriteBack → 079 保守 autofill（含 stepKey）
  outputs:  可门禁确定性工件 + 可解释 reason codes + exit code（0/2/1）
```

达标定义（最小闭环）：

- 同一输入重复执行输出一致（工件可 byte-level diff；非确定性字段不得进入门禁工件口径）。
- 大改动后最少两条命令即可门禁：导出/试跑（Oracle）→ validate/diff（Gate），且失败原因可行动（reason code + pointer）。
- 平台子集内可选 batch transform：report-only 产出 PatchPlan；`--mode write` 幂等写回；子集外一律拒绝写回并可解释。

现状（已落地/可直接复用）：

- `@logixjs/core` 已提供 Root IR/差异/试跑底座：`Reflection.exportControlSurface` / `Reflection.diffManifest` / `Observability.trialRunModule`。
- Root IR 已支持 workflow slice 引用：`ControlSurfaceManifest.modules[*].workflowSurface.digest`（并已有回归测试）。
- 过渡工具仍存在：`scripts/ir/inspect-module.ts` 可做“导出 + 试跑 + diff”的一体化脚本验证；`085` 已提供收敛后的 `logix` 命令作为统一入口。

现状（本里程碑最小闭环已落地）：

- `packages/logix-cli` + `logix` bin：统一 stdout 单行 `CommandResult@v1`、exit code（0/2/1）；支持 `--mode report|write`、`--tsconfig`、`--out/--outRoot`，并支持 `logix.cli.json`（`--cliConfig/--profile`）收敛默认参数以缩短命令。
- CLI 权威入口（命令表/工件/安全边界/Transform 语义）：`specs/085-logix-cli-node-only/contracts/public-api.md`、`specs/085-logix-cli-node-only/contracts/artifacts.md`、`specs/085-logix-cli-node-only/contracts/safety.md`、`specs/085-logix-cli-node-only/contracts/transform-ops.md`、`specs/085-logix-cli-node-only/quickstart.md`。
- CLI 最小可运行 demo：`examples/logix-cli-playground`（含 `logix.cli.json`/profiles、`--inputs` 注入与 `--includeContextPack`/`--includeAnchorAutofill`）。
- Gate：`logix ir validate` / `logix ir diff` 已提供结构化报告与可门禁 exit code。
- Gate+Pack：`logix contract-suite run`（036）已提供“一键验收 + 最小事实包”，可选 `--includeAnchorAutofill` 在同一条命令里产出 `PatchPlan/AutofillReport` 并写入 context pack（report-only）。
- 078：`ModuleManifest.servicePorts` + TrialRun 端口级对齐/缺失定位已落地（可用于门禁与解释）。
- 081/082/079：`AnchorIndex@v1` → `PatchPlan@v1` → `WriteBackResult@v1` → 源码锚点闭环已接通，且 CLI 已提供 `logix anchor index/autofill`。
- Dev Server 已落地：`logix-devserver`（Local WS：`dev.info/dev.workspace.snapshot/dev.run/dev.runChecks/dev.cancel/dev.stop` + state file：`status/health/stop` + 纯命令行 `call`；可选 `dev.event.trace.*`）；协议 SSoT：`docs/ssot/platform/contracts/04-devserver-protocol.md`；CLI 合同：`specs/094-devserver-local-bridge/contracts/public-api.md`。
- 确定性门禁口径：`control-surface.manifest.json`/`workflow.surface.json` 走 digest 门禁；`trialrun.report.json`/`trace.slim.json` 标记为 non-gating（避免 timestamp 噪音进入 byte-level diff）。

Transform（可选，已落地）：

- `logix transform module --ops`：v1 支持 `ensureWorkflowStepKeys` + `addState/addAction`（Platform-Grade 子集；默认 report-only；`--mode write` 幂等写回）。

边界/风险（需提前对齐）：

- Node-only 试跑遇到浏览器特有代码会失败：已通过 099 的 Host adapters（`--host browser-mock`）解决；vNext 可扩展 Playwright/真实浏览器 runner（与 CI 成本/稳定性证据绑定）。

### M2+（CLI/DevServer 下一阶段，Done）

- [`099-cli-host-adapters`](./099-cli-host-adapters)（Done）— CLI Host 抽象与 Browser Mock Runner（解决 Node-only 试跑的浏览器代码失败）
- [`100-devserver-project-awareness`](./100-devserver-project-awareness)（Done）— DevServer Project Awareness（workspace snapshot / cliConfig discovery）
- [`101-devserver-safety-hardening`](./101-devserver-safety-hardening)（Done）— DevServer 安全硬化（readOnly/allowlist/state file 权限/写回门槛）
- [`102-devserver-trace-bridge`](./102-devserver-trace-bridge)（Done）— DevServer Trace/Debug Bridge（trace slim / diagnostics chain stream）

现状（M2+）：

- 已落地：`099/100/101/102`（Host adapters + snapshot + 安全护栏 + trace 事件桥接）

后续方向（vNext，非硬门槛）：

1. Host adapters vNext：Playwright/真实浏览器 runner（与 CI 成本/稳定性证据绑定）
2. Trace vNext：结构化 items / realtime streaming（当前 v1 为 JSON 文本 chunks）
3. 安全治理 vNext：更细粒度 allowlist/capabilities（保持简单可审计）

### 主线 A：Runtime 一致性 + `Π_source`（受限机制）

```text
073 tick 参考系（no-tearing） → 068 watcher fan-out 性能地基 → 076 source autoRefresh 内核化
  ↘ 016 稳定身份/可序列化诊断 + 027 观测加固 + 014/017 证据跑道（perf evidence）
```

定位：把“高频、受限、可 IR 化”的控制律收敛到内核（默认 diagnostics=off 近零成本，且不线性退化）。

### 主线 B：`Π_general`（通用编排）= 075 出码层（AI/平台）

```text
075 Canonical AST → Static IR → Runtime Plan/Trace
  依赖：073 tick 参考系（禁止影子时间线）
  约束：无闭包 / 显式分支 / stepKey 完整 / diagnostics gating / 可回放锚点
```

定位：**AI/平台专属出码层**，不以“人类手写爽”为主目标；人类可读写主要交给更上层 Recipe/Pattern（仍需可降解）。

### 主线 C：平台化出码/回写跑道（Parser/Rewrite/Anchors/Manifest）

```text
078 Module↔Service Manifest（servicePorts/ServiceId/TrialRun 对齐） ↔ 075 workflowSurface（Π slice）
  → 081 受限解析（AnchorIndex） → 082 受限重写（PatchPlan→WriteBack） → 079 保守自动补全（只补缺失字段）
  → 083 具名逻辑插槽（语义可见） / 084 Loader Spy（证据采集；不作权威）
  ↘（可选）086 可视化实验室（消费者回归面：Manifest/Diff/TrialRun/Workflow slices）
```

定位：让“生成/审查/回写”有单一真相源（统一最小 IR），并为 Alignment Lab/Devtools 提供可解释链路；执行入口由 `085` 提供（Oracle/Gate/Transform）。

### 主线 D：页面高频 UX/协作模式（在 075/076 之上扩展）

```text
087 roadmap → 088 async 协调面 → 089 optimistic → 090 suspense/query → 091 busy policy
  + 092 e2e latency trace（贯穿观测链路）
```

定位：这些大多应该以 **policy/recipe（数据）** 形态存在，必要时降解到 075/076；避免变成“闭包 DSL”或引入并行时间线。

---

## Runtime：未实施完毕清单（整合后：四条跑道）

> 口径：只收录“仍有未完成 tasks（`tasks.md` 内存在 `- [ ]`）”且与 Runtime 相关的 spec；并将其收口到少数跑道，避免概念/边界重叠与并行真相源。

### 跑道 1：Runtime Core / Control Laws（总控：077）

- [`077-logix-control-laws-v1`](./077-logix-control-laws-v1)（Group）— 参考系 + 控制律 + 热路径性能（成员关系 SSoT：`specs/077-logix-control-laws-v1/spec-registry.json`）
  - 未完成成员：[`070-core-pure-perf-wins`](./070-core-pure-perf-wins)、[`074-readquery-create-selector`](./074-readquery-create-selector)、[`068-watcher-pure-wins`](./068-watcher-pure-wins)、[`006-optimize-traits`](./006-optimize-traits)、[`076-logix-source-auto-trigger-kernel`](./076-logix-source-auto-trigger-kernel)、[`018-periodic-self-calibration`](./018-periodic-self-calibration)
- [`093-logix-kit-factory`](./093-logix-kit-factory)（Draft）— 语法糖机器（Kit/PortKit）：把端口型能力统一接到 Trait/Logic/Workflow（零副作用 + 稳定 identity；Router 只是实例）

### 跑道 2：Async Coordination（总控：087）

- [`087-async-coordination-roadmap`](./087-async-coordination-roadmap)（Group）— 统一异步协调面（pending/optimistic/resource/busy/trace）
  - 未完成成员：[`088-async-action-coordinator`](./088-async-action-coordinator)、[`089-optimistic-protocol`](./089-optimistic-protocol)、[`090-suspense-resource-query`](./090-suspense-resource-query)、[`091-busy-indicator-policy`](./091-busy-indicator-policy)、[`092-e2e-latency-trace`](./092-e2e-latency-trace)

### 跑道 3：Observability Protocol + Devtools（协议真相源：005）

- [`038-devtools-session-ui`](./038-devtools-session-ui)（Draft）— Devtools Session-First UI（消费 005 的协议与证据）

### Frozen：core-ng（tasks 未清零，但不排期）

- [`053-core-ng-aot-artifacts`](./053-core-ng-aot-artifacts)（Frozen）— core-ng AOT Artifacts（Static IR / Exec IR 工件化）
- [`054-core-ng-wasm-planner`](./054-core-ng-wasm-planner)（Frozen）— core-ng Wasm Planner（可选极致路线）
- [`055-core-ng-flat-store-poc`](./055-core-ng-flat-store-poc)（Frozen）— core-ng Flat Store PoC（arena/SoA/handle 化）

### 已收口：Router 不再单列为 Runtime backlog

- Route Snapshot：按 `073 ExternalStore` 作为外部输入源（避免单独 Router 真相源；见用户文档 `apps/docs/content/docs/guide/recipes/external-store.md`）。
- Navigation Intent：以 `088 Async Action` 的“事务外 IO + 事务内回写”形态集成（需要时再新增/固化注入契约；不再单独维护 `071` 规划）。

## 未完成 specs（按主题分组）

> 说明：分组是“实施/排期视角”，不是语义层级裁决；同一 spec 可能与多条主线相关，这里按最主要落点归类。

### A) 075 周边主线（出码 IR + 机制内核化 + 平台跑道）

#### 基础/依赖（控制律/性能/调度 + 总控）

- [`080-full-duplex-prelude`](./080-full-duplex-prelude)（Done）— Full-Duplex Prelude（统一最小 IR + 回写前置）
- [`075-workflow-codegen-ir`](./075-workflow-codegen-ir)（Done）— Workflow Codegen IR（WorkflowDef/Canonical AST + workflowSurface slice）
- [`078-module-service-manifest`](./078-module-service-manifest)（Done）— Module↔Service Manifest（servicePorts + TrialRun 端口级对齐）
- [`085-logix-cli-node-only`](./085-logix-cli-node-only)（Done）— Logix CLI（Node-only：Oracle/Gate/WriteBack/Transform）
- [`094-devserver-local-bridge`](./094-devserver-local-bridge)（Done）— Dev Server Local Bridge（Local WS：`dev.info/dev.run/dev.runChecks`）
- [`095-devserver-cli-client`](./095-devserver-cli-client)（Done）— DevServer CLI Client（纯命令行 call + state file 发现）
- [`096-devserver-event-stream-cancel`](./096-devserver-event-stream-cancel)（Done）— DevServer Event Stream + Cancel（event + `dev.cancel`）
- [`097-devserver-runchecks-diagnostics`](./097-devserver-runchecks-diagnostics)（Done）— DevServer RunChecks Diagnostics（`durationMs` + `diagnostics[]`）
- [`098-devserver-process-governance`](./098-devserver-process-governance)（Done）— DevServer Process Governance（status/stop/health/token/state）
- [`099-cli-host-adapters`](./099-cli-host-adapters)（Done）— CLI Host 抽象与 Browser Mock Runner（解锁浏览器依赖入口的导出/试跑）
- [`100-devserver-project-awareness`](./100-devserver-project-awareness)（Done）— DevServer Project Awareness（workspace snapshot / cliConfig discovery）
- [`101-devserver-safety-hardening`](./101-devserver-safety-hardening)（Done）— DevServer 安全硬化（readOnly/allowWrite/allowlist/capabilities）
- [`102-devserver-trace-bridge`](./102-devserver-trace-bridge)（Done）— DevServer Trace/Debug Bridge（trace slim / event stream）
- [`081-platform-grade-parser-mvp`](./081-platform-grade-parser-mvp)（Done）— Platform-Grade Parser（AnchorIndex@v1）
- [`082-platform-grade-rewriter-mvp`](./082-platform-grade-rewriter-mvp)（Done）— Platform-Grade Rewriter（PatchPlan@v1 / WriteBackResult@v1）
- [`079-platform-anchor-autofill`](./079-platform-anchor-autofill)（Done）— 保守 Autofill（只补缺失字段；report/write 幂等）
- [`073-logix-external-store-tick`](./073-logix-external-store-tick)（Draft）— ExternalStore + TickScheduler（跨外部源/跨模块强一致）
- [`068-watcher-pure-wins`](./068-watcher-pure-wins)（Draft）— watcher fan-out 纯赚性能地基
- [`076-logix-source-auto-trigger-kernel`](./076-logix-source-auto-trigger-kernel)（Draft）— source 自动触发内核（dirtyPaths + depsIndex）
- [`070-core-pure-perf-wins`](./070-core-pure-perf-wins)（Draft）— core 纯赚/近纯赚性能优化（默认零成本诊断）
- [`077-logix-control-laws-v1`](./077-logix-control-laws-v1)（Draft）— 控制律 v1（UI→React，Logic→Logix）

#### M3（语义与证据增强，可选）

- [`083-named-logic-slots`](./083-named-logic-slots)（Done）— 具名逻辑插槽（Manifest/门禁可枚举）
- [`084-loader-spy-dep-capture`](./084-loader-spy-dep-capture)（Done）— Loader Spy 依赖采集（证据≠权威；report-only）
- [`086-platform-visualization-lab`](./086-platform-visualization-lab)（Done）— Platform Visualization Lab（`examples/logix-react` `/platform-viz/*`）

### B) Kernel/Runtime 基建（Traits/Txn/Concurrency/Contracts）

- [`000-module-traits-runtime`](./000-module-traits-runtime)（Draft）— 统一 Module Traits（StateTrait）与 Runtime Middleware/EffectOp
- [`001-effectop-unify-boundaries`](./001-effectop-unify-boundaries)（Draft）— EffectOp 边界收口（移除局部加固入口）
- [`003-trait-txn-lifecycle`](./003-trait-txn-lifecycle)（Draft）— StateTrait 状态事务与生命周期分层
- [`006-optimize-traits`](./006-optimize-traits)（Draft）— Trait 运行时性能上限提升
- [`007-unify-trait-system`](./007-unify-trait-system)（Draft）— Trait 系统统一（形状 × 性能 × 可回放）
- [`008-hierarchical-injector`](./008-hierarchical-injector)（Draft）— 层级 Injector 语义统一（Nearest Wins + Root Provider）
- [`009-txn-patch-dirtyset`](./009-txn-patch-dirtyset)（Draft）— 事务 IR + Patch/Dirty-set 一等公民
- [`011-upgrade-lifecycle`](./011-upgrade-lifecycle)（Draft）— Lifecycle 全面升级
- [`012-program-api`](./012-program-api)（Draft）— Process（长效逻辑与跨模块协同收敛）
- [`013-auto-converge-planner`](./013-auto-converge-planner)（Draft）— Auto Converge Planner（及格线控制面）
- [`018-periodic-self-calibration`](./018-periodic-self-calibration)（Draft）— 定期自校准（默认值审计 + 运行时自校准）
- [`019-txn-perf-controls`](./019-txn-perf-controls)（Draft）— 事务性能控制（增量派生/合并/低优先级）
- [`020-runtime-internals-contracts`](./020-runtime-internals-contracts)（Draft）— 运行时内部契约化（Kernel/Services + TrialRun/Reflection）
- [`021-limit-unbounded-concurrency`](./021-limit-unbounded-concurrency)（Draft）— 并发护栏与预警（限制无上限并发）
- [`022-module`](./022-module)（Draft）— Module（定义对象）+ ModuleTag（身份锚点）
- [`023-logic-traits-setup`](./023-logic-traits-setup)（Draft）— Logic Traits in Setup
- [`024-root-runtime-runner`](./024-root-runtime-runner)（Draft）— Root Runtime Runner（根模块运行入口）
- [`025-ir-reflection-loader`](./025-ir-reflection-loader)（Done）— IR Reflection Loader（反射与试运行提取）
- [`031-trialrun-artifacts`](./031-trialrun-artifacts)（Done）— TrialRun Artifacts（试运行 IR 工件槽位）
- [`033-module-stage-blueprints`](./033-module-stage-blueprints)（Draft）— Module 舞台语义蓝图
- [`060-react-priority-scheduling`](./060-react-priority-scheduling)（Draft）— Txn Lanes（可解释优先级调度；统一证据）
- [`093-logix-kit-factory`](./093-logix-kit-factory)（Draft）— Kit Factory（语法糖机器）：用既有原语拼装可复用糖包，避免概念/边界重叠与双真相源

### C) 观测/证据/Devtools/Perf 跑道

- [`005-unify-observability-protocol`](./005-unify-observability-protocol)（Done）— 统一观测协议与聚合引擎（平台协议层优先）
- [`014-browser-perf-boundaries`](./014-browser-perf-boundaries)（Active）— 浏览器压测基线与性能边界地图
- [`017-perf-tuning-lab`](./017-perf-tuning-lab)（Active）— 调参实验场（消费 perf 跑道与控制面）
- [`015-devtools-converge-performance`](./015-devtools-converge-performance)（Draft）— Devtools 性能面板
- [`016-serializable-diagnostics-and-identity`](./016-serializable-diagnostics-and-identity)（Done）— 可序列化诊断与稳定身份
- [`038-devtools-session-ui`](./038-devtools-session-ui)（Draft）— Devtools Session-First 界面重设计
- [`044-trait-converge-diagnostics-sampling`](./044-trait-converge-diagnostics-sampling)（Planned）— Trait 诊断低成本采样（计时/统计）
- [`092-e2e-latency-trace`](./092-e2e-latency-trace)（Draft）— E2E Latency Trace（action→txn→notify→commit）

### D) 领域包与页面高频模式（Form/Query/i18n + 协调/乐观/资源）

- [`004-trait-bridge-form`](./004-trait-bridge-form)（Draft）— Trait 生命周期桥接 × Form
- [`010-form-api-perf-boundaries`](./010-form-api-perf-boundaries)（Draft）— Form API（设计收敛与性能边界）
- [`028-form-api-dx`](./028-form-api-dx)（Draft）— Form API 收敛与 DX 提升
- [`026-unify-query-domain`](./026-unify-query-domain)（Draft）— Query 收口到 `@logixjs/query`（与 Form 同形）
- [`074-readquery-create-selector`](./074-readquery-create-selector)（Draft）— ReadQuery.createSelector（显式 deps 的静态选择器）
- [`029-i18n-root-resolve`](./029-i18n-root-resolve)（Draft）— i18n 接入与 `Root.resolve` 语法糖
- [`087-async-coordination-roadmap`](./087-async-coordination-roadmap)（Draft）— Async Coordination Roadmap
- [`088-async-action-coordinator`](./088-async-action-coordinator)（Draft）— Async Action Coordinator（统一异步协调面）
- [`089-optimistic-protocol`](./089-optimistic-protocol)（Draft）— Optimistic Protocol（可回滚/可解释）
- [`090-suspense-resource-query`](./090-suspense-resource-query)（Draft）— Suspense Resource/Query（缓存/去重/预取/取消）
- [`091-busy-indicator-policy`](./091-busy-indicator-policy)（Draft）— Busy Indicator Policy（延迟显示/最短显示/防闪烁）
- [`072-logix-runes-dx`](./072-logix-runes-dx)（Draft）— Logix Runes（Svelte-like 赋值驱动状态语法糖）

### E) 平台/Workbench/Playground（协议、资产与教学跑道）

- [`032-ui-projection-contract`](./032-ui-projection-contract)（Draft）— UI Projection Contract（语义编排与 UI 投影解耦）
- [`034-code-asset-protocol`](./034-code-asset-protocol)（Done）— Code Asset Protocol（CodeAsset/Deps/Digest/Anchor）
- [`035-module-reference-space`](./035-module-reference-space)（Done）— Module Reference Space（模块引用空间事实源：PortSpec/TypeIr/PortAddress；CodeAsset/Deps/Anchor 协议见 034）
- [`036-workbench-contract-suite`](./036-workbench-contract-suite)（Done）— Workbench Contract Suite（031/034/035 统一验收与治理）
- [`040-schemaast-layered-upgrade`](./040-schemaast-layered-upgrade)（Done）— SchemaAST 分层能力升级（registry pack 已接入 trialrun artifacts）
- [`041-docs-inline-playground`](./041-docs-inline-playground)（Done）— 文档内联教学 Playground
- [`042-react-runtime-boot-dx`](./042-react-runtime-boot-dx)（Draft）— React 集成冷启动策略与 DX 优化
- [`058-sandbox-multi-kernel`](./058-sandbox-multi-kernel)（Draft）— Sandbox 多内核试跑与对照（core/core-ng）
- [`064-speckit-kanban-timeline`](./064-speckit-kanban-timeline)（Draft）— Specs Timeline Board（Kanban）
- [`067-action-surface-manifest`](./067-action-surface-manifest)（Done）— Action Surface 与 Manifest
- [`069-schema-first-codegen-action-surface`](./069-schema-first-codegen-action-surface)（Draft）— Schema-first 派生 Action Surface

### F) 示例应用（Galaxy）

- [`062-galaxy-api-postgres`](./062-galaxy-api-postgres)（Draft）— logix-galaxy-api（PostgreSQL 服务样例）
- [`063-galaxy-user-auth`](./063-galaxy-user-auth)（Draft）— logix-galaxy-api 登录与用户
- [`066-galaxy-project-rbac`](./066-galaxy-project-rbac)（Draft）— logix-galaxy 项目管理与 RBAC

### G) core-ng 线（收口/切换门禁 + 暂缓主题）

- [`047-core-ng-full-cutover-gate`](./047-core-ng-full-cutover-gate)（Draft）— core-ng 全套切换达标门槛（无 fallback）
- [`065-core-ng-id-first-txn-recording`](./065-core-ng-id-first-txn-recording)（Draft）— core-ng 整型化 Phase 2（事务/录制 id-first）
- [`053-core-ng-aot-artifacts`](./053-core-ng-aot-artifacts)（Frozen）— core-ng AOT Artifacts（Static IR / Exec IR 工件化）
- [`054-core-ng-wasm-planner`](./054-core-ng-wasm-planner)（Frozen）— core-ng Wasm Planner（可选极致路线）
- [`055-core-ng-flat-store-poc`](./055-core-ng-flat-store-poc)（Frozen）— core-ng Flat Store PoC（arena/SoA/handle 化）
