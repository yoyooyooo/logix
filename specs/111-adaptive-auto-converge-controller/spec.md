# Feature Specification: Adaptive Auto-Converge Controller

**Feature Branch**: `111-adaptive-auto-converge-controller`  
**Created**: 2026-03-27  
**Status**: Active  
**Input**: 用户明确提出：当前 `converge-in-transaction.impl.ts` 中的静态阈值长期维护成本很高，随着 runtime、graph 规模、browser 相位和代码演进会不断漂移，因此需要把 “adaptive auto-converge controller” 单独作为一个长期需求展开分析规划。

## Background

当前 auto/full/dirty 决策里有多处静态 heuristic：

- `getNearFullRootRatioThreshold(stepCount)`
- `AUTO_FLOOR_RATIO`
- `MAX_CACHEABLE_ROOT_RATIO`

这些静态阈值有一个共同问题：

- 要靠人工不断调小数
- 对环境、实现细节和长跑相位敏感
- 一旦核心代码变化，阈值就会漂

## Goals

1. 把 auto/full/dirty 决策升级成成本比较模型。
2. 定义最小 telemetry 与 per-band 状态。
3. 设计在线校准策略，减少人工重标定。
4. 保留 deterministic hard rules。
5. 先在 `main` 控制线语义下规划与 PoC，再决定是否 replay 到 `v4-perf`。

## Route Dependencies _(mandatory)_

- `110-main-first-perf-decomposition-and-v4-replay` 是当前 perf 主线唯一总控。`111` 只能消费 `110` 的 latest ledger、residual latest 与 current best candidate anchors。
- `111` 的 rollout 词汇直接继承 `110`：`accepted_with_evidence | provisional | discarded`、`replayReadiness`、`residualCategory`。
- `013-auto-converge-planner` 与现有 `trace:trait:converge` / `TraitConvergeDecisionSummary` 是当前 controller 证据契约 baseline。`111` 只能在其基础上增量扩展。
- `111` 的 planning、shadow、PoC 都先挂在 `main` 控制线，`v4-perf` 只承接 replay 与 residual attribution。

## Current Contract Baseline _(mandatory)_

当前实现已经具备以下 static heuristic 与证据面：

- static heuristic code anchors：
  - `getNearFullRootRatioThreshold(stepCount)`
  - `AUTO_FLOOR_RATIO`
  - `MAX_CACHEABLE_ROOT_RATIO`
- 当前 `trace:trait:converge` / `TraitConvergeDecisionSummary` 已稳定输出：
  - `requestedMode` / `executedMode`
  - `reasons`
  - `stepStats.totalSteps / affectedSteps`
  - `dirty.rootCount`
  - `cache.hit / missReason / disableReason`
  - `generation`
  - `configScope`
  - `executionDurationMs / decisionDurationMs`

因此 `111` 的目标是扩展现有 controller 策略与 evidence，不重新发明第二套 diagnostics contract。

## Shadow Code PoC Gate _(mandatory)_

`111` 进入 shadow-only code PoC 前，至少满足：

1. `110` 的 decision ledger 与 residual latest 已更新；
2. 当前 entry decision 至少达到 `inconclusive_after_clean_scout`；
3. cheap local 的 static heuristic 漂移盘点已经完成；
4. 第一刀必须是 telemetry-only / shadow，不得直接改 live decision，且 live `executedMode` 保持原样。

## Live Candidate Gate _(mandatory)_

`111` 若要从 shadow-only 前进到 live candidate，至少满足：

1. shadow-only cheap local gate 已完成；
2. shadow-only heavier local gate 已完成；
3. future residual refresh 仍稳定指向 `controller_related`；
4. shadow telemetry 继续保持 additive，不引入新的 live decision 语义。

## Current Readiness _(mandatory)_

