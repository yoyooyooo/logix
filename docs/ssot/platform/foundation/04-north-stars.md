---
title: foundation/04 · 北极星（North Stars）
status: living
---

# 北极星（North Stars）

本文的目标是把本仓已经裁决的口径（The One / Contracts / IR / Governance）与长期愿景（Blueprint / Kill Features）收敛为一组**可长期引用**的“北极星”：

- 作为“取舍时的裁决准绳”：当我们在实现复杂度、DX、性能、可诊断性之间发生冲突时，用它反向约束方案。
- 作为“路线图的对齐坐标”：Roadmap 只承诺阶段性交付；北极星定义“我们最终要解锁的能力形态”。

> 约束：本文不替代契约裁决；每条北极星都必须能落到可验收的信号与硬约束，避免出现“口号正确、落地漂移”的第二套真相源。

## 0) 现阶段的北极星一句话版

- 平台交付的是闭环：`Spec → Contracts → Code → RunResult` 可对齐（可选可回放）。
- 逻辑必须可审查、可对比、可解释：变更的语义差异要能被稳定 diff 捕获并可视化呈现。
- 图码全双工必须可落地：允许“画布编辑”，但**永远尊重代码主权**，并保持可 eject。

口径说明（本文件内“自包含”）：

- 平台不裁决 UX 细节，只裁决概念/模型/契约与闭环口径。
- 运行时负责执行与证据产出，平台只消费“静态工件 + 动态证据”（而不是运行时内部对象）。
- 允许 forward‑only 演进：breaking 允许，但必须可解释、可对齐、可迁移、可交接。

平台闭环（面向真实业务仓库）：

- **Intent（需求/交互/约束） → Blueprint/IntentRule → Code（Logix/Effect） → Run（Sandbox/Runtime） → Alignment（诊断与回流）**

关键不是“能生成代码”，而是：

- 能持续演进：版本化、审计、回放、治理。
- 能解释：把运行行为映射回需求/规则/代码的稳定锚点（不靠“读代码猜”）。
- 能协作：人类与 Agent 在同一事实源上工作，所有变更都可审阅/可追溯。
- 能验证：用结构化证据链判定对齐与回归（而不是只看日志与口头描述）。

定位一句话：

- Logix（原 Intent Flow）更接近“可执行规格引擎（Executable Spec Engine）”：不仅管理 spec 文档，更要把 spec 收敛到统一最小 IR，并用运行证据作为可解释的证明与回放载体。

## 1) 北极星（Outcome：我们最终要解锁的“杀手级能力”）

这些能力的具象化清单（Kill Features 矩阵）已内化到本文末尾；此处先提炼为“可长期指路”的 Outcome 北极星，并明确其最小可验收信号与裁决口径。

### NS-1：GitHub for Logic（可视化逻辑评审）

目标：

- 在 PR/Review 场景下，非代码读者也能看懂“这次发布改了哪些业务控制点”，并能发现未被审计的暗改。

最小信号（Signals）：

- 有一个稳定的 Root IR（Platform SSoT）可被确定性导出并做结构化 diff（digest 稳定）。
- Workflow/Rule 的结构变化可以落到“节点/边/stepKey”的差异表达上，而不是文本 diff。

口径要点：

- 必须存在一个“控制面 Root Static IR”工件，并且其导出与裁剪必须确定性（stable JSON）。
- digest/diff 的口径必须只受语义影响：字段排序、默认值落地、去掉非语义 meta、预算裁剪必须可解释且可审阅。
- 运行期事件流不得携带 IR 全量；事件只携带锚点与 digest 引用，展示侧按需加载静态工件（避免热路径与事件体膨胀）。

### NS-2：全双工画布（Code ↔ Graph 双向同步）

目标：

- 画布与代码基于同一份事实源协作：改代码能回流图；改图能保守回写代码；并允许随时 eject。

最小信号（Signals）：

- Canonical AST：同一语义只有一种规范形（默认值落地、语法糖消解、分支显式、stepKey 完整）。
- Parser/Rewriter：平台可解析子集可 roundtrip（解析→规范化→回写）且锚点不漂移。

口径要点：

- 全双工的“无损”不等于解析所有 TS：只对白盒子集负责（平台可解析子集），其余默认降级为灰盒/黑盒。
- 回写必须保守：只允许在受控槽位/白盒结构内做 AST patch；任何无法保证不漂移的写法都必须显式降级（可展示、不可精细编辑）。
- 永远尊重代码主权：平台必须支持随时 eject；eject 后平台只做最小结构化信息维护，不再尝试精细回写。

