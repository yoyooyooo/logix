# Research: 事务性能控制（关键裁决与证据）

**Feature**: `specs/019-txn-perf-controls/spec.md`  
**Plan**: `specs/019-txn-perf-controls/plan.md`  
**Created**: 2025-12-20

本文件用于把关键未知项收敛为可执行裁决（Decision/Rationale/Alternatives），并将证据落点绑定到 `contracts/*`、诊断字段与基线脚本，避免“实现先跑偏、文档后补”的事实源漂移。

## Decision 1: 不引入“跨事务默认 Batch Commit”，只做显式 opt-in

**Decision**  
默认模式保持既有语义：每个逻辑入口通过 `txnQueue` 串行化，并在同步事务窗口内聚合写入，窗口结束最多产生一次可观察提交（订阅通知 + `state:update`）。不新增“跨事务自动合并提交”。  
批处理（Batch Window）与低优先级（Low Priority）均为显式 opt-in，且必须可诊断解释。

**Rationale**  
- 跨事务合并会引入新的可见性语义（延迟、顺序、最终一致、取消/覆盖），会把“性能策略”变成“默认语义”，破坏可解释性与可预测性。  
- 现有事务模型已经具备“单事务内部自动批处理”（0/1 commit），ROI 更高的缺口在于 dirty-set 信息质量与同步反应是否真正留在事务窗口内，而不是再叠一层跨事务策略。  
- 显式 opt-in 能让极端场景具备确定性，同时避免默认路径变复杂，符合宪章“自动策略保守可解释”。

**Alternatives considered**  
1) **默认跨事务 debounce 合并**：可以减少通知，但改变默认一致性/时序语义，且难以给出普适的延迟上界与取消规则。  
2) **按阈值自动进入 batch**：需要自动策略与配置层，且阈值选择很容易与业务场景冲突；更适合作为后续 tuning-lab 的建议而非默认行为。

## Decision 2: Dirty-Set 生成必须是 O(写入量)；未知写入显式降级 dirtyAll 并给原因

**Decision**  
dirty-set 的来源必须来自“写入发生时就能拿到的证据”，例如 reducer/更新操作本身记录的 patch/fieldPath，而不是在 commit 时对整个 state 深 diff。  
当某条写入无法提供字段级信息时，必须显式标记 `dirtyAll=true`（或等价结构），并在诊断中给出 `dirtyAllReason`（例如 UnknownWrite/CustomMutation/NonTrackablePatch），禁止把 `path="*"` 作为常态。

**Rationale**  
- 宪章硬约束：dirty-set 生成 MUST O(写入量)，不得在生产热路径默认深 diff。  
- converge/validate 的增量化依赖 dirty-set 的“信息质量”；不稳定或过粗的 dirty-set 会使所有优化退化为全量。  
- 显式 dirtyAll + 原因能把“无法追踪”变成可行动的反模式提示（指导业务迁移到可追踪写法），也能给 devtools/基线提供可解释证据。
- 对“普通 reducer 返回新对象”这类写入，运行时无法在不做 diff 的前提下推导字段级影响域：因此必须确定性降级 dirtyAll，并推动迁移到 `Reducer.mutate/$.state.mutate` 等可追踪写法。

**Alternatives considered**  
1) **commit 时兜底深 diff**：性能不可控，且会把不可追踪写法掩盖成“看似可用”。  
2) **把未知写入静默当作 full converge**：没有证据口径，难以定位回退原因，也无法指导迁移。

## Decision 3: 同步反应尽量合并在同一事务窗口；违反事务边界必须可诊断

**Decision**  
同步派生（converge）与同步校验（validate）在默认路径上属于“提交前派生闭包”，应尽量在同一事务窗口内完成，并在窗口结束统一 commit。  
任何在事务窗口内引入 IO/await/异步边界的行为视为违规：必须在诊断中暴露，并提供替代路径（事务外 IO → 独立写回事务）。

