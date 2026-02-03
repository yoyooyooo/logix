# Spec Registry: 080 Full-Duplex Prelude（成员与里程碑门槛）

关系 SSoT：`specs/080-full-duplex-prelude/spec-registry.json`（机器可读）。  
本文件用于“人读阐述”：解释每个成员 spec 的定位、Hard/Spike 风险标记，以及组内里程碑与退出条件。

## Members（按依赖顺序）

### 005 · 统一观测协议与聚合引擎（平台协议层优先）

- 定位：跨宿主证据传输与 EvidencePackage 的协议硬门（JSON-safe/版本化/预算/降级）。
- 关键门槛：导出/导入一致消费；顺序锚点（runId+seq）；不可序列化/超大 payload 的可解释降级。

### 016 · 可序列化诊断与稳定身份

- 定位：全链路稳定锚点与 JSON-hard-gate（避免证据包/IR 因不可序列化而崩）。
- 关键门槛：instanceId 单锚点；事件 Slim/可序列化；去随机化。

### 025 · IR Reflection Loader（Manifest + TrialRun）

- 定位：不读 AST 的结构提取与受控试跑（Manifest/EnvironmentIR/TrialRunReport）。
- 关键门槛：缺失依赖 hard-fail 且可解释；输出确定性；试跑窗口与资源收束可控。

### 031 · TrialRun Artifacts

- 定位：为各 kit 的补充 Static IR 提供统一 artifacts 槽位（OCP）。
- 关键门槛：key 版本化；预算/截断；单项失败不阻塞其它项（但必须可解释）。

### 035 · Module Ports & TypeIR

- 定位：平台引用空间事实源（端口/可引用路径/类型投影），支撑补全与引用安全。
- 关键门槛：确定性与预算；与 Manifest/StaticIR 同源对照；可 diff。

### 040 · SchemaAST 分层升级

- 定位：解释/校验底座（schemaId/registry），为诊断/回放/协议提供结构支撑。
- 关键门槛：schemaId 稳定；registry 可导出/导入；不引入热路径成本。

### 067 · Action Surface Manifest

- 定位：Action 定义锚点与可序列化 Manifest，支撑 Runtime→Studio 的事件对齐。
- 关键门槛：事件→定义锚点命中率 100%；未知 action 明确标记；确定性输出。

### 078 · Module↔Service Manifest（servicePorts）

- 定位：模块输入服务依赖（port→serviceId）纳入 Manifest，支撑试跑/诊断/回放对齐。
- 关键门槛：`servicePorts` 进入 digest/diff；缺失/冲突能定位到 `moduleId+port+serviceId`。

### 075 · Workflow/Π Surface（WorkflowDef → Workflow Static IR）

- 定位：把 `Π` 收敛为 `WorkflowDef`（权威输入）与 `workflowSurface`（Π slice，可导出/可对齐），并固化 workflow 的稳定锚点（`programId/stepKey/nodeId`）。
- 关键门槛：缺失 `stepKey` 视为契约违规（fail-fast）；workflow 调用的 `serviceId` 必须能回链到 `servicePorts`；时间算子无影子时间线（tick 对齐）。

### 061 · Playground Editor Intellisense（可选增强）

- 定位：提供编辑器侧 TypeScript/类型支撑，辅助平台开发与验证。
- 备注：属于“生产力增强”，不是 IR/锚点闭环的硬前置。

### 086 · Platform Visualization Lab（可选 · 消费者回归面 / 解释粒度试验场）

- 定位：在平台落地前，用 `examples/logix-react` 的独立路由组 `/platform-viz/*` 把 Manifest/Diff/TrialRun 等 IR+证据做成可玩的“单项能力块”，用于验证信息架构与解释粒度，并作为 IR 变更的 UI 回归面。
- 关键门槛：不引入 Node-only 依赖到浏览器 bundle；缺失可选字段（如 `servicePorts`）必须显式提示；展示稳定可复现。

### 081 · Platform-Grade Parser MVP（Hard）

- 定位：对 Platform-Grade 子集建立可解析 AST/AnchorIndex（定位与结构识别）。
- Hard 原因：受限子集边界划分、兼容真实代码形态、错误/降级语义与可解释性。

### 082 · Platform-Grade Rewriter MVP（Hard）

- 定位：在最小差异/可解释失败前提下，将“补全结果”安全写回源码。
- Hard 原因：冲突处理、格式/注释保留、最小 diff、避免 silent corruption。

