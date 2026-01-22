# Research: 013 Auto Converge Planner（无视场景的及格线）

> 本文把 `specs/013-auto-converge-planner/spec.md`、`docs/ssot/handbook/reading-room/impl-notes/01-micro-optimizations.md` 与相关 review 结论收敛为可落地的裁决与取舍，作为 Phase 1（data-model / contracts / quickstart）与后续实现拆分的依据。

## Decision 1：Converge Static IR 必须在 build/加载阶段一次性生成（紧凑、整数化）

**Decision**：

- 在 Module build/加载阶段生成并缓存 Converge Static IR：`FieldPathId`/`StepId` 映射、依赖邻接表、以及 `full` 模式 topo order 等“紧凑数组结构”。
- Planner/Runtime 内核接口以整数 ID 作为唯一交换格式（String path 只允许在边界映射一次），Execution Plan 输出为纯数据（优先 `Int32Array` / 等价紧凑结构），不得携带闭包/Effect。
- `FieldPathId/StepId` 仅在同一 `Cache Generation` 内稳定，不作为跨 session/跨运行的持久化契约。

**Rationale**：

- 当前 naive converge 在热路径会做 `O(V+E)` 的图遍历/拓扑排序与字符串 overlaps 扫描；auto 的核心价值是把这些重活下沉到 build 阶段，使热路径在 cache-hit 时接近 `O(1)`。
- 紧凑数组（typed array / adjacency list）降低 GC 与指针追逐，且为未来替换 Wasm 内核预留低成本边界。

**Alternatives considered**：

- 运行时每笔事务按需计算 topo 并缓存：拒绝（cache 失效复杂、热路径抖动大、很难证明 `auto <= full * 1.05`）。
- 继续以字符串 FieldPath 做 overlaps：拒绝（热路径分配与比较不可控，难以满足决策预算与下界门槛）。

## Decision 2：Dirty Pattern key 必须“归一化 + 去冗余 + 排序 + 纯整数化”

**Decision**：

- Dirty Pattern 的 canonical key 定义为：将事务 dirty roots 先按 009 规则归一化（列表索引不进入 root），再去冗余（父根覆盖子根），再排序，最后映射为 `FieldPathId[]`（整数集合）。
- key 的对外可序列化形态用 `ReadonlyArray<number>` 表达（仅做证据/解释）；运行期可用 `Int32Array`/bitset 做更紧凑的内存布局。
- 列表/动态行写入统一做索引归一化（例如 `items[0].value` 与 `items[1].value` → 同一 root），允许 over-execution 作为降低 pattern 基数的 trade-off，但必须守住 `auto <= full * 1.05` 的下界门槛。

**Rationale**：

- key 必须极廉价，否则“判断能不能快”的过程本身会变成新瓶颈。
- 列表索引天然不稳定；以索引参与 key 会导致 pattern 基数爆炸，缓存不可控。

**Alternatives considered**：

- 使用字符串拼接作为 key：拒绝（GC/哈希成本高，且难以做稳定 canonicalization）。
- 完全索引敏感的 pattern：暂缓（需要 rowId/affectedKeys 等更强证据链，复杂度与成本不匹配本特性的“下界优先”目标）。

## Decision 3：Execution Plan Cache 以“per-module-instance LRU + 上界 + 自保护”为标准形态

**Decision**：

- Execution Plan Cache 的作用域必须为 `moduleId + instanceId + Cache Generation`；不得跨模块/跨实例共享条目。
- 缓存策略采用 LRU（或等价可解释策略），必须具备容量上界、逐出统计、命中/未命中统计，并在低命中率场景触发自我保护（缩小缓存/禁用复用/优先回退 full）。
- cache-hit 路径必须复用 Execution Plan（不得再做任何与 steps 规模线性相关的扫描）。

**Rationale**：

- “无视场景也及格”意味着：缓存既要带来收益，也要在对抗性场景下不放大风险；资源上界与自我保护是刹车片本身。

**Alternatives considered**：

- 无上界的 Map 缓存：拒绝（长期运行下内存不可控）。
- 跨实例共享缓存：拒绝（污染与失效语义复杂，且违背实例隔离与可解释性）。

## Decision 4：Auto 决策器是“full 下界 + 冷启动保底 + 决策预算止损”的组合

**Decision**：

- 未显式配置时 `traitConvergeMode` 默认 `auto`，模块级可覆盖回退 `full|dirty`。
- auto 的冷启动：每个 module instance 的第 1 笔事务必须 `full`（标注 `cold-start fallback`）。
- 预算拆分：执行预算沿用 `traitConvergeBudgetMs`；新增 `traitConvergeDecisionBudgetMs`（默认 0.5ms），超时立刻终止决策并回退 `full`（标注 `budget cut-off fallback`）。
- `executedMode` 枚举固定为 `full|dirty`；`auto` 只出现在 `requestedMode`；`dirtyAll` 用独立 flag/原因字段表达（避免把 `dirtyAll` 混入枚举）。

