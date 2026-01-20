# 4. 平台相关术语（概念视角）

## 4.1 平台视图

- **Doc View**：需求录入与用例梳理（对应 L0/L1）。
- **Canvas View (Galaxy)**：跨模块协作与 IntentRule 图形化编辑（对应 L1/L2）。
- **Studio View**：代码生成与精修（对应 L2/L3），与本地仓库中的 Pattern / Module / Logic 等资产打通。

## 4.2 Full-Duplex Anchor Engine（全双工锚点引擎）

- 概念上是一套「Intent ↔ Code」互相映射的协议与工具链：
  - Intent → Code：根据 IntentSpec / IntentRule 生成符合约定的 Module / Logic / Pattern 实现；
  - Code → Intent：从受约束的代码子集解析出 IntentRule / Logic Graph，实现可视化回流。
- 关键前提：
  - 代码子集必须遵守上文定义的 Pattern / Module / Logic / Flow / Control（结构化控制流概念层）语义；
  - 锚点（Anchor）与 IR（IntentRule）是中间桥梁。

## 4.3 Playground / Sandbox / Runtime Alignment Lab

- **Sandbox Runtime（沙箱运行时）**
  - 指基于 Web Worker / Deno 等隔离环境的 Logix/Effect 运行容器；  
  - 主要职责是：在受控环境中执行代码，并产出结构化的日志 / Trace / 状态快照；  
  - 当前实现落点为 `@logixjs/sandbox` 子包（浏览器 Worker + esbuild-wasm + Mock 层）。

- **Playground（意图 Playground）**
  - 指平台侧面向人类/AI 的交互视图，用于：  
    - 挂载某个 Intent/Scenario（例如省市区联动）；  
    - 展示对应的 Logix/Effect 实现与运行结果（RunResult）；  
    - 支持手动/自动运行场景，用于验证实现是否符合 Intent。  
  - 本质上是 Intent/Spec → Logix → Runtime 闭环在 UI 层的一个窗口。
  - RunResult 的口径与锚点裁决见：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`。

- **Runtime Alignment Lab（运行时对齐实验室）**
  - Playground 的目标形态：不仅“能跑代码”，而且显式回答：  
    > 当前运行行为是否与 Spec/Intent 对齐？  
  - 输入：Spec/Scenario + IntentRule/R-S-T + Logix/Effect 实现；  
  - 输出：RunResult + 对齐报告（Alignment Report），指出哪些规则/场景被覆盖、哪些存在偏差。  
  - 与 SDD 映射：对应于 SDD 中的 “Executable Specs + Verify/Loop” 阶段。

## 4.4 Universal Spy / Semantic UI Mock（简称 & 角色）

- **Universal Spy（通用探针 Mock）**
  - 用途：接管非核心 IO/SDK 依赖（HTTP 客户端、第三方 SDK 等），在 Sandbox 中将其统一降维为「可观测的调用 + 可配置的 Mock 行为」。  
  - 行为：通过递归 Proxy 记录调用路径与参数，并按 MockManifest 返回结果；  
  - 与平台的关系：为运行时提供“外部世界”的可控替身，便于在 DevTools/Playground 中观测与调试。

- **Semantic UI Mock（语义 UI Mock，简称 Semantic Mock）**
  - 用途：接管 UI 组件库（如 antd/mui），在 Sandbox 中不渲染真实 DOM，而是输出 **语义组件 + UI_INTENT 信号**；  
  - Worker 内：  
    - 提供 Button/Modal/Select 等语义组件的 Headless 实现；  
    - 以 `UiIntentPacket` 的形式发出组件的状态（props）与行为意图（mount/update/action 等）。  
  - Host/Playground：  
    - 在主线程将 UI_INTENT 渲染为线框视图或其他可视化表现；  
    - 把用户交互回传 Worker，驱动 Logix/Effect 逻辑运行。  
  - 概念定位：Semantic UI Mock 是 UI 层的 **Executable Spec** 载体——它描述“有哪些交互、这些交互如何影响状态”，而不是像素级的 UI 外观。

## 4.5 Public Submodules / Independent Entry Points / Promotion Path

> 这些术语用于约束“仓库对外可依赖的入口形态”，减少实现细节成为事实 API，从而让平台/工具链只对稳定概念做消费与生成。

- **Public Submodule（对外子模块）**
  - 定义：某个包对外稳定暴露的“概念入口”（契约单元），对应稳定 import 形态（例如 `@logixjs/<pkg>` 或 `@logixjs/<pkg>/<Concept>`）。
  - 目的：让“概念地图（Concept Map）”可验证、可审阅、可迁移，避免文件组织漂移导致 API 漂移。

- **Independent Entry Point（独立子路径入口）**
  - 定义：`package.json#exports` 中显式列出的独立 subpath（例如 `@logixjs/form/react`、`@logixjs/sandbox/vite`），视为独立契约管理。
  - 约束：禁止空壳入口；必须有清晰边界与示例/文档口径；禁止通过 `internal` 路径绕过边界。

