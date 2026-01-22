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
079 锚点声明与保守自动补全 → 081 受限解析（锚点索引） → 082 受限重写（最小补丁回写）
  → 083 具名逻辑插槽（结构/语义可见） → 078 Module↔Service Manifest（平台可诊断/可回放）
  → 080 Full-Duplex Prelude（统一最小 IR + 回写前置） → 086 可视化实验室 → 085 CLI 跑道
```

定位：让“生成/审查/回写”有单一真相源（统一最小 IR），并为 Alignment Lab/Devtools 提供可解释链路。

### 主线 D：页面高频 UX/协作模式（在 075/076 之上扩展）

```text
087 roadmap → 088 async 协调面 → 089 optimistic → 090 suspense/query → 091 busy policy
  + 092 e2e latency trace（贯穿观测链路）
```

定位：这些大多应该以 **policy/recipe（数据）** 形态存在，必要时降解到 075/076；避免变成“闭包 DSL”或引入并行时间线。

---

## 建议实施路线（把“怎么做”说得更可执行）

> 说明：这里给的是**排期/实施视角**的建议顺序（便于一个个落地闭环），不是语义裁决；语义口径仍以各 spec 目录内 `spec.md/plan.md` 为准。

### Phase 0：先把“命名与真相源”收敛（阻断文档漂移）

- 目标：平台/协议侧统一叫 `workflow`（Π），对外 DX 的 `FlowProgram` 收敛为 `Workflow`（不做兼容层，forward-only）。
- 主要 specs：`075`（命名裁决）、`073`（分层口径与 pr.md）
- 完成标志：`specs/073-logix-external-store-tick/pr.md` 的裁决点在 `specs/075-flow-program-codegen-ir/spec.md` 与对应 contracts/quickstart/tasks 中完成同步；平台 glossary/Workbench 术语不再混用。

### Phase 1：Runtime 地基闭环（tick 参考系 + 受限绑定）

- 目标：把“写侧证据（dirty-set）→ 事务内收敛（traits）→ 订阅增量（ReadQuery）→ no-tearing（tickSeq）”打通，并建立可复现的性能/诊断基线。
- 主要 specs：`073` → `068` → `076`（必要时并行 `016/027/014/017`）
- 完成标志：最小基线可复现（perf matrix + diff），且默认 `diagnostics=off` 不引入常态开销税；关键退化（dirtyAll/strictGate）都有 Slim 诊断与可回链锚点。

### Phase 2：出码/回写跑道闭环（从“可导出”到“可增量改写”）

- 目标：把 Root IR / workflow slice 做到可 cache / 可 diff / 可回写（Parser/Rewrite），并能落到可运行的最小工具链闭环。
- 主要 specs：`075` → `079` → `081` → `082`（按需穿插 `080/083/078`）
- 完成标志：同一仓库在不同环境导出一致 digest；Parser/Rewrite 能做“最小补丁”且有解释性 diff（无兼容层，改动以迁移说明替代）。

### Phase 3：平台工具链最小可用（CLI + Alignment Lab）

- 目标：让平台侧能够“读 IR → 跑对齐 → 出报告/回放”，不依赖手工读源码。
- 主要 specs：`086` + `085`（并行补 `084/092` 形成端到端证据链）
- 完成标志：CLI 可以一键跑通“导出 Root IR → trial run → 产出 RunResult/Trace/Tape（可选）”，并能被 CI/平台消费。

---

## 未完成 specs（按主题分组）

> 说明：分组是“实施/排期视角”，不是语义层级裁决；同一 spec 可能与多条主线相关，这里按最主要落点归类。

### A) 075 周边主线（出码 IR + 机制内核化 + 平台跑道）

- [`073-logix-external-store-tick`](./073-logix-external-store-tick)（Draft）— ExternalStore + TickScheduler（跨外部源/跨模块强一致）
- [`068-watcher-pure-wins`](./068-watcher-pure-wins)（Draft）— watcher fan-out 纯赚性能地基
- [`076-logix-source-auto-trigger-kernel`](./076-logix-source-auto-trigger-kernel)（Draft）— source 自动触发内核（dirtyPaths + depsIndex）
- [`070-core-pure-perf-wins`](./070-core-pure-perf-wins)（Draft）— core 纯赚/近纯赚性能优化（默认零成本诊断）
- [`075-flow-program-codegen-ir`](./075-flow-program-codegen-ir)（Draft）— FlowProgram Codegen IR（Canonical AST + Static IR）
- [`077-logix-control-laws-v1`](./077-logix-control-laws-v1)（Draft）— 控制律 v1（UI→React，Logic→Logix）
- [`078-module-service-manifest`](./078-module-service-manifest)（Draft）— Module↔Service 关系纳入 Manifest IR
- [`079-platform-anchor-autofill`](./079-platform-anchor-autofill)（Draft）— Platform-Grade 锚点声明与保守自动补全（单一真相源）
- [`080-full-duplex-prelude`](./080-full-duplex-prelude)（Draft）— Full-Duplex Prelude（统一最小 IR + 回写前置）
- [`081-platform-grade-parser-mvp`](./081-platform-grade-parser-mvp)（Draft）— Platform-Grade Parser MVP（受限子集解析器）
- [`082-platform-grade-rewriter-mvp`](./082-platform-grade-rewriter-mvp)（Draft）— Platform-Grade Rewriter MVP（受限子集重写器）
- [`083-named-logic-slots`](./083-named-logic-slots)（Draft）— 具名逻辑插槽（结构可见→语义可见）
- [`084-loader-spy-dep-capture`](./084-loader-spy-dep-capture)（Draft）— Loader Spy 依赖采集（加载态自描述证据）
- [`085-logix-cli-node-only`](./085-logix-cli-node-only)（Draft）— Node-only CLI 跑道（集成验证）
- [`086-platform-visualization-lab`](./086-platform-visualization-lab)（Draft）— 可视化实验室（IR / Evidence / Gate）

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
- [`025-ir-reflection-loader`](./025-ir-reflection-loader)（Draft）— IR Reflection Loader（反射与试运行提取）
- [`031-trialrun-artifacts`](./031-trialrun-artifacts)（Draft）— TrialRun Artifacts（试运行 IR 工件槽位）
- [`033-module-stage-blueprints`](./033-module-stage-blueprints)（Draft）— Module 舞台语义蓝图
- [`060-react-priority-scheduling`](./060-react-priority-scheduling)（Draft）— Txn Lanes（可解释优先级调度；统一证据）

### C) 观测/证据/Devtools/Perf 跑道

- [`005-unify-observability-protocol`](./005-unify-observability-protocol)（Draft）— 统一观测协议与聚合引擎（平台协议层优先）
- [`014-browser-perf-boundaries`](./014-browser-perf-boundaries)（Active）— 浏览器压测基线与性能边界地图
- [`017-perf-tuning-lab`](./017-perf-tuning-lab)（Active）— 调参实验场（消费 perf 跑道与控制面）
- [`015-devtools-converge-performance`](./015-devtools-converge-performance)（Draft）— Devtools 性能面板
- [`016-serializable-diagnostics-and-identity`](./016-serializable-diagnostics-and-identity)（Draft）— 可序列化诊断与稳定身份
- [`027-runtime-observability-hardening`](./027-runtime-observability-hardening)（Draft）— 运行时可观测性加固（链路贯穿 + 聚合器性能/内存）
- [`038-devtools-session-ui`](./038-devtools-session-ui)（Draft）— Devtools Session-First 界面重设计
- [`044-trait-converge-diagnostics-sampling`](./044-trait-converge-diagnostics-sampling)（Planned）— Trait 诊断低成本采样（计时/统计）
- [`092-e2e-latency-trace`](./092-e2e-latency-trace)（Draft）— E2E Latency Trace（action→txn→notify→commit）

### D) 领域包与页面高频模式（Form/Query/Router/i18n + 协调/乐观/资源）

- [`004-trait-bridge-form`](./004-trait-bridge-form)（Draft）— Trait 生命周期桥接 × Form
- [`010-form-api-perf-boundaries`](./010-form-api-perf-boundaries)（Draft）— Form API（设计收敛与性能边界）
- [`028-form-api-dx`](./028-form-api-dx)（Draft）— Form API 收敛与 DX 提升
- [`026-unify-query-domain`](./026-unify-query-domain)（Draft）— Query 收口到 `@logixjs/query`（与 Form 同形）
- [`074-readquery-create-selector`](./074-readquery-create-selector)（Draft）— ReadQuery.createSelector（显式 deps 的静态选择器）
- [`071-logix-router-bridge`](./071-logix-router-bridge)（Draft）— Router Bridge（可注入 Router）
- [`029-i18n-root-resolve`](./029-i18n-root-resolve)（Draft）— i18n 接入与 `Root.resolve` 语法糖
- [`087-async-coordination-roadmap`](./087-async-coordination-roadmap)（Draft）— Async Coordination Roadmap
- [`088-async-action-coordinator`](./088-async-action-coordinator)（Draft）— Async Action Coordinator（统一异步协调面）
- [`089-optimistic-protocol`](./089-optimistic-protocol)（Draft）— Optimistic Protocol（可回滚/可解释）
- [`090-suspense-resource-query`](./090-suspense-resource-query)（Draft）— Suspense Resource/Query（缓存/去重/预取/取消）
- [`091-busy-indicator-policy`](./091-busy-indicator-policy)（Draft）— Busy Indicator Policy（延迟显示/最短显示/防闪烁）
- [`072-logix-runes-dx`](./072-logix-runes-dx)（Draft）— Logix Runes（Svelte-like 赋值驱动状态语法糖）

### E) 平台/Workbench/Playground（协议、资产与教学跑道）

- [`032-ui-projection-contract`](./032-ui-projection-contract)（Draft）— UI Projection Contract（语义编排与 UI 投影解耦）
- [`034-expression-asset-protocol`](./034-expression-asset-protocol)（Draft）— Expression Asset Protocol（表达式/校验资产协议与 Sandbox 约束）
- [`035-module-ports-typeir`](./035-module-ports-typeir)（Draft）— Module Ports & TypeIR（端口/类型 IR 作为平台 SSoT）
- [`036-workbench-contract-suite`](./036-workbench-contract-suite)（Draft）— Workbench Contract Suite（031-035 统一验收与治理）
- [`040-schemaast-layered-upgrade`](./040-schemaast-layered-upgrade)（Draft）— SchemaAST 分层能力升级
- [`041-docs-inline-playground`](./041-docs-inline-playground)（Draft）— 文档内联教学 Playground
- [`042-react-runtime-boot-dx`](./042-react-runtime-boot-dx)（Draft）— React 集成冷启动策略与 DX 优化
- [`058-sandbox-multi-kernel`](./058-sandbox-multi-kernel)（Draft）— Sandbox 多内核试跑与对照（core/core-ng）
- [`064-speckit-kanban-timeline`](./064-speckit-kanban-timeline)（Draft）— Specs Timeline Board（Kanban）
- [`067-action-surface-manifest`](./067-action-surface-manifest)（Draft）— Action Surface 与 Manifest
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