**Rationale**：

- auto 的第一性目标是“下界可证明”，不是“平均更快”；预算止损与冷启动保底是可证明下界的必要条件。

**Alternatives considered**：

- 决策与执行共用一个 budget：拒绝（决策可能成为新热路径，且难以在诊断与测试中区分责任）。
- 让 `executedMode` 出现 `auto`：拒绝（对外语义不稳定，难以做基线对比与解释）。

## Decision 5：Cache Generation 采用“整体失效 + 抖动自保”，触发源必须有限枚举且可观测

**Decision**：

- Converge Static IR 与 Execution Plan Cache 与 `Cache Generation` 绑定：generation++ 时整体失效并重建。
- generation++ 的触发源必须枚举为有限集合（例如 writers/依赖图结构变化、逻辑安装/卸载、imports scope 变化等），并在事务摘要中输出最小证据（`generation`、`lastBumpReason`、`generationBumpCount` 等）。
- 若 generation 高频抖动导致缓存“刚热身就失效”，必须触发自我保护（优先回退 `full` 或暂时禁用复用），且行为可解释、可观测。

**Rationale**：

- 增量/分层失效虽然更“聪明”，但会显著放大实现复杂度与错误面；本特性优先保证正确性与下界门槛，并用抖动自保遏制“全量失效过频”的负优化。

**Alternatives considered**：

- 增量失效（按子图/局部 generation）：暂缓（需要更复杂的依赖版本管理与正确性证明，适合后续迭代再引入）。

## Decision 6：对外证据以 009/014 为锚点，converge 作为“事件扩展 schema”交付

**Decision**：

- 统一最小 IR 的稳定锚点沿用 009：`instanceId/txnSeq/opSeq/eventSeq`；013 只新增 converge 相关证据字段，不改变锚点模型。
- 对外协议以 `specs/013-auto-converge-planner/contracts/*` 固化，并复用 009 的 schema（以引用为主，不复制）。
- converge 的决策/缓存/失效/止损证据以 “DynamicTrace event 扩展 schema” 交付：定义一个 `kind="trait:converge"` 的事件，其 `data` 为可序列化、Slim 的 ConvergeDecisionSummary（light/full 下字段可裁剪，off 下不得保留任何额外数据）。
- 性能门槛与回归主跑道复用 014：`auto/full ≤ 1.05` 作为可执行断言；并在 014 报告中输出 cache hit/miss/evict、generation bump、budget cut-off、`staticIrBuildDurationMs` 等最小证据字段。

**Rationale**：

- 009 的 TxnMeta schema 采用 `additionalProperties: false`，不适合作为“任意扩展”的容器；以事件 schema 扩展可以复用 009 的 DynamicTrace 形态并保持消费者对齐。

**Alternatives considered**：

- 直接扩展 009 的 TxnMeta schema：暂缓（会引入跨 spec 的破坏性改动与迁移成本；如未来需要，可在更高层引入显式 `extensions` 容器再统一升级）。

## Decision 7：决策路径纯同步性必须有 CI 约束门（不靠自觉）

**Decision**：

- auto 决策路径禁止 `Promise` 与 `Effect.async/Effect.promise/Effect.tryPromise` 等异步边界，必须提供可执行断言（单测或静态扫描）作为 CI 门禁。

**Rationale**：

- “事务窗口禁止 IO/await”是运行时契约；一旦决策路径引入 async，预算与下界将不可证明，且会造成不可预测卡顿。

**Alternatives considered**：

- 仅靠 code review 保证：拒绝（无法规模化，且容易在重构中被误引入）。

## Decision 8：Static IR 构建耗时必须被量化；若显著则提供分片/Worker 预案

**Decision**：

- 在 014 的浏览器基线中记录 `staticIrBuildDurationMs`（p50/p95），并把它纳入可对比报告。
- 若大 steps 场景下 p95 超出 014 的体验预算档位，plan 必须提供可验证预案：分片构建（idle slice）、Worker 预计算、或明确“首次加载阻塞可接受范围”与降级策略。

**Rationale**：

- build 阶段的 `O(V+E)` 只做一次也可能造成掉帧；必须用证据而非猜测决定是否需要更激进的工程化手段。

**Alternatives considered**：

- 不测量直接上 Worker：暂缓（工程成本高，先用证据决定是否必要）。

## Decision 9：SSoT 对齐与迁移必须作为 013 的交付物（避免规范漂移）

**Decision**：