### 079 · 保守自动补全锚点声明（单一真相源）

- 定位：只补“未声明且可确定”的锚点缺口并写回源码；默认 `port=serviceId`；宁可漏不乱补。
- 依赖：落地实现上依赖 Parser/Rewriter；语义别名由作者手写。

### 085 · Logix CLI（Node-only 基础能力入口）

- 定位：在平台产品落地前，提供统一命令入口串联 IR 导出/试跑/索引/回写；同时作为 Node-only 能力的集成测试跑道；并提供 Contract Suite 的 Node 入口（036）：`logix contract-suite run` 作为统一 gate。
- 关键门槛：输出确定性、可序列化、可 diff；report-only/write-back 双模式；失败/跳过/降级必须可解释（reason codes）。

### 083 · Named Logic Slots（Medium→Hard）

- 定位：从“结构可见”迈向“语义可见”的第一步：模块逻辑插槽语义化，支撑替换/组装。
- 风险：容易与业务语义耦合；需要严格限定“插槽语义”的表达与治理边界（避免平台过度推断）。
- 依赖口径：runtime 侧只负责 slots/slotName 元数据 + 校验 + Manifest 反射；任何写回都必须依赖 `081/082` 的 Platform-Grade Parser/Rewriter（子集外降级为 Raw Mode）。
- 最小门槛：`slotName`/`slots` key 符合命名规范、required/unique/aspect 校验可门禁；`extractManifest` 导出 `slots/slotFills` 且确定性可 diff。

### 084 · Loader Spy 依赖采集（Hard/Spike）

- 定位：在加载态/构造态注入 Spy 捕获 `$.use(Tag)` 使用证据，用于建议/校验（不作权威）。
- Hard 原因：覆盖不完备、受分支影响、副作用治理/收束、确定性与可复现压力大。

## 里程碑（组内签收口径）

> 本节只定义“组内门槛”，不替代成员 spec 的验收标准。

### M0 · 锚点与证据硬门（可序列化/去随机化）

- 016/025 的关键门槛达标：导出/试跑输出可序列化、稳定、可解释。

### M1 · 结构可见（Manifest/Ports/Actions/Services）

- 067/078/035 的关键门槛达标：平台可枚举 actions/servicePorts/portSpec&typeIr 并用于诊断与 diff。

### M2 · 保守回写闭环（平台子集）

- 081/082 打通最小可逆闭环；
- 079 能在“不确定即跳过”的原则下，把缺失锚点写回源码并输出结构化报告。

### M3 · 语义与证据增强（可选）

- 083 提供语义插槽（不引入推断黑盒）；084 作为证据采集/校验工具存在，但不成为权威来源。

## 078–085 落地对照（基于当前代码）

> 目的：把 `080` 的“门槛/顺序”与仓库现实对齐，避免出现“规格写完才发现已有实现/关键缺口在别处”的漂移。  
> 更新：2026-01-27（后续实现推进时应持续回写本节）。

### 已有基础设施（可复用）