- current readiness: `planning_active`
- implementation readiness: `shadow_code_poc_ready`
- current blockers:
  - 最新 residual refresh 结果仍是 `inconclusive_after_clean_scout`
  - 当前没有新证据把 route classification 推到 `controller_related`
  - `2026-03-30` `#146/#148` 两条 non-React fanout shell 线都已进入 `main`，但仍由 `110` 吸收裁决，未产生新的 controller signal
  - `2026-03-30` `#151` 的 latest-main quick identify 已把下一刀收窄到 `dispatch` 专属入口壳，仍未形成新的 controller signal
- immediate allowed actions:
  - 以 cutdown v2 作为当前 `shadow_local_recovery_candidate`
  - 继续把 `110` 的 latest merged-mainline 事实同步回 `111`，但不重开 live-candidate 讨论
  - 只在出现新的 `controller_related` 证据后再重开 live-candidate 讨论
- immediate forbidden actions:
  - 直接进入 live candidate
  - 直接把 shadow proxy 字段误读成 final controller cost model
  - 把 `TX-C1 local_closeout_ready` 误读成 `111` 已解锁

## Current Entry Decision _(mandatory)_

- current decision: `inconclusive_after_clean_scout`
- evidence source:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf/specs/103-effect-v4-forward-cutover/perf/2026-03-28-e1b-browser-longrun-capture-order-scout-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf/specs/103-effect-v4-forward-cutover/perf/2026-03-28-e1b-clean-scout-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/main.111-shadow-telemetry/specs/111-adaptive-auto-converge-controller/notes/2026-03-28-shadow-telemetry-cheap-local-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/main.111-shadow-telemetry/specs/111-adaptive-auto-converge-controller/notes/2026-03-28-shadow-telemetry-heavier-local-summary-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/main.111-shadow-telemetry/specs/111-adaptive-auto-converge-controller/notes/2026-03-28-shadow-telemetry-before-after-node-paired-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/main.111-shadow-telemetry-cutdown/specs/111-adaptive-auto-converge-controller/notes/2026-03-28-shadow-telemetry-cutdown-v2-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/main.111-shadow-telemetry-cutdown/specs/111-adaptive-auto-converge-controller/notes/2026-03-28-shadow-telemetry-promotion-gate-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf/specs/103-effect-v4-forward-cutover/perf/2026-03-28-e1-residual-refresh-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/main.longchain-identify/docs/perf/2026-03-29-post-merge-big-cut-candidates.md`
  - `/Users/yoyo/Documents/code/personal/logix/docs/perf/2026-03-30-latest-main-quick-identify-reading.md`
- meaning:
  - 当前 browser sensitivity 仍存在，但 clean scout 后已不足以单独解释整包 residual
  - 当前旧 shadow candidate 的 local regression 已由 cutdown v2 在 representative points 上清掉
  - 最新 residual refresh 仍把 route classification 留在 `inconclusive_after_clean_scout`
  - 最新 post-merge selector / commit-packet / fanout-shell 线继续由 `110` 吸收裁决，不构成 `controller_related` 证据
  - latest-main quick identify 已把下一刀收窄到 `dispatch` 专属入口壳，进一步说明当前 residual route 仍不指向 controller
  - 当前 cutdown v2 继续只保留为 `shadow_local_recovery_candidate`，仍不允许把 residual 归因推进到 controller live candidate
- re-entry trigger:
  - future residual refresh after shadow cheap/heavier local still points controller-related
- future residual refresh package:
  - execute on `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf`
  - refresh against current `E-1 effect-v4 full-longrun same-node residual route`
  - require one dated reading that explicitly classifies the refreshed route as `controller_related | not_controller_signal | inconclusive_after_clean_scout`

## Replay & Docs Sync Gate _(mandatory)_

- `111` 只有在 `main` 线上形成 live candidate 且被 `110` 记为 `accepted_with_evidence` 之后，才允许讨论 replay 到 `v4-perf`。
- 若 adaptive 字段触达现有 `trait:converge` 契约，必须先同步：
  - `specs/013-auto-converge-planner/contracts/schemas/*`
  - `docs/ssot/runtime/logix-core/observability/09-debugging.md`
  - `docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.01-module-runtime-make.md`
- 只有在 live candidate 已稳定后，才需要同步 user-facing mental model。

## User Scenarios & Testing

### User Story 1 - runtime owner 需要摆脱手调小数阈值 (Priority: P1)

作为 runtime owner，我希望 auto-converge 的决策更像比较 `full` 和 `dirty` 的成本，而不是不断手调静态 ratio。

**Why this priority**: 当前残留问题已经暴露静态阈值的维护上限。

**Independent Test**: 只阅读本 spec 与 plan，就能明确 controller 的输入、状态、输出与 fallback。

**Acceptance Scenarios**:

1. **Given** 同一模块在不同 `stepCount/dirtyRatio` 上表现差异很大，**When** controller 决策，**Then** 依据成本模型而不是单一 ratio。
2. **Given** runtime 实现变化，**When** controller 收到新 telemetry，**Then** 不需要先人工调阈值才能继续工作。

---

### User Story 2 - perf owner 需要可解释、可验证的 controller (Priority: P1)

作为 perf owner，我希望 adaptive controller 的输入、状态、输出和探索行为都可诊断、可回放。

**Why this priority**: 不可解释的 controller 会把问题从“调小数”变成“猜模型”。

**Independent Test**: 对任意一次 auto 决策，能解释它为什么选 `full` 或 `dirty`。

**Acceptance Scenarios**:

1. **Given** 一次 auto 决策，**When** 查看 summary，**Then** 能看到 `stepCount/rootCount/cacheHit/costEstimate/fallbackReason` 这类信息。
2. **Given** controller 做了探索性选择，**When** 查看 diagnostics，**Then** 能知道探索原因、频率和结果。

---

### User Story 3 - 维护者需要安全 rollout (Priority: P2)

作为维护者，我希望 adaptive controller 的 rollout 路径是安全的，不会一上来就替换现有 static heuristic。

**Why this priority**: controller 触碰 hot path 决策，必须先保证安全边界和可回退。

**Independent Test**: 方案文档能说明哪些规则始终保留 hard-coded，哪些 band 允许探索，哪些门必须先过。

**Acceptance Scenarios**:

1. **Given** `cold_start/dirty_all/unknown_write` 这类情况，**When** controller 运行，**Then** 仍由硬规则直接决定。
2. **Given** controller 尚未成熟，**When** 做 PoC，**Then** 只在 `main` 控制线实验，不直接迁移到 `v4-perf`。

## Edge Cases

- node 与 browser 的同一 band 可能表现相反
- generation thrash 会使旧统计失真
- browser long-run 相位会让单点阈值抖动
- 极小图与极大图仍需要 deterministic hard rule

## Non-Goals

- 不新起一套平行的 `trait:converge` 事件或第二 diagnostics 真相源。
- 不在 shadow 证据未稳定前直接替换 live auto decision。
- 不把 CI 当第一步信号源。

## Requirements

### Functional Requirements

- **FR-001**: 系统 MUST 定义独立的 adaptive auto-converge controller 抽象。
- **FR-002**: controller MUST 以 `fullCostEstimate` 与 `dirtyCostEstimate` 的比较为核心。
- **FR-003**: controller MUST 支持 per-module、per-step-band、per-dirty-band 的历史统计。
- **FR-004**: controller MUST 复用现有 `TraitConvergeDecisionSummary` / `trace:trait:converge` 作为最小 telemetry baseline，并稳定输出 `stepStats.totalSteps/affectedSteps`、`dirty.rootCount`、`cache.hit/missReason/disableReason`、`generation`、`requestedMode`、`executedMode`、`executionDurationMs`、`decisionDurationMs`、`configScope`、`reasons`。
- **FR-005**: controller MUST 保留 deterministic hard rules，例如 `cold_start`、`dirty_all`、`unknown_write`、budget cutoff。
- **FR-006**: controller MUST 支持低频探索机制。
- **FR-007**: controller MUST 输出可解释 summary，并能被 diagnostics / perf evidence 消费。
- **FR-008**: controller MUST 明确与 plan cache / generation evidence / diagnostics sampling 的关系。
- **FR-009**: rollout MUST 先在 `main` 控制线规划 / PoC，再决定是否 replay 到 `v4-perf`。
- **FR-010**: 当前静态 heuristic MUST 被视为 fallback，而不是长期唯一真相源。
- **FR-011**: controller MUST 在现有 `TraitConvergeDecisionSummary` 基础上做增量扩展，新增 adaptive 字段时至少明确 `bandKey`、`fullCostEstimate`、`dirtyCostEstimate`、`fallbackReason`、`controllerStateVersion`、`shadowDecision`，并禁止并行维护第二套 diagnostics contract。
- **FR-012**: rollout 的第一刀 MUST 是 telemetry-only / shadow-mode，且 live `executedMode` 保持原样；只有 shadow 证据稳定后才允许进入 live decision candidate。
- **FR-013**: 验证梯度 MUST 明确区分 `cheap local -> heavier local -> PR/CI last`，且每一层都要写清进入门与输出工件。
- **FR-014**: controller MUST 明确定义 `envBucket`、`bandKey`、`moduleId` 与 per-band state 的作用域和寿命，避免跨 runtime instance / generation 混用统计。
- **FR-015**: exploration MUST 记录 `ExplorationRecord`，至少包含 `bandKey`、`candidateMode`、`cooldownState`、`rollbackReason`，并保证探索样本不会污染 accepted evidence purity。

### Non-Functional Requirements

- **NFR-001**: controller disabled 或 fallback 时额外开销必须接近零。
- **NFR-002**: controller 决策必须保持同步、无 IO。
- **NFR-003**: controller 内部状态与诊断输出必须使用稳定标识。
- **NFR-004**: controller 的在线学习与探索必须有严格上限。
- **NFR-005**: controller 的 evidence 字段必须能被 benchmark、dated readings 和文档共同消费。
- **NFR-006**: controller 的 adaptive evidence 必须优先复用既有 `trace:trait:converge` 消费链，避免对 Devtools、PerfDiff、dated readings 引入第二套解析路径。
- **NFR-007**: exploration 的样本与 shadow 结果必须与 accepted evidence 隔离，不能直接充当 replay 或 CI 的收益依据。

### Key Entities

- **AdaptiveConvergeController**
- **ConvergeDecisionTelemetry**
- **ConvergeBandState**
- **ExplorationRecord**
- 详细字段定义见 `specs/111-adaptive-auto-converge-controller/data-model.md`
- static heuristic inventory 见 `specs/111-adaptive-auto-converge-controller/heuristic-inventory.md`
- 最小契约工件见：
  - `specs/111-adaptive-auto-converge-controller/contracts/adaptive-converge-band-state.schema.json`
  - `specs/111-adaptive-auto-converge-controller/contracts/adaptive-converge-shadow-summary.schema.json`

## Success Criteria

### Measurable Outcomes

- **SC-001**: 本 spec / plan 能明确 controller 的输入、状态、输出、fallback、exploration 和 rollout。
- **SC-002**: 后续 PoC 若实现，至少能解释“为何选 full / dirty”。
- **SC-003**: 后续 PoC 若实现，新增 telemetry 不得破坏现有 correctness 门。
- **SC-004**: 后续 PoC 若实现，应减少对静态 near-full ratio 人工调参的依赖。
- **SC-005**: 后续 PoC 若实现，必须先在 `main` 控制线验证。
- **SC-006**: 本 spec / plan / tasks 能单独回答 `111` 当前是否允许进入 shadow / live PoC。