### NS-3：语义级门禁（Intent Integrity Guardian）

目标：

- CI 可以基于“意图/语义规则”做门禁：例如资金扣减前必须经过风控；并能识别不可达路径、违例拓扑等。

最小信号（Signals）：

- 静态治理（Static Governance）可以把规则映射到 Root IR/IntentRule 上执行，而不是基于文本猜测。
- 违例的输出必须可解释：定位到具体 moduleId/programId/nodeId/stepKey 与对应契约条款。

口径要点：

- 门禁必须是“语义级”：治理对象是结构化 IR 与其证据链，而不是文本/日志/启发式猜测。
- 门禁输出必须可解释：必须能定位到稳定锚点（模块/实例/事务/步骤/因果链路）与明确的违例原因码，避免“红灯但无法复述”的不可交接失败。

### NS-4：精准影响面分析（Impact Analysis）与活体文档（Living Docs）

目标：

- 任何底层变更都能计算爆炸半径（依赖图 + 调用链），并沉淀为随代码演进的“活体架构地图”。

最小信号（Signals）：

- Root IR 的 slices（Workflow/Service/Trait/Action surfaces）能导出依赖图与调用链。
- “文档”以工件形式产出并可被 Devtools/平台消费，而不是手写静态图。

口径要点：

- 影响面分析的输入必须来自静态工件：依赖图/调用链是 Root IR 的投影，而不是运行时采样猜测。
- “活体文档”必须来自工件与证据：它不是手写图，而是可版本化、可 diff、可审阅的产物（否则无法随代码演进保持一致）。

### NS-5：Time‑Travel Workflow Debugging（可交互回放调试）

目标：

- 生产故障的主要形态是“可解释 + 可回放（受控）”：把运行行为锚定回静态结构，并能在受控环境 deterministic replay/fork。

最小信号（Signals）：

- RunResult 有统一口径（evidence/anchors/static digests），主时间轴是 tickSeq。
- Trace 与 Tape 必须分层：Trace 用于解释，Tape 用于回放（仅受控环境）。

口径要点：

- tickSeq 是因果主时间轴；wall‑clock 只用于展示与统计，不得成为回放/因果锚点。
- 事务窗口内禁止 IO/等待；任何 IO 必须事件化回填（开放系统的不确定性必须进入证据链，否则“回放”不可证明）。
- Trace 用于解释（允许采样/降级）；Tape 用于回放（必须覆盖不确定性交换，通常只在 Sandbox/Test 受控环境开启）。

### NS-6：平台级自动迁移与重构（Rewriter）

目标：

- 平台能做保守的结构化补丁：批量迁移 serviceId、插入 timeout/错误分支、升级旧 DSL 等，并可审查、可回滚（通过 diff/PR）。

最小信号（Signals）：

- Canonical AST 是唯一规范形；Rewriter 的补丁策略必须可解释、可 diff、可审查。
- 稳定锚点（stepKey）保证重构不等于“身份漂移”。

口径要点：

- Rewriter 的产物必须是“保守补丁”：可审阅、可回滚、可与 digest/diff 对齐；禁止隐式重排或引入不可解释漂移。
- 身份必须重构友好：stepKey 稳定；语义变化靠 digest 表达；不要把“语义敏感地址”绑在易漂移的 id 上。

### NS-7：Sandbox / Alignment Lab（可执行规格与对齐实验室）

目标：

- 平台不仅能“跑代码”，还能回答“是否与 Spec/Intent 对齐”，并提供可复现的对齐证据（RunResult + report）。

最小信号（Signals）：

- Sandbox 能隔离执行并产出结构化证据；语义 Mock/Spy 可把外部世界降维为可观测可注入事件。
- 对齐产物必须能回链到 Root IR digest 与锚点（避免只剩文本日志）。

口径要点：

- Sandbox 的价值不是“代码 runner”，而是“受控环境 + 可解释证据链 + 可复现对齐报告”。
- Spy/Mock 的目的不是替换真实系统，而是把开放系统的边界统一降维为“可观测调用 + 可注入结果”，从而让回放与对齐可证明。

### NS-8：自愈闭环（Generate → Run → Verify → Fix）

目标：

- 终局形态是“交付已通过验证的逻辑”：平台与 Agent 以证据链驱动自动纠错，而不是只生成代码。

最小信号（Signals）：

- 测试/回归可以被程序化驱动，失败能产出可供 Agent 消化的最小 RunResult slice。
- 修复必须受约束：变更可 diff、可审查、可回放验证。

