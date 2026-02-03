# 平台视角评审：全双工锚点引擎（Code↔IR↔Runtime）与 Alignment Lab

本报告以“未来平台落地”为主视角，用 **全双工（Full-Duplex）** 作为支点，对当前 Logix 运行时体系进行评审，重点回答：

- 平台要实现 Code↔Graph↔Runtime 的闭环，Logix 需要提供哪些“不可妥协的契约”？现状满足到什么程度？
- 目前“规范 / 实现 / 脚本 / 示例”在哪些关键锚点上发生漂移，导致平台化会卡死？
- 在“拒绝向后兼容、追求极致性能与可诊断性”的前提下，平台优先的 **不兼容收敛** 应该怎么做、先做什么？

> 关联阅读：
>
> - 事务/trait：`03-transactions-and-traits.md`
> - 诊断/Devtools：`04-diagnostics-and-devtools.md`
> - React/Sandbox：`05-react-and-sandbox-integration.md`
> - 路线图：`99-roadmap-and-breaking-changes.md`

---

## 0. 一句话结论

Logix 已经具备平台化所需的两块“硬地基”：

1. **StateTraitGraph/Plan** 是极其平台友好的结构化 IR（显式 deps + 可构图 + 可增量优化）；
2. `$` Fluent DSL 已经足够接近“可解析子集”（单语句链式调用 + 统一入口）。

但目前平台化会被以下“硬阻塞”卡住：

- **全双工锚点在 specs 与脚本中严重漂移**：`then/when` 旧约束仍占据多个规范与实现备忘；而真实实现已经收敛为 `.run/.update/.mutate` 终端。
- **Parser/Codegen 的“可执行实现”缺位**：早期解析脚本 `scripts/intent-fluent-parser.ts`（已删除）解析的是不存在的 DSL（`.when(...).then(...)`），当前仍缺少以 Platform-Grade 子集为锚点的可执行 Parser/Codegen。
- **IntentRule IR 只存在于文档，不存在于代码的最小中间表示**：StateTraitGraph 已经落地，但“规则 IR（IntentRule）/逻辑图（LogicGraph）”尚未形成统一的、可序列化、可合并的 IR。
- **诊断协议未以 IR 为中心闭环**：缺少稳定 ruleId/stepId 的端到端锚定，且 Sandbox/Devtools 的 trace 仍有“塞入事件对象/闭包”的倾向，难以支撑平台端的因果与性能分析。

---

## 1. 平台的“全双工契约”（对 Logix 的硬要求）

平台以“Code is Truth，但 Studio 是第一入口”为前提，Full-Duplex 至少包含三条链路：

1. **Code → IR（逆向解析）**：从 TypeScript 源码稳定提取结构化 IR，用于 Universe/Galaxy/Studio 展示与治理；
2. **IR → Code（正向回写）**：对 IR 的编辑必须能被精确翻译成最小 AST Patch，写回源码且保持风格稳定；
3. **Runtime → IR/Studio（运行时观测）**：运行时事件必须能锚定到 IR 节点（稳定 id），支持时间线与因果图。

对 Logix 的硬要求可归纳为四类“不变量”：

### 1.1 可解析性（Parsability）

- **Platform-Grade 子集必须唯一且明确**：哪些代码形态是白盒可解析、哪些是 Gray/Black Box 直接降级；不能出现两套“都声称是白盒”的写法。
- **锚点要稳定、可被 AST Pattern 匹配**：例如 `Module.make(...)`、`Module.logic(($)=>...)`、`yield* $.use(...)`、`yield* $.onState(...).run*(...)`。

### 1.2 可回写性（Patchability）

- 平台只允许对“白盒子集”做 **局部、确定性** 的 AST Patch（改参数、改并发策略、增删规则节点等）；
- 写回必须具备冲突检测与可合并策略（例如同一路径重复定义、覆盖优先级、单写者规则）。

### 1.3 可观测性（Observability as Contract）

对每次派生/刷新/丢弃，运行期至少要提供：

