# Philosophy ↔ Reviews 对齐（设计哲学与实现评估的双向拉齐）

本文件的目标不是把 `docs/ssot/handbook/reading-room/philosophy/*` “升级为规格”，而是把它作为 **SSoT 之上的架构设计原则层**，与 `docs/ssot/handbook/reading-room/reviews/*` 的实现评估结论做一次 **双向拉齐**：

- 让 reviews 的结论可以回扣到“为什么要这样做”（价值与不变量）；
- 让 philosophy 的论述能吸收 reviews 的“证据与硬门槛”，避免停留在抽象口号或出现 API 漂移。

## 0. 三层文档的裁决关系（务实约定）

1. **Specs（SSoT，裁决 What/Contract）**：`docs/specs/**` + 实际类型/代码导出（冲突时以本地类型/代码为最终裁决，并回写 specs）。
2. **Philosophy（原则层，裁决 Why/Trade-off）**：`docs/ssot/handbook/reading-room/philosophy/**` 给出价值观、不变量与“取舍方向”，不直接规定 API 细节。
3. **Reviews（证据层，裁决 Now/Gap/Next）**：`docs/ssot/handbook/reading-room/reviews/**` 以代码为证据，指出当前偏离点与不兼容改造顺序。

当三者冲突时：

- “术语/API/行为”以 Specs+代码为准；
- Philosophy 负责解释“为何要收敛到某种形态”；
- Reviews 负责把原则落成“可执行的硬门槛与改造清单”。

---

## 1. 对照矩阵（Philosophy → Reviews）

### 1.1 `01-safeguarding-ai-maintainability.md`（确定性 / 可解释性 / 可回放）

**原则提炼**

- 确定性：0/1 commit、同步状态机，消灭竞态与时序耦合。
- 可解释性：显式依赖与诊断信号，避免“靠猜”。
- 可回放：事件/资源快照，可用最小证据包复现线上问题。

**reviews 映射**

- 事务与 trait 增量优化：`docs/ssot/handbook/reading-room/reviews/03-transactions-and-traits.md`
- 诊断与回放：`docs/ssot/handbook/reading-room/reviews/04-diagnostics-and-devtools.md`
- 逃逸通道破坏确定性与回放：`docs/ssot/handbook/reading-room/reviews/02-mental-model-and-public-api.md`（`state.ref()` 可写）、`docs/ssot/handbook/reading-room/reviews/06-evidence-map.md`

**需要双向拉齐的动作**

- Philosophy 侧补充“工程推论”：禁止可写 `SubscriptionRef` 逃逸、事务窗口禁止 IO、事件 Slim/IR-first、稳定 id。
- Reviews 侧把这三项原则作为“硬门槛的价值依据”，避免被误解为“纯洁癖重构”。

### 1.2 `02-intent-first-and-crystallization.md`（意图优先 / 结晶 / 双向映射）

**原则提炼**

- Code 是 Intent 的投影；平台的职责是维护 Liquid Intent ↔ Solid Assets 的双向映射。
- 结构化 Intent 让校验、推理与对齐成本显著降低（LLM 时代的基础设施）。

**reviews 映射**

- 平台全双工与最小 IR：`docs/ssot/handbook/reading-room/reviews/07-platform-full-duplex-and-alignment-lab.md`
- “统一最小 IR”作为路线图硬门槛：`docs/ssot/handbook/reading-room/reviews/99-roadmap-and-breaking-changes.md`

**需要双向拉齐的动作**

- Reviews 侧强调：IR 不只是平台 UI 的数据结构，而是“结晶产物”的可验证形态（可合并/可诊断/可回放）。
- Philosophy 侧强调：IR 的边界必须与 Platform-Grade 子集绑定（Architecture as View），否则结晶会失控。

### 1.3 `03-logic-first-ui-agnostic.md`（逻辑资产化 / 信号驱动 / 无头测试）

**原则提炼**

- UI 只 emit signal；Logic 只 listen signal；One Logic, Any Runtime。
- AI 分而治之：逻辑与视觉是两类模态，必须解耦以提升质量与可维护性。

**reviews 映射**

- React 1+1>2 的关键前提（事务边界、订阅收敛、严格多实例语义）：`docs/ssot/handbook/reading-room/reviews/05-react-and-sandbox-integration.md`、`docs/ssot/handbook/reading-room/reviews/07-phase3-react-1p1gt2.md`
- Sandbox 的 UI_INTENT/回放闭环：`docs/ssot/handbook/reading-room/reviews/07-platform-full-duplex-and-alignment-lab.md`

**需要双向拉齐的动作**

- Reviews 侧明确：UI 信号（action/UI_INTENT）必须进入同一套 IR/事件协议，才能形成“可对齐的数字孪生”。
- Philosophy 侧补充：UI_CALLBACK（双工）是“信号驱动”的必要组成，而不仅是 demo 功能。

### 1.4 `04-developer-sovereignty.md`（零锁定 / 随时逃逸 / 双向尊重）

**原则提炼**