口径要点：

- 闭环的燃料不是“更多 prompt”，而是结构化证据：失败必须能被切成最小证据片段（聚焦 tick/锚点/关键事件/快照），用于自动定位与自动修复。
- 修复必须受控：以结构化 patch 形式进入代码审阅流（PR），并能在受控环境下复现验证（回放/对齐报告）。

### NS-9：自动并发治理（Automated Concurrency Governor）

目标：

- 在不牺牲 Effect 表达力的前提下，把“并发/取消/背压/无界 fan‑out 风险”收敛为可分析、可约束、可解释的治理能力（静态发现 + 动态证据）。

最小信号（Signals）：

- 并发语义在 Flow/Fluent 层可被识别（latest/exhaust/parallel/queue 等），并能映射到可解释的诊断事件与约束点。
- “同一状态被多处并发写入”“无界并发被启用”等风险，能以可追溯锚点定位（moduleId/programId/nodeId/stepKey + 触发源）。

口径要点：

- 治理对象必须可判定：并发语义需要有稳定的“可识别形态”，才能做静态发现与动态审计（否则只能靠线上事故教育）。
- 风险必须可定位：同一状态的并发写入、无界并发等必须能定位到具体规则/步骤与触发源，并给出结构化修复建议（而不是“建议你小心并发”）。

### NS-10：自适应诊断（Zero‑Overhead-ish Diagnostics）

目标：

- 生产环境默认近零开销（可控/可忽略），但能在毫秒级切到 `light/full` 等级收集足够证据，并保持事件 Slim、可序列化、可回链。

最小信号（Signals）：

- 诊断分层（必达通道 vs 可降级通道）在物理上隔离；Diagnostics=Off 仍能保证关键锚点不丢失。
- 各类诊断事件的裁剪/降级必须可观察（显式 downgrade/budget 标记），避免解释断层。

口径要点：

- “Off 不是零成本”：目标是可控/可忽略，而不是绝对 0；任何宣称 0 的实现最终都会把成本转移到不可控的分配与维护上。
- 必须能按需切档：平时以低成本保持锚点不断裂；出事时快速切到 light/full 获取足够证据，并且裁剪/降级必须可观察。

## 2) 北极星（Invariants：北极星背后的工程不变量）

Outcome 北极星能否成立，取决于以下工程不变量是否长期守住（这些是不变的“物理口径”）。

1. **双 SSoT：Authoring SSoT → Platform SSoT 的确定性编译**
   - 规则：可编辑输入工件与只读消费工件必须分离；只读工件必须可确定性编译得到；禁止手改、禁止并行真相源。

2. **统一最小 IR：Static IR + Dynamic Trace（严格分层）**
   - 规则：Static IR 是“可对比/可解释/可回放锚点化”的静态工件；Dynamic Trace/Tape 是运行证据；两者不能互相冒充。

3. **稳定标识去随机化：锚点必须可复现**
   - 规则：instanceId/txnSeq/opSeq/tickSeq/linkId 等必须稳定；禁止把随机数/墙钟作为主锚点。

4. **tickSeq 参考系 + 事务窗禁止 IO**
   - 规则：tickSeq 是因果主时间轴；事务窗口内禁止 IO/等待；IO 必须事件化进入证据链。

5. **可解析子集是白盒，其余默认降级**
   - 规则：平台只承诺对 Platform‑Grade 子集的解析与回写；其余一律以 Gray/Black Box 表示并通过 Trace 做灰盒观测。

6. **开发者主权：零锁定 / 随时逃逸 / 双向尊重**
   - 规则：平台出码必须可读、可维护、可 eject；回写必须锚点保护，不强行覆盖手写。

7. **热路径不背工件成本：RuntimePlan 内化，Root IR 冷路径化**
   - 规则：Root IR/IR 扫描/哈希等不得成为运行时热路径成本；热路径由 internal RuntimePlan 承担。

8. **Forward‑only：版本化、fail‑fast、无兼容层**
   - 规则：breaking 允许，但必须同步迁移说明与 SSoT 回写；未知版本 fail-fast。

## 3) 运行时终态分层（L0–L3）

目标：让“引擎骨架”最终收敛为少数可解释、可优化、可治理的层级，而不是无边界扩张的 API 表面积。

- **L0：最小 IR（可编译/可合并/可诊断）**  
  所有高层 DSL（Logic/Pattern/Trait/Task/Query/Form/…）必须 100% 降解到统一 IR；IR 支持冲突检测与确定性合并（重复路径、覆盖优先级、单写者规则等）。
