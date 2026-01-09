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

### 061 · Playground Editor Intellisense（可选增强）

- 定位：提供编辑器侧 TypeScript/类型支撑，辅助平台开发与验证。
- 备注：属于“生产力增强”，不是 IR/锚点闭环的硬前置。

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

- 定位：在平台产品落地前，提供统一命令入口串联 IR 导出/试跑/索引/回写；同时作为 Node-only 能力的集成测试跑道。
- 关键门槛：输出确定性、可序列化、可 diff；report-only/write-back 双模式；失败/跳过/降级必须可解释（reason codes）。

### 083 · Named Logic Slots（Medium→Hard）

- 定位：从“结构可见”迈向“语义可见”的第一步：模块逻辑插槽语义化，支撑替换/组装。
- 风险：容易与业务语义耦合；需要严格限定“插槽语义”的表达与治理边界（避免平台过度推断）。

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