- 平台是工具不是牢笼：标准 TS/Effect，随时 Eject，保留手动修改。
- 双向尊重：平台尊重开发者的手改；开发者尊重平台的锚点约束。

**reviews 映射**

- White/Gray/Black 的降级策略与锚点系统：`docs/ssot/handbook/reading-room/reviews/07-platform-full-duplex-and-alignment-lab.md`
- “歧义 API 会破坏全双工”→ 必须删 `andThen`：`docs/ssot/handbook/reading-room/reviews/07-platform-full-duplex-and-alignment-lab.md`

**需要双向拉齐的动作**

- Philosophy 侧需要明确：Black Box 不应“不可见”，至少要保留 loc + 最小可诊断信息（否则会变成平台锁定的反面：排障被平台吞掉）。
- Reviews 侧需要把“Eject/降级”作为平台契约的一部分，而不是仅当作实现细节。

### 1.5 `05-architecture-as-view.md`（架构即视图 / 全双工）

**原则提炼**

- 不解析每一行，只解析架构骨架：Module、依赖（`$.use`）、规则链（Fluent DSL）。
- White/Gray/Black 分层，形成可控的全双工边界。

**reviews 映射**

- 现状最大阻塞：锚点写法在 docs/scripts 与实现之间漂移：`docs/ssot/handbook/reading-room/reviews/07-platform-full-duplex-and-alignment-lab.md`

**需要双向拉齐的动作（已识别漂移）**

- 已修正：示例已统一为 `.run/.update/.mutate` 终端；Black Box 已调整为“降级但可诊断”，避免继续制造“原则层的漂移”。

### 1.6 `06-brave-forward-compatibility.md`（拒绝向后兼容 / Spec-Driven Evolution）

**原则提炼**

- AI 时代重构成本下降，应该站在“更显式、更可解析、更适合 AI”的未来设计上。
- 最大风险是 SSoT drift：文档/代码/工具链不一致会摧毁协作与可维护性。

**reviews 映射**

- “阻断漂移”被列为 Phase 0：`docs/ssot/handbook/reading-room/reviews/99-roadmap-and-breaking-changes.md`
- 漂移已发生且阻塞平台化：`docs/ssot/handbook/reading-room/reviews/07-platform-full-duplex-and-alignment-lab.md`

**需要双向拉齐的动作**

- Philosophy 侧应把 “工具链也是事实源的一部分” 写清楚：Parser/Codegen 的过时与 specs 漂移同级危险。

### 1.7 `07-runtime-trinity-and-effect-native.md`（Module/Logic/Live + Effect-Native）

**原则提炼**

- Module（定义）/ Logic（程序）/ Live（执行）三位一体，明确区分“定义 vs 实例”。
- 不隐藏 Effect：并发/错误/环境都是物理法则；`$` 只做业务投影，不做语义遮蔽。

**reviews 映射**

- 多实例隔离与作用域语义：`docs/ssot/handbook/reading-room/reviews/03-transactions-and-traits.md`、`docs/ssot/handbook/reading-room/reviews/05-react-and-sandbox-integration.md`
- Tag/Identity 的一致性与稳定性：`docs/ssot/handbook/reading-room/reviews/04-diagnostics-and-devtools.md`、`docs/ssot/handbook/reading-room/reviews/99-roadmap-and-breaking-changes.md`

**需要双向拉齐的动作**

- Philosophy 侧应把 “稳定 Identity 不是调试锦上添花，而是三位一体与全双工的基础设施” 明确化。

---

## 2. 已修正的“哲学层漂移”（高优先级，作为样例）

1. `docs/ssot/handbook/reading-room/philosophy/05-architecture-as-view.md` 示例与表述已统一为 “Fluent 规则链 + 显式终端 sink（`.run/.update/.mutate`）”。
2. `docs/ssot/handbook/reading-room/philosophy/05-architecture-as-view.md` 的 Black Box 已明确为“降级为代码块节点（保留 loc/Module/Logic/最小诊断锚点）”，而不是 Invisible。
3. philosophy/reviews 的入口互链已补齐：`docs/ssot/handbook/reading-room/philosophy/README.md` ↔ `docs/ssot/handbook/reading-room/reviews/README.md`，并以 `docs/ssot/handbook/reading-room/reviews/08-philosophy-alignment.md` 作为长期维护的对照总表。

这两点会直接破坏“philosophy 作为原则层”的可信度：原则层一旦与现实冲突，会把 drift 扩散到 specs、脚本、示例与团队写法。

---

## 3. 维护建议（让 philosophy 持续成为“可用的原则层”）

- Philosophy 尽量避免写“易漂移的具体 API 名称”；如果必须举例，优先引用 **结构形态**（例如 “Fluent 规则链 + 显式终端 sink”）而非具体方法名。
- 每次 reviews 发现“硬阻塞/硬门槛”，应回写一条“原则层的工程推论”，并链接到对应 review 文档。
- 每次 specs 发生重大演进，应跑一次全库 drift 扫描：docs/specs + docs/ssot/handbook/reading-room/philosophy + scripts + examples 必须同步收敛，否则平台全双工会被最薄弱一环拖死。