- 稳定标识：`runtimeInstanceId / txnId / ruleId / stepId`（最小集合，且可拼接出全局唯一 id）；
- 触发原因：来自哪个 Source（state/action/stream）、哪个上游节点；
- 输入快照：至少是可序列化的“输入摘要”（避免携带闭包/Effect 本体）；
- 状态变更记录：字段级 patch / dirty-set；
- 依赖收敛范围：受影响节点集合（或可推导的 closure 线索）。

### 1.4 可降解性（Full Degradation）

- 所有高层抽象必须 **完全降解** 到统一的最小 IR（并在 IR 层完成冲突检测与合并）；
- Gray/Black Box 的降级必须保留最小可诊断信息（所属 module/logic、loc、粗粒度 source/sink 摘要），避免“看不见”。

---

## 2. 现状：哪些已经对齐平台诉求（强项）

### 2.1 `Module.make` + Schema 作为平台元数据源（强）

- `Module.make(id, { state, actions, reducers })` 天然提供平台最需要的“可投影元信息”（Schema 形状与 actionMap）。
- `Module.make({ traits })` 已经实装：会 `StateTrait.build(...)` 并在 `implement(...)` 自动注入安装逻辑（与注释“未消费”存在漂移，详见 `06-evidence-map.md`）。
  - 这条路径与平台的“可解析 + 可回写”契合度非常高：`traits` 是对象字面量/结构化 DSL，天然适合 AST patch。

证据入口：`packages/logix-core/src/Module.ts`、`packages/logix-core/src/StateTrait.ts`。

### 2.2 `StateTraitGraph/Plan`：最接近“平台共享 IR”的内核（强）

StateTrait 具备三类平台关键特性：

- **显式 deps 是唯一依赖事实源**：天然支持增量调度、反向闭包、冲突检测与可视化诊断；
- **Program/Graph/Plan 的结构化产物**：可以直接作为 Studio 的图模型（节点/边/资源）；
- **运行期对 deps 进行一致性校验**（read-trace vs declared deps），为“智能化优化性能”提供证据闭环。

证据入口：`packages/logix-core/src/internal/state-trait/*`。

> 这也是“trait + 事务体系可以做到极致优化”的关键前提：
> 平台与运行时共享同一套结构化依赖事实（deps），运行时只需围绕 dirty-set 与 closure 做 O(改动量) 的调度（详见 `03-transactions-and-traits.md`）。

### 2.3 `$` Fluent DSL 已经具备可解析子集的现实形态（中强）

真实实现（类型与运行时）已经形成一条更易解析的主链路：

- 触发源拆分：`$.onState / $.onAction / $.on(stream)`（避免 Parser 通过参数形态推断）；
- 管道算子：`.debounce/.throttle/.filter/.map`；
- 终端 sink：`.run/.runLatest/.runExhaust/.runParallel/.update/.mutate/.run*Task`。

证据入口：
`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`、`packages/logix-core/src/internal/runtime/core/LogicMiddleware.ts`。

### 2.4 Devtools 有“图 + 时间线”的雏形（中强）

`@logixjs/devtools-react` 已经把 `StateTraitGraph` 拉进 UI，具备平台“线路点亮”的雏形；核心缺口是事件协议仍未 IR-first（详见下文）。

证据入口：`packages/logix-devtools-react/src/ui/graph/StateTraitGraphView.tsx`、`packages/logix-core/src/Debug.ts`。

### 2.5 Sandbox 已经具备 Alignment Lab 的骨架（弱-中）

`@logixjs/sandbox` 已经具备：

- Worker 编译/运行闭环、`LOG/TRACE/UI_INTENT/COMPLETE` 事件上报；
- `globalThis.logixSandboxBridge.emitUiIntent` / `globalThis.logixSandboxBridge.emitSpy` 这两个“未来双工协议”的桥接钩子。

但协议与能力离 specs/drafts 的 Alignment Lab 目标还有明显差距（详见第 4 节）。

证据入口：`packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`、`docs/ssot/runtime/logix-sandbox/*`（协议/基线），以及 `docs/specs/drafts/topics/sandbox-runtime/*`（愿景/扩展）。

---

## 3. 关键漂移与阻塞点（平台化会卡死的地方）