- **Promotion Path（入口提升路径）**
  - 定义：当某个子模块/入口增长到需要独立演进时，将其从“子模块入口”提升为“独立子包”的迁移路径与信号（signals）集合。
  - 目的：避免在单一包内无限膨胀并扩大破坏面；把稳定契约与演进节奏收敛到更清晰的 ownership 与发布边界。

> 本仓关于上述术语的工程化约束、验证门与迁移模板的当前裁决落点：`specs/030-packages-public-submodules/contracts/public-submodules.md`。

## 4.6 Control Surface Manifest（控制面 Root IR）

> 这些术语用于把 “Action/Service/Traits/Workflows/Blackboxes” 收口为平台可消费的单一静态工件，作为 Devtools/Alignment Lab 的结构事实源。

- **Control Surface（控制面）**
  - 定义：系统对输入（Action/Lifecycle/External/Timer）作出响应并产生行为的“可治理表面”。
  - 在 The One 方程里对应：约束闭包 $C_T$ + 控制律 $\Pi$（执行口径见 `docs/ssot/platform/contracts/00-execution-model.md`）。

- **Control Surface Manifest（控制面 Manifest / Root Static IR）**
  - 定义：平台/Devtools/Alignment Lab 消费的 Root Static IR（单一可交换工件），收口 actions、services、traits 静态形态、结构化 workflows，以及允许存在的 opaque effects。
  - 裁决口径见：`docs/ssot/platform/contracts/03-control-surface-manifest.md`。

- **Governed vs Opaque**
  - `governed`：可 IR 化/可序列化/可 diff 的结构化控制面资产（进入 Root IR）。
  - `opaque`：无法可靠 IR 化的手写 watcher/effect；允许存在但必须显式登记，并在 Devtools 中标注为黑盒（禁止静默降级）。

## 4.7 Codegen IR / Evidence Pipeline（控制面出码与证据链术语）

> 目标：把“出码工件（静态）/运行证据（动态）/锚点（稳定标识）”三者的名称收口到可对齐的最小集合，避免并行真相源。

### 4.7.0 双 SSoT：Authoring SSoT / Platform SSoT（统一字面标题）

- **Authoring SSoT（可编辑）**：面向人/LLM/Studio 的权威输入工件（可落盘/可生成/可 Schema 校验/版本化；必须纯 JSON）。所有语法糖（TS DSL / Recipe / Studio）都必须先 materialize 到 Authoring SSoT。
- **Platform SSoT（只读消费）**：面向平台/Devtools/CI gate/diff 的只读消费工件（Root Static IR + slices/index 的组合）。它必须从 Authoring SSoT **确定性编译**得到；禁止手改、禁止成为第二语义源。

> 经验法则：Authoring SSoT 回答“你想让系统做什么”；Platform SSoT 回答“平台如何判定/对比/解释/回放你让系统做的事”（不承担热路径执行成本）。

### 4.7.1 静态工件（Build/Export Artifacts）

- **Recipe（压缩输入，可选）**
  - 用途：让平台/AI 以更短输入描述常见 workflow；必须可确定性展开。
  - 展开结果必须归一到 Canonical AST（禁止 Recipe 自带第二套语义）。

- **Canonical AST（唯一规范形）**
  - 用途：语义规范形（去语法糖/默认值落地/分支显式/stepKey 完整）。
  - 约束：同一语义必须只有一种表示；缺失 stepKey 视为契约违规（fail-fast）。

- **WorkflowDef（Authoring SSoT 工件，纯 JSON）**
  - 用途：Workflow 的权威输入（可落盘/可 diff/可出码），不得携带闭包/Tag 本体/Effect 本体。
  - 关系：`Workflow.toJSON()/fromJSON(...)` 是 TS/DX 入口；在 Root IR/Static IR/Trace/Tape 中只保留稳定锚点（例如 `serviceId`），禁止双真相源。