- **L1：事务执行引擎**  
  单实例 FIFO + 0/1 commit；以 txn 为边界做批处理与证据链锚定；dirty‑set/patch 作为一等公民（信息质量必须可用、退化必须可解释）。
- **L2：声明式推导（Trait/Derived）**  
  以 deps 为唯一依赖事实源；支持增量调度、预算与降级策略；source 具备 keyHash gate + 并发语义 + 可回放证据。
- **L3：业务友好 DSL（唯一推荐写法）**  
  对业务只暴露最少概念与固定组合方式，避免“同一问题多套等价写法”；其余形态要么下沉为 internal 原语，要么上浮为平台出码接口。

## 4) React × Logix 的终态目标（1+1>2）

一句话目标：

- React 不再“订阅整棵 state 并在组件里各自算 selector”，而是订阅“事务提交 + dirty‑set”驱动的 `SelectorGraph`；每次事务只重算最小集合的 selector，只通知真正受影响的组件，并把 `txn → selector → render` 串成强因果链。

必须达成的契约：

1. **事务 → 渲染批处理**：React 订阅以 txn 为边界收敛，避免一次 action 触发多次渲染抖动。
2. **可诊断性**：组件渲染事件能与 txn 锚点对齐（不能靠“最近一次 txn 推断”作为主机制）。
3. **选择器与依赖收敛**：selector 必须可追踪、可缓存、可复用；避免“每次 render 创建新 selector 导致订阅失效”。
4. **开发体验与降级**：默认观测足够解释性能问题，但生产环境必须可降级且无隐性开销。

## 5) Kernel 终态：Integer‑only Runtime Kernel（无字符串内核）

目标：把字符串 Path 从热路径里剥离，只允许它存在于 I/O 边界（Schema 定义、Devtools 展示、持久化/导入导出）；核心循环（Transaction/DirtySet/Converge）以整型 ID 运算，降低 GC/哈希与字符串比较成本。

演进要点（方向性，不限定实现细节）：

- **Phase 1**：在 Converge/Planner/Cache 里引入 `FieldPathId/StepId`；对外若仍是字符串 dirty‑set，只允许在边界一次性映射为 ID，随后全程 ID。
- **Phase 2**：ID 分配下沉到 build/install（Trait/节点注册即获 ID），降低运行期查表与口径漂移风险。
- **Phase 3**：Transaction/DirtySet 进入混合态（`id + path`），逐步去字符串并建立 BitSet/TypedArray 落点。
- **Phase 4**：Kernel Switch：从 dispatch 起点转 ID，Transaction Loop（Reducer→Patch→Converge→Commit）全程整型；字符串仅在 Debug/导出时懒加载反查。

## 6) Kill Features 矩阵（内化版）

> 用途：把北极星具象化为可讨论的产品形态，帮助在评审/规划中更快对齐“我们最终要解锁什么”；裁决仍以上文 NS-* 为准。

> **价值公式**: `Value = (Developer Experience * Business Safety) / Implementation Cost`

### Priority 0: The "Killer" App (改变游戏规则)

#### KF-1. Visual Logic Review ("GitHub for Logic") → NS-1

- **What**：在 PR 页面集成 `Diff View`，自动识别 `Workflow Static IR` 的变化，并渲染成可视化的流程图差异（Before/After）。
- **Kill Point**：
  - 破除代码壁垒：PM/业务负责人不需要读 TS 代码，也能看懂“这次发布改了哪些审批节点”。
  - 防篡改：任何未被审计的业务逻辑变更（如临时加的 `if (user == 'admin') bypass()`）都应在图上无所遁形。
- **Enabled By**：`ControlSurfaceManifest.digest` + `WorkflowSurface` + `Canonical AST` + `stepKey`。

#### KF-2. Full-Duplex Visual Authoring (全双工画布) → NS-2

- **What**：代码(Code)与画布(Canvas)双向实时同步：改 TS 自动回流图；拖拽节点自动回写 TS。
- **Kill Point**：
  - Pro‑Code/Low‑Code 统一：终结“导出代码就无法回到画布编辑”的死锁。
  - 架构师与开发同频：架构师画骨架（Intent），开发填血肉（Implementation），始终基于同一份事实源协作。
- **Enabled By**：Full‑Duplex Anchor Engine + Canonical AST + Parser/Rewriter + `stepKey` 稳定性。

### Priority 1: Stability & Safety (企业级护城河)