- 模块锚点字段已存在：`services` / `meta` / `dev.source`（`packages/logix-core/src/Module.ts`）。
- Manifest IR 与确定性 digest/diff 已包含 `servicePorts`（078）：`packages/logix-core/src/internal/reflection/manifest.ts`、`packages/logix-core/src/internal/reflection/diff.ts`、出口 `packages/logix-core/src/Reflection.ts`。
- TrialRunReport 已支持端口级对齐/缺失定位（078）：`packages/logix-core/src/internal/observability/trialRunModule.ts`。
- `$.use(...)` 使用点大量存在，且核心实现入口明确（适合作为 Parser/Spy 的锚点）：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`。
- Tag→string 的稳定 id 已收敛为单点实现（078）：`packages/logix-core/src/internal/serviceId.ts`。

### 成员 spec 对照表（最小验收入口）

| Spec | 现状入口（已存在） | 主要缺口（要补的） | 最小验收入口（建议） |
| ---- | ------------------ | ------------------ | -------------------- |
| `078` | `ModuleDef.services` + `ModuleManifest.servicePorts` + TrialRun 端口级对齐已落地 | （可选增强）把更多“声明缺口”迁移为 CI 门禁（由 079/085 驱动） | `Logix.Reflection.extractManifest` 输出包含 `servicePorts` 且 digest/diff 可门禁；TrialRunReport 输出端口级缺失清单 |
| `075` | 现阶段依赖 `FlowRuntime`/watchers 的手写形态为主 | `WorkflowDef` 权威输入 + `workflowSurface`（Π slice）导出；`stepKey` 必填与可回写；KernelPorts 作为 service ports（对齐 078） | 导出 `workflowSurface` slice，并在 Root IR（ControlSurfaceManifest）中通过 `modules[*].workflowSurface.digest` 回链；缺失/重复 stepKey 可门禁化并可在 Platform-Grade 子集内回写 |
| `079` | `packages/logix-anchor-engine/src/Autofill.ts`（services/dev.source/workflow stepKey；串联 082 写回） | （可选增强）imports 只报告/后续再逐步开放写回；deviation 维度扩展 | `logix anchor autofill --mode report|write` 输出 PatchPlan/AutofillReport/WriteBackResult；`--mode write` 后二次运行 0 diff |
| `081` | `packages/logix-anchor-engine/src/Parser.ts`（AnchorIndex@v1；RawMode + insertSpan） | tsconfig 选择/自动探测策略可继续增强（`--tsconfig` 已支持） | 同一 fixture 仓库重复扫描输出一致；RawMode 的 reasonCodes 稳定可门禁 |
| `082` | `packages/logix-anchor-engine/src/Rewriter.ts`（PatchPlan@v1 + WriteBackResult@v1；最小写入 + 竞态防护） | 逐步扩展可写回 ops 子集（当前仅 AddObjectProperty） | 对 fixture：只新增缺失字段、不重排；重复运行幂等；歧义输入显式失败并给 reasonCodes |
| `085` | `packages/logix-cli`（logix bin；Oracle/Gate/WriteBack 已接通） | `transform module` v1 已支持 `ensureWorkflowStepKeys` + `addState/addAction`（Platform-Grade 子集；其余 ops 仍按需扩展） | `logix` 子命令输出确定性 `CommandResult@v1`；能落盘工件并以 exit code 门禁化；anchor index/autofill 可形成 report→write→幂等复跑闭环 |
| `084` | `$.use` 实现点明确且已有“diagnostics off 的零开销门禁”注释（`BoundApiRuntime.ts`） | —（已收口：SpyCollector 注入点 + `SpyEvidenceReport@v1` + declared-vs-used diff + CLI `logix spy evidence` + perf evidence） | disabled：行为与性能不变（见 perf diff）；enabled：能稳定采集 usedServices 且输出可 diff/可截断 |
| `083` | `LogicUnitMeta` 已支持稳定 `resolvedId` 等锚点（`packages/logix-core/src/internal/runtime/core/LogicUnitMeta.ts`）；Manifest 已导出 `logicUnits` | —（已收口：`slots`/`slotFills` + required/unique 校验 + 确定性导出） | `extractManifest` 可枚举 slots；违规时报错包含 slotName 与冲突逻辑锚点 |

### 建议推进顺序（以最小闭环为目标）

1. `078`：先把 **servicePorts 进入 Manifest + TrialRun 端口级缺失定位** 做到可门禁/可解释（否则后续都缺锚点）。
2. `075`：把 `Π` 的闭环落成 `WorkflowDef → workflowSurface`，并固化 `stepKey` 锚点与 KernelPorts 口径（否则平台无法解释/回放 workflow）。
3. `085`（先做 US1）：先提供 **IR 导出 + TrialRun** 的 CLI 验证跑道，作为 M1 的“可复现验收入口”。
4. `081` → `082` → `079`：打通 M2 的最小可逆闭环（AnchorIndex → PatchPlan → WriteBack → 源码锚点，包含 workflow stepKey）。
5. `085`（再做 US2/US3）：接入 `anchor index/autofill` 并固化 CI 门禁（exit code + artifacts diff）。
6. `084` / `083`：放在 M2 之后推进（M3），避免出现“能看见/能建议，但填不回去”的演进死角。

### 风险提示（与现状强相关）

- 目前在 `examples/*` 与 `packages/*` 里暂未检索到 `Logix.Module.make(..., { services: ... })` 的显式声明用法；大量依赖通过 `yield* $.use(ServiceTag)` 直接读取 Env。  
  → 因此 **即使 078 已完成，`servicePorts` 仍可能大量为空**；价值释放需要配合 `079`（或手工补声明）把“声明缺口”回填到源码，并在 CI/Devtools 中固化回归入口。