- **Workflow Static IR（Π slice）**
  - 用途：可导出/可 diff/可审阅的结构化工作流 IR（nodes/edges + version + digest）。
  - 关系：作为 Root IR 的 `workflowSurface` slice 被引用（Root IR 不内嵌整图到事件流）。
  - Slice digest：RunResult 可选输出 `workflowSurfaceDigest`，但它必须是可从 Root IR 确定性导出的 slice（禁止并行真相源）。

- **Workflow（对外 authoring 入口，当前命名）**
  - 用途：`@logixjs/core` 的公共子模块；承载 validate/export/install 的冷路径能力（平台/AI 出码入口）。
  - 关系：导出 `WorkflowStaticIr`（即 Workflow Static IR / Π slice）；运行时执行消费的是 internal `RuntimePlan`（不以 IR 扫描替代热路径索引）。

- **call / callById（Service ports 入口）**
  - `callById('<serviceId>')`：Platform-Grade/LLM 出码推荐形（字面量 serviceId，稳定锚点）。
  - `call(Tag)`：TS sugar（本地 DX）；install/export 期必须 fail-fast 并派生同一个 `serviceId`（禁止要求消费者解析 Tag 才能建立锚点）。

- **KernelPorts（内核端口作为 service ports）**
  - 用途：把内核能力以普通 service port 的方式暴露（稳定 `serviceId='logix/kernel/<port>'`），避免第二套“隐式内核 API”。
  - 关系：在 Workflow 中以 `callById('logix/kernel/<port>')` 作为规范形表达；TS 允许 `call(KernelPorts.<Port>)` 作为糖衣。

- **ControlSurfaceManifest（Platform SSoT：Root Static IR）**
  - 用途：平台/Devtools/Alignment Lab 消费的单一可交换工件（actions/services/traits/workflows/opaque 收口）。
  - 关系：以 digest + slices/index 为主；执行性能来自 internal RuntimePlan（不在 Root IR 内）。

- **RuntimePlan（运行时执行计划，internal）**
  - 用途：热路径用的索引/路由表/预解析产物（例如 actionTag→programs 路由表）。
  - 约束：不得成为平台消费工件；不得以 Root IR 扫描/哈希替代 RuntimePlan。

### 4.7.2 动态证据（Runtime Evidence）

- **Trace（解释链）**
  - 用途：回答“为什么发生了什么”；Slim、可采样、可丢弃；以 tickSeq 为参考系锚点。
  - 约束：不得携带 Static IR 全量；只携带锚点与 digest 引用。

- **Tape（回放磁带）**
  - 用途：回答“如何 deterministic replay/fork”；记录开放系统边界的不确定性交换（IO outcome / timer fire / external snapshot）。
  - 约束：受控环境开启（Sandbox/Test）；live 默认不必常开。

- **RunResult（平台 Grounding）**
  - 用途：一次 Playground/Scenario Run 的输出（EvidencePackage + 可选 tape/snapshots/static digests）。
  - 关键字段：`static.controlSurfaceDigest`（优先；Root IR 全局入口）。

### 4.7.3 关键流程名（Pipelines）

- **expand/normalize**：Recipe/DSL/平台输入 → Canonical AST（纯数据，确定性）
- **validate（fail-fast）**：版本/稳定标识/stepKey 唯一性/serviceId 可解析性/预算裁剪
- **compileRuntimePlan**：Canonical AST/Static IR → RuntimePlan（internal；冷路径）
- **export**：输出 Static IR / ControlSurfaceManifest（Stable JSON + digest）
- **mount/route/interpret**：RuntimePlan 驱动执行（单订阅 + O(1+k) 路由）
- **record / replay / fork**：Tape 模式下的确定性运行（按 tickSeq 主轴）

### 4.7.4 锚点与稳定标识（Anchors）

- **静态锚点**：`moduleId`、`actionTag`、`serviceId`、`programId`、`nodeId`、`stepKey`、`fragmentId`、`sourceKey`、`digest`
- **动态锚点**：`instanceId`、`tickSeq`、`txnSeq`、`opSeq`、`runId`、`timerId`、`callId`、`linkId`

> 规则：静态工件只包含静态锚点；动态证据必须能通过静态锚点回链到 Root IR（禁止第二套身份系统）。