### 3.1 “平台白盒子集”的锚点形态在文档内严重不一致

同一件事（Fluent 规则白盒解析）在仓库内至少出现了两套互斥的锚点约束：

- 约束 A（旧）：`...then(...)` / `.when(...)`
  - `docs/ssot/platform/ir/00-codegen-and-parser.md`
  - `docs/specs/sdd-platform/impl/README.md`
  - `scripts/intent-fluent-parser.ts`（已删除）
- 约束 B（现行实现）：`...update/mutate/run*(...)`
  - `docs/ssot/runtime/logix-core/api/03-logic-and-flow.md`（Hard Constraints 明确写 `.update/mutate/run*`）
  - `packages/logix-core` 真实类型与实现（IntentBuilder 不存在 `.then`）

后果：平台 Parser/Codegen 无法“同时满足两套约束”，必然出现：

- 平台/文档宣称可解析，但实际无法解析（破坏信任）；
- 团队内出现两派写法（破坏协作），并最终导致可视化与治理能力不可用。

### 3.2 Parser/Codegen 的“可执行实现”缺失且过时

仓库目前没有可执行的 Fluent Parser；此前的 PoC 脚本（已删除）为：

- `scripts/intent-fluent-parser.ts`（已删除）：只识别 `.then(...)`，并且以 `.when(...)` 作为链路根节点。

但真实 API 不存在 `when/then`，导致该脚本在平台主链路上不可用；同时代码里也没有任何可复用的 `IntentRule`/LogicGraph IR 实现。

结论：平台化在“Code→IR”第一步就会断。

### 3.3 IR 体系碎片化：`IntentRule`（文档） vs `StateTraitGraph`（实现）

当前出现了两个“各自合理，但没有统一”的 IR：

- `IntentRule`：平台文档中的统一规则 IR（R-S-T），但目前只存在于 docs/specs；
- `StateTraitGraph/Plan`：运行时真实存在、可构图、可增量优化的 IR。

平台需要的不是“两个并列 IR”，而是：

- 一个统一的 **最小中间表示（Minimal IR）**：能承载规则 + traits，并支持冲突检测/合并；
- 对外暴露可序列化/可比较/可回放的结构（LLM 时代必须 IR-first）。

> 若继续让 IntentRule 停留在文档层，而 StateTraitGraph 停留在 devtools 层，平台会被迫维护两套图模型与两套事件锚点，复杂度不可控。

### 3.4 公开 API 内仍存在“破坏可解析性”的歧义点

最典型的是 `IntentBuilder.andThen`：

- 运行时根据 `handler.length` 自动分派到 `.update` 或 `.run`；
- 这对平台静态分析而言是“不可判定/不可解释”的（AST 级别无法稳定推断语义）。

目前 `docs/ssot/runtime/logix-core/api/03-logic-and-flow.md` 已经把 `andThen` 定位为非白盒子集（Gray/Black Box），但它仍然属于 `IntentBuilder` 的公开接口：一旦业务使用，就会把平台的全双工能力打回黑盒。

结论：如果全双工是平台硬目标，**公开 API 必须强制无歧义**（要么移除，要么明确隔离到工具链/生成器接口）。

#### 补充：用“全双工硬契约”拷打 `andThen`（结论：必须从公共 API 删除）

`andThen` 参考了 Effect 的命名习惯，但它在 Logix DSL 层承载了“同名多语义”的职责（`update` vs `run`），并且当前实现还存在“运行时猜测语义”的行为（按 `handler.length` 分派）。这与平台全双工的三条硬契约直接冲突：

- **Parsability（可解析）冲突**：平台无法从 AST 稳定判定 `andThen` 的语义归属（写 state 还是跑 effect），也就无法映射到唯一的 IR 节点；默认参数/rest 参数/柯里化/闭包重构都可能改变 `length`，导致“同一段代码语义漂移”。
- **Patchability（可回写）冲突**：Graph→Code 的 AST Patch 需要“一个节点 → 一种稳定写法”。`andThen` 的重载使得平台无法做安全的参数级变更（例如把并发策略从 run→runLatest），因为它不知道该改写成 `.update/.mutate` 还是 `.run*`。
- **Observability（可观测）冲突**：运行期需要把每次触发锚定到 `ruleId/stepId` 并区分“事务内纯更新”与“事务外 IO/Task”。`andThen` 让这条边界变得不可解释：同一个 API 名字既可能走事务，也可能触发 effect/IO（甚至被误用把 IO 塞进事务窗口）。