- 同步更新 Runtime SSoT：`docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.md` 补齐 `traitConvergeMode=auto` 的语义口径（requested vs executed、下界门槛、决策预算止损、cache 证据与失效/自保护）。
- 同步更新 Debug 协议 SSoT：`docs/ssot/runtime/logix-core/observability/09-debugging.md` 固化 converge 的最小证据形态（推荐以 `trait:converge` 事件/summary schema 表达），并对齐 `off|light|full` 分档裁剪规则。
- 同步更新用户文档：`apps/docs/content/docs/**` 补齐默认 `auto`、模块级覆盖/回退、以及“如何用证据字段定位回归与调参”的稳定心智模型。
- 标注/更新历史 spec 口径：`specs/007-unify-trait-system/review.md` 等仍以 `full|dirty` 默认与枚举为主的描述，需明确被 013 更新/替代的范围，避免读者误用。
- 明确迁移口径：若业务需要维持旧行为，显式设置 `traitConvergeMode="full"`；迁移说明写入 `specs/013-auto-converge-planner/quickstart.md` 与对应文档章节（不提供兼容层）。

**Rationale**：

- 013 的改动会同时触及：默认值、枚举约束、诊断事件 schema 与性能基线口径；若不把 SSoT 与用户文档作为交付物，会导致“实现/规范/文档”三方漂移，最终演进只能靠补丁兜底而不可持续。

**Alternatives considered**：

- 仅更新实现不更新 SSoT/用户文档：拒绝（会立刻制造新的冲突面，且迁移与排障口径不可控）。

## Decision 10：Cache Generation 必须用 GenerationScope 表达（Scope 关闭 = 代际回收）

**Decision**：

- `Cache Generation` 不是一个仅靠数字递增的状态机，而是一个由 effect `Scope` 托管的资源边界（GenerationScope）。
- generation bump 的语义定义为：**关闭旧 GenerationScope（释放其下所有资源）→ 创建并安装新 GenerationScope**；Cache/IR 等资源必须绑定到当前 GenerationScope（使用 `Effect.acquireRelease` / finalizer 体系），避免手动 clear 漏洞。
- 对外证据仍保持为轻量字段（`generation`/`bumpCount`/`lastBumpReason` 等）；Scope 仅作为内部实现机制，不进入对外协议。

**Rationale**：

- 013 的 Planner/Cache 属于“必须永不泄漏”的基础设施：Scope 关闭语义天然适配“代际失效”，避免多处手写 bump/clear 导致的遗忘与互相绕过。
- 把回收语义交给 effect 的资源模型，可以把正确性约束从“约定”提升为“运行时保证”，同时减少额外状态机分支。

**Alternatives considered**：

- 仅用 `generation: number` + 手动 `cache.clear()`：拒绝（容易遗漏；新增资源点会持续扩大清理面）。
- 每个缓存点单独维护 finalizer：拒绝（分散且不可审计；更适合由 GenerationScope 统一聚合）。

## Decision 11：覆盖配置必须以 Tag/Layer 表达（Config as Service + `configScope` 证据）

**Decision**：

- converge 的有效配置解析以 DI 为载体：Provider 范围通过 `Tag/Layer` 注入差量 override（例如 `StateTransactionOverridesTag`），Runtime 侧可同时支持 `moduleId` 维度覆盖与 default 配置。
- 配置解析优先级固定为：`provider > runtime_module > runtime_default > builtin`，并要求每次事务的 converge 证据中输出 `configScope`（与 `trait-converge-data.schema.json` 一致）。
- 规划阶段明确拒绝“手写查表 Map + if/else 拼装”：该形态只能作为过渡实现存在，不应成为对外心智模型与长期 SSOT。

**Rationale**：

- Layer 的嵌套天然表达“更局部赢”（`RuntimeProvider.layer` 子树覆盖），避免把覆盖能力固化成 Runtime 对象上的 ad-hoc Map。
- `configScope` 是可解释链路的一部分：它直接回答“这次为什么这样跑”与“我该去哪改配置”。

**Alternatives considered**：

- `overridesByModuleId: Map` + runtime 内查表：拒绝（可组合性差，且容易制造“Provider 覆盖 vs runtime 覆盖”双语义源）。

## Decision 12：锚点与上下文透传优先用 FiberRef（减少推断与兼容补齐）

**Decision**：

- 规划引入一条“稳定上下文字段总线”：使用 `FiberRef` 承载最小锚点集合（例如 `instanceId/txnSeq/opSeq/configScope`），让 DebugSink/trace/effectop 等链路无需到处显式传参或依赖“第二锚点字段”反推。
- 对外协议（005/009/013/011）以 `instanceId` 为主锚点；禁止出现“第二锚点字段”，不得成为导出/证据包的主键。

**Rationale**：

- 当前“第二锚点字段 → instanceId”的兼容补齐会扩散到 DebugSink/DevtoolsHub/React onError 等多个点；用 FiberRef 把锚点注入变成“单点机制”，减少协议侧推断与 drift 面。

**Alternatives considered**：

- 继续通过“第二锚点字段”补齐 `instanceId`：拒绝（会持续制造双真相源，并让协议整改成本跨 feature 累积）。
