# Research: 068 Watcher 纯赚性能优化（全量交付）

**Date**: 2025-12-31  
**Spec**: `specs/068-watcher-pure-wins/spec.md`  
**Plan**: `specs/068-watcher-pure-wins/plan.md`

本 research 聚焦把关键取舍“拍死”为可执行设计决策：每条决策都必须能回到 `spec.md` 的 FR/NFR/SC 做验收，并能被 perf evidence/回归用例覆盖。

## Decision 1: Action 分发改为 tag topic-index（减少无关触达）

**Decision**:

- 为 tag 形态 watcher（例如 `$.onAction("submit")`）提供按 tag 分发的专用源流（topic），默认不再订阅全量 `actions$` 再 filter。
- 对 predicate / Schema 形态 watcher（例如 `$.onAction((a) => ...)`、`$.onAction(schema)`）保持全量流订阅（除非未来能静态分析）。

**Rationale**:

- 直接减少无关订阅者：减少 publish fan-out 成本与无意义 filter 判定成本。
- 缩小背压传播面：慢 watcher 的背压只影响其订阅的 topic，而不是影响所有 tag watcher。
- 不改变业务语义：相关 watcher 仍然 lossless 接收该 tag 的 action；只是减少“无关触达”。

**Alternatives considered**:

- 继续全量广播 + 下游 filter：实现简单但在大规模 watcher 下容易形成系统性放大（本 spec 的痛点）。
- 试图静态分析 predicate：理论上可行但成本与风险更高，且容易形成“不可解释的隐式优化/退化”。

## Decision 2: `$.onState` 接入 ReadQuery/SelectorGraph（声明依赖→增量通知）

**Decision**:

- `$.onState(selector)` 默认通过 ReadQuery 编译/封装为 `ReadQueryCompiled`：
  - 能进入 `static lane` 的 selector：走 SelectorGraph（基于 dirtySet 精准重算/精准通知）。
  - 进入 `dynamic lane` 的 selector：安全回退为逐 commit 重算（保守正确）。
- 对 “dynamic lane 回退” 提供可配置的严格门禁（warn/error），用于避免在关键模块里悄悄退化。

**Rationale**:

- 让 “提交与依赖无交集” 成为可跳过路径：把通知复杂度从“总订阅数”更接近收敛到“受影响订阅数”。
- 与 React external store 订阅模型对齐：React 侧已使用 `changesReadQueryWithMeta`，在 runtime 层把路径统一为单一事实源，减少语义漂移。

**Alternatives considered**:

- 只在 React 层使用 SelectorGraph，watcher 仍走 `Stream.changes`：会导致“同一 selector 在 UI 与 watcher 行为不同”，难以解释且不利于长期治理。
- 强制所有 selector 必须静态可编译：过于激进；本阶段以“可诊断的降级/门禁”替代硬失败。

## Decision 3: watcher 压力回归用例先行（防泄漏/防灾难退化）

**Decision**:

- 在 core（以及必要时 browser perf boundary）新增可回归的 watcher 压力用例：
  - 单模块：高频 dispatch + 大量 watcher（混合 tag watcher 与 predicate watcher）。
  - 多模块：跨模块订阅 + 销毁/回收，确保无幽灵订阅与事件外溢。
- 资源指标采用“足够判定泄漏”的最小近似（计数器/事件抽样），并保证默认档位近零成本。

**Rationale**:

- watcher 相关退化往往是“慢慢变坏”，没有回归门禁会在真实仓库才爆炸。
- 本 spec 的交付标准依赖长期稳定性（SC-001），必须具备自动化回归防线。

**Alternatives considered**:

- 只靠人工 perf 测试：不可复用、不可判定，且容易被环境噪声掩盖。

## Decision 4: Primary Reducer 继续作为高频主路径的推荐解法

**Decision**:

- 将 “主状态转移” 明确作为非 watcher 的同步主路径；watcher 仅承担联动/副作用。
- 在文档与回归用例中把该分层作为“优化梯子”的首选台阶（先减少 watcher 主路径负担，再谈传播优化）。

**Rationale**:

- 直接减少 watcher 数与事务内调度成本，是最可预期且最稳定的纯赚手段。
- 为后续传播 IR/编译化提供更清晰的职责边界（主路径纯函数 vs 联动 Effect）。

**Alternatives considered**:

- 继续把 reducer 写成 watcher：会把最敏感的主路径锁死在 Stream/Fiber 模型上，长期不利。

## Decision 5: 传播 IR 与闭包分型只在本 spec 固化契约/证据口径

**Decision**:

- 本 spec 只定义：
  - 传播 IR 的最小可序列化表结构契约（字段、稳定 id、导出方式与禁用时的零成本口径）。
  - 闭包分型（可编译/可批处理/不可分析）的裁决口径与降级/门禁的可解释原因码。
- 不在本 spec 里交付“新的执行后端”或“完整编译器”。

**Rationale**:

- 传播 IR/闭包分型是长期治理基础设施：先锁死契约与证据口径，才能避免并行真相源与负优化。

**Alternatives considered**:

- 直接推进后端/编译器：范围过大，且很难在短期内证明“不负优化”；更适合作为后续独立 spec 的实现阶段。

## Decision 6: 编译期优化是可选增强，必须可回退（宁可放过不可错杀）

**Decision**:

- 编译期优化（例如通过构建工具插件提供的 AOT/静态化产物）必须是可选增强：不配置/不启用时，运行时仍能正确工作且语义一致。
- 当显式启用编译期优化时，优化必须保守正确：只在能证明语义等价的子集上生效；遇到不确定/不可分析场景一律回退到运行时保守路径。
- 回退/降级必须可解释：提供稳定原因码与最小诊断锚点，避免“黑盒退化”。

**Rationale**:

- 编译器优化属于“锦上添花”，不能把 DX/可用性建立在某个构建期插件之上。
- 一旦出现误优化，后果是最难排查的语义偏差；因此宁可放过不可错杀，先把“可证据化的安全回退”做成底座。

**Alternatives considered**:

- 强依赖编译器/插件：会把运行时的使用门槛与可复现性绑定到构建系统，不利于 PoC/对照与极简场景。
- 进取式编译（宁可错杀）：短期可能更快，但会引入不可控的语义风险与长期维护成本，且违背“证据优先/可解释”原则。

## Risk Register

- **R1: 背压语义误用**：如果把所有 action 分发都做成独立 topic，可能引入隐藏的资源开销（topic 数爆炸）。缓解：topic 仅为 “tag 字面量” 形态按需创建，并可回收。
- **R2: selectorId 冲突**：不同 equals 语义/reads 组合若共享 selectorId，会导致 SelectorGraph 复用错误。缓解：selectorId 必须与 lane/reads/equalsKind 一致且稳定。
- **R3: dirtyAll 退化常态化**：如果大量写入都只产出 dirtyAll，将抵消 SelectorGraph 的增量收益。缓解：把字段级 patchPaths/dirtySet 作为治理目标，并提供诊断证据与优化梯子。
- **R4: 编译产物漂移/过期**：静态化产物与运行时语义或源码不匹配可能导致误优化。缓解：产物作为“可选 hint”而非硬依赖；不一致时回退，并在严格门禁下可 fail fast。