因此，平台视角的最强判决是：

- **`andThen` 不允许出现在 Platform-Grade 子集里**；
- 并且在“拒绝向后兼容”的演进目标下，**应直接从 `IntentBuilder` 公共接口移除**（而不是保留为别名）。

替代写法（保持语义单一）：

- 纯状态更新：显式使用 `.update` / `.mutate`；
- 副作用/IO：显式使用 `.run/.runLatest/.runExhaust/.runParallel`（或未来收敛后的唯一 effect-run 入口）；
- 想要 “Effect.andThen 的链式风格”：放到 `.run(...)` 的 handler 内部用 `Effect.andThen/flatMap` 完成，而不是让 DSL 层承担“猜语义”的职责。

平台治理建议：

- Dev Server / lint：在可解析子集里出现 `.andThen` 直接报错，并给出自动修复（提示开发者选择 `.update/.mutate` 或 `.run*`）。

### 3.5 诊断协议尚未 IR-first：缺少“节点级锚定”的端到端闭环

平台需要把 Runtime 事件映射到：

- `IntentRule` 节点（规则级）
- `StateTraitPlanStep` 节点（派生/资源级）

当前 trait 侧已经具备 stepId（如 `source:${fieldPath}`），并且 patch 记录也支持 stepId/traitNodeId；但 watcher/flow 侧仍缺少统一的“ruleId”概念，且 sandbox trace 仍会把 event 对象整体塞进 attributes（不可控/不可序列化/可能保留闭包）。

建议方向详见 `04-diagnostics-and-devtools.md`：必须推进 “Stable Identity + SlimOp + IR-first”。

### 3.6 Sandbox 协议与 Alignment Lab 目标明显脱节

对比：

- 规范 SSoT：`docs/ssot/runtime/logix-sandbox/15-protocol-and-schema.md`
- 当前实现：`packages/logix-sandbox/src/Protocol.ts` + `packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`

关键差异（面向 Alignment Lab，仍阻塞平台化的部分）：

- RUN：
  - `actions` 仍是 PoC：Host 传入的脚本化 actions 尚未形成稳定的“可回放 runner”口径（需要与 `ruleId/stepId` 等锚点对齐）。
- UI_CALLBACK：
  - 协议已有字段，但当前实现仍偏“记录 + ACK”，尚未形成“回注入用户程序”的全双工 UI 形态（Semantic UI Mock 需要这一闭环）。
- Trace/UI_INTENT：
  - 事件仍缺少与 `scenarioRevisionId/ruleId/stepId` 的稳定锚定口径（需要在 payload/meta 中固化并保持 Slim/可序列化）。

结论：现有 Sandbox 更像“runner + 事件采集”，尚不足以承载平台的 Alignment Lab（可回放、可覆盖、可对齐）。

---

## 4. 平台优先的不兼容收敛建议（追求完美，不考虑向后兼容）

### 4.1 先收敛“唯一 Platform-Grade 子集”（立即做）

必须二选一，彻底消灭漂移：

- **建议选择现实实现路线作为唯一白盒锚点**：
  `yield* $.onState/$.onAction/$.on(...).update/mutate/run*(...)`
  理由：
  - 与 `@logixjs/core` 的真实类型与实现一致；
  - 与 `docs/ssot/runtime/logix-core/api/03-logic-and-flow.md` 的 Hard Constraints 一致；
  - 终端算子 `.run* / .update / .mutate` 语义更显式（比 `.then` 更利于诊断与平台推断）。

随之必须执行的“不兼容清理”：