**Rationale**  
- 事务次数是 converge/validate 频率与 UI render 次数的上界；把同步反应内聚到单事务是减少频率的最高 ROI。  
- 事务内禁止 IO 是宪章硬约束；如果不诊断违规，系统会出现“偶发卡顿/不可复现”的性能问题。

**Alternatives considered**  
1) **允许事务内 await**：会使事务窗口不可预测，破坏“同步窗口”定义；同时引入竞态与可见性问题。  
2) **把 converge/validate 拆成异步任务**：可以解耦但会增加提交次数并引入 tearing 风险；更适合作为显式低优先级策略，而非默认路径。

## Decision 4: Batch Window 与 Low Priority 只影响“可见性调度”，不改变最终状态语义

**Decision**  
- Batch Window：显式开启一个短时同步窗口，在窗口内多次写入对外只产生一次可观察提交；窗口内仍遵守“无 IO/无 await”。  
- Low Priority：显式标记某些更新为“可延迟/可合并”的可见性调度，目标是减少 React render 压力；但必须保证最终必达、不得逆序覆盖高优先级结果，并提供最大延迟上界（配置项）。  
Low Priority 优先作为消费层（`@logix/react` 外部订阅通知）策略落地，避免改动核心状态语义。

**Rationale**  
- 用户诉求是“规避非必要 render/极端可控降级”，这更贴近订阅通知调度而非状态提交语义。  
- 将低优先级下沉到 core 容易牵涉事务排序、写冲突与回放语义，风险/复杂度更高；把它作为可见性层可控且更易解释。  
- Batch Window 作为“同步合并”的显式入口，边界清晰，易于与宪章约束对齐。

**Alternatives considered**  
1) **在 core 引入优先级队列**：需要重新定义事务队列公平性与一致性语义，诊断与回放协议也会变重。  
2) **把 low priority 变成自动策略**：难以解释与调参，违背“保守可解释”。

## Decision 5: 诊断协议以 contracts/schema 为单一事实源，且默认 off 近零成本

**Decision**  
本特性新增/扩展的诊断字段与事件，必须以 `specs/019-txn-perf-controls/contracts/*` 定义为裁决基线，并与 009/013 兼容（扩展而非并行真相源）。  
诊断关闭（`diagnostics=off`）时，禁止为生成诊断字段引入默认 O(n) 扫描或大对象构造；必要时采用“分级采样/轻重载荷”模式。

**Rationale**  
- 宪章要求“诊断 Slim 且可序列化、off 近零成本”，否则会把诊断变成性能问题本身。  
- contracts-first 能保证 devtools/sandbox/platform 对齐，避免协议漂移。

**Alternatives considered**  
1) **先在代码里加字段，后补 schema**：极易漂移（字段命名、可选性、序列化边界）。  
2) **把重载荷默认打开**：会让生产不可用或导致误报的性能回退。

## Decision 6: 性能基线优先复用现有脚本体系，必要处新增 019 专用基线

**Decision**  
测量与回归证据优先复用 `logix-perf-evidence` 现有体系（统一入口：`pnpm perf`）：  
- 009 dirty-set 基线：`pnpm perf bench:009:txn-dirtyset`  
- 016 诊断开销：`pnpm perf bench:016:diagnostics-overhead`  
- 浏览器侧边界：`pnpm perf collect` / `pnpm perf diff`  
当本特性需要“同步反应合并/低优先级通知调度”的专用指标时，再新增或扩展一条 019 基线脚本，并把数据口径写入 `tasks.md` 的验收项。

**Rationale**  
- 复用既有脚本能保证口径一致，减少“基线碎片化”。  
- 019 新增基线必须紧贴本特性的新增语义（合并次数、通知批次、延迟上界），避免为测量而测量。

**Alternatives considered**  
1) **完全新建一套基线体系**：口径漂移风险高，维护成本大。  
2) **不做基线只靠体感**：违背宪章硬约束。