#### KF-3. Intent Integrity Guardian (意图完整性守护) → NS-3

- **What**：在 CI 阶段通过 `Alignment Lab` 自动运行逻辑验证与语义门禁。
- **Kill Point**：
  - 语义级门禁：例如“凡涉及资金扣减的 Action，前置必须有风控检查节点”，漏写直接红灯。
  - 死代码检测：精确识别 IR 中不可达分支（Unreachable Paths），而不是文本级静态扫描。
- **Enabled By**：Static Governance + IntentRule 映射 + RunResult/Anchors。

#### KF-4. Precision Impact Analysis (精准影响面分析) → NS-4

- **What**：修改底层服务/Action 时，精准计算“爆炸半径”（受影响的 workflows/场景/测试）。
- **Kill Point**：
  - 拒绝盲目回归：修改 `UserUpdate` Action 时，平台能指出波及的 15 个业务流与关键链路。
  - 智能回归测试：CI 只跑受影响用例，从 30 分钟缩短到 3 分钟。
- **Enabled By**：`ServiceSurface`（依赖图）+ `WorkflowSurface`（调用链）+ 稳定 digest/diff。

#### KF-5. Automated Concurrency Governor (自动并发治理) → NS-9

- **What**：对全站的竞态条件进行静态分析与动态约束，并给出可解释的治理建议/门禁。
- **Kill Point**：
  - 消灭 Race Condition：发现同一状态在多个 Flow 中并发修改且未受控，直接报错或给出结构化修复建议。
  - 智能背压：识别高频触发 Action，建议/自动插入 `takeLatest/throttle` 等策略，避免过载。
- **Enabled By**：Execution Plane（TaskRunner）+ Flow 并发语义 + ConcurrencyPolicy + Root IR（Action/State 引用分析）。

### Priority 2: Efficiency (效能倍增器)

#### KF-6. Time-Travel Workflow Debugging (时光倒流调试) → NS-5

- **What**：生产报错时不仅给堆栈，还能给可交互的执行路径回放（图上高亮线随时间流动）。
- **Kill Point**：
  - MTTR 归零：不需要复现，拖动进度条定位“哪一步数据变脏了”。
  - 上帝视角：结合 Semantic Spy，看到每一时刻的“外部世界快照”（网络包、用户点击）。
- **Enabled By**：Dynamic Trace（tickSeq）+ Root IR（索引回链）+ ReplayLog/Tape（受控）。

#### KF-7. Automated Refactoring & Migration (自动重构) → NS-6

- **What**：平台级 `Codegen Rewriter`，对结构化子集做保守补丁回写。
- **Kill Point**：
  - 一键升级：批量把 `OldService` 替换为 `NewService`，并自动插入 `Transformer` 节点。
  - 批量治理：对遗留流程自动补齐 `Timeout` 策略或错误分支骨架。
- **Enabled By**：Platform‑Grade Rewriter + Canonical AST（规范形）+ 稳定锚点（stepKey）。

#### KF-8. Zero-Overhead Production Diagnostics (零开销自适应诊断) → NS-10

- **What**：生产默认 `off`（近零成本），按需毫秒级热开启 `light/full`，抓取现场后自动关闭。
- **Kill Point**：
  - 薛定谔的观测：平时静默，出事瞬间自动开启录制，抓取现场后回落。
  - 黑盒变白盒：即便是手写的 Opaque Effects，开启模式下也能通过 Spy 看到关键 IO。
- **Enabled By**：Observability Level Switching + DevtoolsHub + TickScheduler + Slim/可序列化事件壳。

### Priority 3: Asset Management (资产沉淀)

#### KF-9. Living Documentation (活体文档) → NS-4

- **What**：系统架构图永远与线上代码一致（IR 作为构建产物与平台资产）。
- **Kill Point**：消灭“文档与代码不一致”；新成员看到的就是实时的业务逻辑地图。
- **Enabled By**：Root IR 作为 Build Artifact + 依赖图/调用链导出 + digest/diff。

#### KF-10. Sandbox-as-a-Service (沙箱即服务) → NS-7

- **What**：对任意业务切片隔离运行与对齐测试（浏览器 Worker / 服务端隔离容器）。
- **Kill Point**：
  - 安全试运行：运行不可直接上线的代码（第三方插件、未审核业务流）。
  - Pixel‑Perfect Logic：利用 `Semantic UI Mock` 在无真实 UI 下验证交互逻辑对齐（Intent）。
- **Enabled By**：Sandbox Runtime + Semantic Mock + Alignment Lab + RunResult grounding。