- 更新/重写 `docs/ssot/platform/ir/00-codegen-and-parser.md` 与 `docs/specs/sdd-platform/impl/README.md`：移除 `when/then` 约束，统一为 `.run*/update/mutate`；
- 删除或重写 `scripts/intent-fluent-parser.ts`：以 `.onState/.onAction/.on + 终端 run*` 为解析锚点；
- 清理 examples 中仍保留的 `then/when` 注释与旧 IR 示例，避免误导团队协作。

### 4.2 移除 `andThen`（或隔离为“生成器专用 API”）（立即做）

平台全双工要“可靠且可解释”，必须禁止“按参数个数自动分派”的 API：

- 方案 A（更推荐）：从 `IntentBuilder` 公共接口中移除 `andThen`；
- 方案 B（次选）：保留但隔离到 `$.unsafe`/`InternalIntentBuilder`，并通过 lint/ts rule 在 Platform-Grade 子集中硬报错。

### 4.3 将 `StateTraitGraph` 升级为平台共享 IR 的第一公民（Phase 0/1）

现状已经证明：traits 体系在“可解析 + 可回写 + 可优化”三方面都更接近平台终局形态。

建议：

- 平台将 `Module.make({ traits })` 作为 “可视化/可编辑/可治理” 的第一入口；
- 将 `StateTraitProgram/Graph/Plan` 作为 Studio 的核心结构（至少覆盖字段派生/资源/校验这类高价值场景）；
- watcher Fluent 规则（IntentRule）作为第二条入口，重点承载“事件/交互驱动”的规则，且必须具备 ruleId/stepId 的锚定（见下一条）。

### 4.4 统一最小 IR：`IntentRule` 与 `StateTraitGraph` 不能并列（Phase 1）

建议引入一个最小、可序列化、可合并的 **Logix IR**，满足：

- 规则与 traits 都能降解为同一套 Node/Edge 模型；
- 每个 Node 都有：
  - `id`（稳定）
  - `kind`（rule/trait/source/task/...)
  - `loc`（用于 AST patch）
  - `meta`（可序列化）
- 冲突检测/合并发生在 IR 层（例如重复写路径、资源 id 复用、覆盖优先级）。

这会直接降低平台实现复杂度：Universe/Galaxy/Devtools 不再维护两套并行模型。

### 4.5 运行期事件必须锚定 IR（Phase 1）

为支撑“全双工数字孪生”，运行时事件必须满足：

- 每次 txn/派生/刷新都带：`runtimeInstanceId + txnId + nodeId(ruleId/stepId)`；
- 事件 payload 必须 Slim（不携带 Effect/闭包/大对象），只携带可序列化摘要与引用；
- 支持按依赖图收敛监听范围（只推送受影响节点），避免平台侧做全量扫描。

### 4.6 Sandbox 必须按 Alignment Lab 目标重构（Phase 1）

Sandbox 在平台体系中不是“代码 runner”，而是 **Executable Spec / Alignment Lab 的运行时底座**。因此它必须升级为“可对齐、可回放、可覆盖”的执行环境，最少需要做到：

- **协议对齐到 runtime SSoT**：以 `docs/ssot/runtime/logix-sandbox/15-protocol-and-schema.md` 为准，至少补齐：
  - INIT：从 `kernelUrl` 升级到 `kernelBlobUrls`（多 kernel/多版本/多运行时漏斗）；
  - RUN：补齐 `env` 与 `intentId`（覆盖率与对齐报告的锚点）；
  - TERMINATE：必须能取消正在运行的 Effect/Fiber（而不是仅清空 runId）；
  - UI_CALLBACK：必须能回注入用户程序（双工 UI），而不是仅记录日志。
- **RUN.actions 必须可消费**：Host 注入 actions 作为“可脚本化回放”的入口（Scenario Runner），并且每个 action 都要能在 Trace/AlignmentReport 中被识别。
- **事件模型 IR-first**：TRACE/LOG/UI_INTENT 不应“各自为政”，必须能映射到统一的 IR nodeId（ruleId/stepId/traitNodeId），并保证 payload 可序列化（Slim）。
- **避免远程运行时依赖**：Worker 内部目前会 `import("https://esm.sh/effect@...")`，这会引入版本漂移与不可控网络依赖；Alignment Lab 的底座应完全由 kernel 提供 effect/logix 运行时。
- **输出对齐报告的必要材料**：至少需要能产出
  - `stateSnapshot`（或可配置的 state 选择器快照）、字段级 patch（或 dirtyPaths）、以及与 `intentId/storyId/stepId` 对齐的 Trace 索引；
  - 并具备 ring buffer/裁剪策略，避免观测导致负优化。

