# Research: Trait Derived Converge Perf & Diagnostics Hardening

**Feature**: `specs/039-trait-converge-int-exec-evidence/spec.md`  
**Date**: 2025-12-26

## Decision 1: 使用 `mutative` 的 draft + finalize，替代“每 step 一次 create”

**Decision**: 在一次 converge 执行内，使用 `mutative.create(base)` 返回的 `[draft, finalize]` 形态创建单一草稿，step 直接写 draft；成功完成后调用 `finalize()` 得到最终不可变状态；遇到预算/错误降级时丢弃 finalize 结果并回退 base。

**Rationale**:

- 允许后续 step 读取到前序 step 的更新（保持 topo 语义），同时避免“每 step create”带来的重复结构复制与 GC 压力。
- 与既有“回退 base 避免半成品提交”的降级策略相容：草稿是局部对象，丢弃即可，不影响外部订阅可见性。

**Compatibility/Verification**:

- 当前依赖 `mutative@^1.0.4`（以 workspace 的 `package.json` 与 lock 为准），并用一个最小用例验证 `create(base)` 返回的 `[draft, finalize]` 行为在 Node 与 headless browser 宿主上一致（包含：读到前序 step 写入、finalize 输出确定性、丢弃 draft 不影响外部可见状态）。
- 若验证失败或收益不显著，允许回退到“每 step create”的实现作为保守路径，但必须在基线证据与诊断里可解释。

**Alternatives considered**:

- 每 step `create(current, ...)`（现状）：实现简单，但会产生大量短命对象与重复 path 解析。
- 手写结构共享更新器：复杂度高，容易引入语义/边界 bug（尤其路径穿透与对象形状）。
- 引入“slot/stateStore”扁平化存储：会改变对外/对内编程模型，是新概念，超出本特性边界。

## Decision 2: Exec IR 作为 internal 加速层（整型打穿到执行）

**Decision**: 在现有 `ConvergeStaticIrRegistry` 之上新增 internal 的 Exec IR（SoA + TypedArray），用于执行热路径直接用 `pathId/stepId` 驱动 get/set 与 dirty 判定，不再在执行时 `split('.')`。

**Rationale**:

- 现状的“整型化”已覆盖决策/计划层（`FieldPathId/topoOrder/planStepIds`），但执行层仍有字符串解析与对象遍历分配；Exec IR 可以把这段成本下沉到 build/缓存层。
- Exec IR 不改变对外契约：仍以 `trait:converge` 的证据字段与稳定标识作为事实源。

**Alternatives considered**:

- 只做局部优化（缓存 `path.split` 结果）：收益不够且易产生隐式缓存一致性问题。
- 直接把 computed 逻辑编译成 VM 指令：会引入新的用户编程模型边界与解释成本（且可能与 V8 JIT 冲突），本特性不做。

## Decision 3: dirtyPrefixSet 升级为 bitset，并预计算 prefix-id 列表

**Decision**: 将执行过程中的 `dirtyPrefixSet` 从 `Set<number>` 升级为 bitset（TypedArray），并在 IR 构建阶段预计算“pathId → prefixIds”列表，避免运行时 trie `Map` 查找。

**Rationale**:

- dirty 判定在每次 converge 中会被频繁调用；bitset + 顺序扫描在 CPU cache 友好、无分配且可预测。
- 仍保留现有“触发后把 out path 的 prefix 加入 dirty 集合”的语义，确保依赖传播不丢失。

**Notes**:

- 本仓的 `FieldPathIdRegistry` 是按表顺序 0..N-1 分配（稠密 id），不存在“id 极度稀疏导致 bitset 浪费”的典型问题；bitset 的内存上界与 `fieldPathCount` 线性相关，应在基线中量化并设定降级阈值。

**Alternatives considered**:

- 保持 Set：实现简单但分配与哈希开销明显，且容易放大长尾。
- 每次从字符串 dirtyPaths 重建 trie：违反“事务窗口禁止重活”的约束。

## Decision 4: 证据与协议不另起炉灶，复用 013 的 converge schema

**Decision**: `trait:converge` 的事件契约继续以 `specs/013-auto-converge-planner/contracts/` 为单一事实源；本特性默认不修改 shape，只优化产出成本与必要时的字段裁剪（light/full 由 `DebugSink` 控制）。

**Rationale**:

- 避免并行真相源漂移；并确保 Devtools/Alignment Lab 继续按同一套 schema 消费证据。

**Alternatives considered**:

- 在 039 下复制一份 schema：会造成长期漂移与双维护成本（禁止）。

## Decision 5: 性能基线产物落点与口径

**Decision**:

- 以 Node runner 作为 converge 专项基线的高频迭代跑道，并将 Before/After/Diff 证据固化到 `specs/039-trait-converge-int-exec-evidence/perf/*`；
- 同时确保至少 1 个自动化 headless browser run 作为基线维度（复用 `$logix-perf-evidence` 的 collect/diff + matrix 口径），用于覆盖宿主特定的 JIT/GC 差异与观察者效应边界。

**Rationale**:

- Node runner 便于高频迭代与定位微观开销；browser run 用于捕获宿主差异（JIT/GC/Object Shapes 等）与真实前端运行边界，避免“只在 Node 优化有效”的偏差。

**Alternatives considered**:

- 只做 browser：迭代周期长且定位困难。
- 只做 microbench 不落盘：无法形成回归防线（禁止）。

## Decision 6: Plan Cache 与 Exec IR 的生命周期分离（避免泄漏）

**Decision**:

- `ConvergePlanCache` 保持为 per-module-instance 的轻量 LRU（仅缓存 `planStepIds`），并沿用现有的容量上界与低命中率保护策略。
- Exec IR（访问器表、bitset/prefix 索引等）必须按 “program generation” 管理生命周期：挂在 `program.convergeIr` 或等价的 per-instance 容器上，generation bump 时严格失效，禁止做 process-global Map 缓存。

**Rationale**:

- 避免短生命周期模块/实例被长生命周期缓存捕获，导致内存泄漏或跨实例串扰。
- 把“重对象”（Exec IR）与“热缓存”（planStepIds）分离，便于分别做容量/失效/证据解释。

**Alternatives considered**:

- 把 Exec IR 放进 plan cache：会放大缓存体积与泄漏风险，且命中粒度不匹配（plan cache 的 key 是 dirty roots pattern，不是 generation/结构）。

## Decision 7: Dirty ingress 在 txn 内可选维护 `DirtyRootIds`（整型化入口，保证可回退）

**Decision**:

- 事务内继续允许以 `dirtyPaths:Set<string>` 作为保守事实源；同时在可用时（提供 `FieldPathIdRegistry`）在 txn 内**可选**增量维护 `DirtyRootIds`（`dirtyAll/reason/rootIds/keyHash`）。
- 一旦出现不可追踪写入或不可映射 path（包含：非 trackable patch、id registry 缺失、或任一 root 无法映射）立刻降级为 `dirtyAll=true`（reason 取 `nonTrackablePatch/fallbackPolicy/unknownWrite/customMutation`），并停止本窗口的 rootIds 维护，确保不会在错误/缺口上“假精确”。
- commit 阶段允许复用 canonical roots（rootIds → fieldPaths → join）快速 materialize `dirtySet.paths`，避免二次 normalize/canonicalize；无法保证完整性时回退现有 `dirtyPathsToDirtySet`。

**Rationale**:

- dirty 信息在同一窗口会被 converge 决策与 commit/观测多次消费；把入口整型化可同时减少 `split('.')`、sort/canonicalize 与中间数组分配，尤其对浏览器 p95/抖动更敏感。
- “可选维护 + 明确降级原因”能把负优化风险收敛为可观测的开关与可解释的回退，而不是静默变慢。

**Alternatives considered**:

- 只在 converge 入口做一次 `dirtyPathsToRootIds`：仍保留 mutative `pathAsArray → join('.') → Set<string>` 的分配热点，且 commit 仍要二次 parse。
- 一步到位把 StateTransaction 的通用 patch/dirty 全面迁移为 pathId：影响面过大（工具/协议/Devtools），不符合本特性“先打通 converge 链路”的边界。

## Decision 8: `pathAsArray` 源头不做字符串往返（只在需要序列化时 materialize）

**Decision**:

- 在 txn instrumentation=light 或 diagnostics=off 的默认口径下，mutative patches 使用 `pathAsArray` 直接归一化为 FieldPath segments 并映射为 FieldPathId roots，不为 dirty-set 目的 materialize path string（不 `join('.')/split('.')`）。
- 仅在 txn instrumentation=full（需要完整 patch 序列/调试展示）时才生成 path string，并保持现有 `StatePatch.path:string`/Devtools 投影不变。

**Rationale**:

- `join('.')/split('.')` 的“字符串往返”会在高频 mutate 场景中放大分配与 GC；把这段成本下沉到 “必要时才 materialize” 是典型的纯赚优化（off/light 档位收益最大）。

**Alternatives considered**:

- 继续在源头 join：实现简单但在浏览器宿主上更容易造成长尾抖动与 p95 退化。
- 只做 string split 的 memoize：缓存一致性与生命周期复杂，且可能在多实例下引入隐式泄漏/串扰风险。

## Decision 9: 复用 TypedArray 资产，消除每窗口的重复分配（纯赚）

**Decision**:

- 将一些“每次 converge 必然分配但可复用”的整型资产变为 generation 级只读缓存：例如 full/dirtyAll 分支的 `topoOrderInt32`（替代 `Int32Array.from(ir.topoOrder)`）、以及 planner 生成 plan 时尽量避免 `number[] → Int32Array.from(plan)` 的二次拷贝（可用预分配 Int32Array builder 或复用 scratch buffer）。

**Rationale**:

- 这些分配与业务语义无关，且在高频窗口中会稳定叠加到 p95 与 GC；用“只读复用”替代“每窗口重建”属于典型纯赚优化。

**Risks / Mitigations**:

- TypedArray 复用要求严格只读：任何可能修改 plan 的路径都必须明确拷贝或改为返回新的 buffer；并在测试中覆盖“plan cache 命中/未命中/dirtyAll/full”四象限，防止共享数组被意外写坏。