证据入口：`packages/logix-sandbox/src/Protocol.ts`、`packages/logix-sandbox/src/Client.ts`、`packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`。

### 4.7 Dev Server（logix dev）需要被当作“平台落地的第一等公民”（Phase 1）

文档里已经把 Dev Server 的三职责说得非常清楚：

1. 项目感知（Universe 索引）
2. Code↔IR 双向桥接（Parser/Codegen + AST Patch）
3. Runtime 事件中继（Digital Twin）

但代码侧目前只有一个过时的解析脚本，没有可复用的 Builder/Parser 包，也没有“IR 的最小实现”。因此建议把平台能力拆成两块可交付的基础设施：

- `@logixjs/builder`（或同等定位的包）：只做 “Code↔IR↔Patch” 的纯库能力（可被 CLI/DevServer/CI 复用）；
- `logix dev`（Dev Server）：只做文件监听、缓存、增量推送、鉴权与协议封装（HTTP/WS/LSP）。

并且必须在 Phase 1 就落下两类硬门槛：

- **可解析子集违规的诊断**：当代码超出 Platform-Grade 子集，应能给出 loc + 原因 + 自动修复建议（codemod/Agent 降级）。
- **回写边界的硬限制**：首期只允许修改“安全参数”（debounce/throttle 时间、run→runLatest 这种同构切换、deps 列表等），避免 AST Patch 演化成不可控的“代码生成器”。

参考入口：`docs/specs/sdd-platform/workbench/06-dev-server-and-digital-twin.md`、`docs/specs/sdd-platform/impl/README.md`（需先修正其中的 then/when 漂移）。

---

## 5. 最短落地顺序（平台先跑通闭环）

以“先跑通最小全双工闭环”为原则，建议用三步落地（均允许 breaking）：

### Step 1：收敛锚点（阻断漂移）

- 统一 Platform-Grade 子集的唯一写法（建议以 `.run*/update/mutate` 为终端锚点）；
- 移除 `andThen` 或隔离为内部 API；
- 修订关键 specs（`docs/ssot/platform/ir/00-codegen-and-parser.md`、`docs/specs/sdd-platform/impl/README.md` 等）与示例注释，保证“写法/规范/解析器”三者一致。

### Step 2：落地最小 IR 与 Parser（可用即可）

- 定义一个最小 IR（Node/Edge + stable id + loc + meta），把 `StateTraitGraph` 与 watcher rules 都映射进去；
- 重写 Parser 脚本/实现为可复用库（优先覆盖 `.onState/.onAction/.on + pipeline + run*`）；
- 先只做 Code→IR（只读 Universe/Explorer），跑通工具链与 round-trip 验证的最小用例。

### Step 3：把 Runtime 与 Sandbox 接到 IR 上（形成数字孪生）

- 运行时事件升级为 SlimOp，能够锚定 IR nodeId；
- Sandbox 协议对齐草案并补齐 terminate/actions/ui callback；
- Host 侧产出最小 AlignmentReport（哪怕只包含 “触发过哪些 nodeId/stepId” 与 “哪些 step 未覆盖”）。

---

## 6. 这份评审对路线图的影响

建议将以下事项提升为 `Phase 0/Phase 1` 的硬门槛（对应 `99-roadmap-and-breaking-changes.md` 的更新）：

- 全双工锚点写法的唯一收敛（并消灭 then/when 漂移与过时代码）
- “统一最小 IR”落地（IntentRule 与 StateTraitGraph 不再并列）
- Sandbox 以 Alignment Lab 为目标的协议化升级（TERMINATE/UI_CALLBACK/actions/intentId/env/kernelBlobUrls）
