# Feature Specification: 014 浏览器压测基线与性能边界地图

**Feature Branch**: `[014-browser-perf-boundaries]`  
**Created**: 2025-12-16  
**Status**: Active  
**Input**: User description: "基于现状，直接用浏览器模式的测试运行器做压力测试用例，试探当前各个维度的性能边界；把边界定清楚，后续每次改造后能知道各边界变好或变差，进入持续压榨性能阶段。"

## Context & Positioning

本 spec 定义 Logix Runtime 在真实浏览器环境中的性能边界测量基线：以 `vitest` 浏览器模式的“大颗粒度长链路集成测试”作为主跑道，产出稳定可对比的边界地图报告（JSON）与回归 diff。它面向未来复用：任何触及核心路径/诊断协议/收敛策略/渲染与并发语义的特性都复用同一套维度矩阵与报告口径。当前主要消费者包括：`013-auto-converge-planner`（控制面与硬门试点）、`017-perf-tuning-lab`（基于 014 跑道的默认值调参推荐）与 `019-txn-perf-controls`（事务/增量派生与批处理等性能控制的回归防线）。

### Framework Role（升级为“性能优化的极限框架”）

014 不仅是一组浏览器压测用例，也同时定义仓库级的“性能证据协议与工具链”。后续任何性能优化相关需求（包括但不限于事务/收敛/校验/渲染/诊断开销）应优先复用 014，而不是再新造一套 report/diff/阈值语义。

- **统一最小 IR**：以 `matrix.json + PerfReport + PerfDiff` 作为“性能证据”的统一最小 IR（可机器解析、可回归、可交接）。  
- **Runner 可扩展**：014 的“证据协议”不强绑定浏览器；浏览器跑道是默认/权威的端到端口径，但其它跑道（Node/runtime 侧 micro）也应产出同一 `PerfReport` 结构，以便复用同一 diff 语义与门槛表达。
- **结果归档位置**：014 提供口径与工具；具体 feature 的 Before/After/Diff 证据应优先固化到该 feature 自己的 `specs/<id>/perf/*`，避免把 014 的 `perf/` 目录变成“所有特性的杂货铺”。
- **扩展方式**：需要新增场景/维度时，只做两件事：在 `@logixjs/perf-evidence/assets/matrix.json`（物理：`.codex/skills/logix-perf-evidence/assets/matrix.json`）增加 suite/轴/预算，并提供一个能输出 `LOGIX_PERF_REPORT` 的可执行用例（必须确定性、seed 固化、诊断证据 Slim + 可序列化）。

## Clarifications

### Session 2025-12-16

- Q: `meta.config.stability` 判定“重复运行超出容忍范围”时如何组合 `maxP95DeltaRatio` 与 `maxP95DeltaMs`？ → A: 动态带宽：允许 `absΔp95Ms <= max(maxP95DeltaMs, baselineP95Ms * maxP95DeltaRatio)`，否则判定超出并给出噪声提示。
- Q: `negativeBoundaries.dirtyPattern` 的“边界”沿哪条加压轴去找阈值？ → A: 以 `uniquePatternPoolSize` 作为主加压轴（示例档位：8/64/512/4096），`patternKind` 作为调度策略分面；阈值沿 `uniquePatternPoolSize` 计算并在 diff 中定位越界起点。
- Q: `Perf Report` 默认是否写入每次 run 的原始 `samples`？ → A: 默认不写 `samples`（只写 `stats`：median/p95）；需要分布细节时通过开关启用，并在报告 meta 中可解释区分“是否包含 samples”。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 产出“可对比的边界地图”（Priority: P1）

作为运行时维护者/性能负责人，我希望有一套在真实浏览器环境中可重复运行的压测用例集合，能输出每个维度的“性能边界”（在给定体验预算下可承受的最大规模），以便后续迭代时用同一套口径判断“变好/变差”。

**Why this priority**: 没有边界地图就无法系统性压榨性能；只看单点数据会误判并引入新的负优化风险。

**Independent Test**: 在同一台机器上运行一次压测集合，生成一份结构化报告（曲线 + 阈值），并能在二次运行中保持可解释的一致性（允许有限波动）。

**Acceptance Scenarios**:

1. **Given** 一组预定义的压力维度与档位（例如 Transaction 事务窗口、Patch/Dirty-set 写入范围与形状、Converge Mode、Diagnostics Level、steps 规模、dirty-roots 规模、watcher 数、并发/挂起场景；Module Override 属于未来扩展维度），**When** 运行压测集合，**Then** 产出结构化报告，包含每个维度的统计分布（至少中位数与 p95）与“边界阈值”（例如在 p95 ≤ 50ms 的预算下最大可承受档位）。
2. **Given** 同一机器同一版本重复运行同一压测集合，**When** 对比两次报告，**Then** 每个维度的边界阈值差异必须在预设容忍范围内（阈值需固化并写入 report `meta.config`），超出时必须给出可诊断的“噪声来源提示”（例如浏览器/负载/配置差异）。
3. **Given** 压测矩阵包含“高基数/低复用”的对抗性场景（每次写入产生不同的 dirty-pattern），**When** 运行压测集合，**Then** 报告必须能输出该场景下的边界与失败模式，并能证明系统不会因缓存/记录机制导致资源失控（至少能观察到缓存/逐出/命中率等关键证据字段）。

---

### User Story 2 - 每次改造后的回归定位与归因线索（Priority: P2）

作为贡献者，我希望当某次改造导致边界变差时，报告能指出“是哪一维度/哪一档位开始恶化”，并提供最小化的归因线索，便于快速定位回归来源。

**Why this priority**: 性能回归不可避免；关键是能快速定位，并避免性能优化变成“盲人摸象”。

**Independent Test**: 人工构造一次“只改变某维度”的对比运行，报告能稳定显示差异集中在相关维度。

**Acceptance Scenarios**:

1. **Given** 两份报告（Before/After）与相同的场景定义，**When** 进行对比分析，**Then** 输出差异摘要：每个维度的边界变化（提升/回归）与最显著变化的档位区间（例如从某档位起 p95 明显上升：watchers=256 / steps=2048 / dirty-roots=32 等）。
2. **Given** 某维度存在多条子路径（例如同一交互同时涉及渲染、事务收敛与诊断记录），**When** 该维度出现回归，**Then** 报告应至少能区分“端到端延迟”与“事务提交耗时”等不同观测口径，避免误归因。
3. **Given** 某次改造可能影响缓存复用/失效语义，**When** 运行包含“重复 pattern（应命中）/图变化（应失效）/高基数（应自我保护）”的压测子集，**Then** 报告必须能明确区分：cache hit、cache miss、cache invalidate、budget cut-off 等路径的统计与边界变化。

---

### User Story 3 - 测量不被诊断/日志噪声污染（Priority: P3）

作为性能测量维护者，我希望压测结果主要反映运行时与渲染成本，而不是被日志输出、诊断回退路径或采样机制污染；当开启更高诊断等级时，也能明确量化其开销上界。

**Why this priority**: 没有“干净的测量”，边界地图会随环境波动而失真；诊断成本也需要明确边界，避免线上误用。

**Independent Test**: 同一场景下分别运行“诊断关闭/轻量/全量”，报告能输出三条曲线并给出 overhead 区间。

**Acceptance Scenarios**:

1. **Given** 同一压力场景，**When** 分别在不同诊断分档下运行，**Then** 报告能输出诊断 overhead 的量化结果，并且在“诊断关闭”时结果不会被诊断输出路径显著污染。
2. **Given** 浏览器环境存在不可控噪声（例如渲染帧抖动），**When** 运行压测集合，**Then** 报告必须包含 warmup/样本数/统计口径等元信息，使结果可解释且可复现。
3. **Given** 某些压力场景会产生大量事件/日志（例如高频事务或高诊断等级），**When** 运行压测集合，**Then** 必须确保“测量开销”与“被测系统开销”可区分：报告需要显式记录是否启用任何输出/采样，以及其对结果的潜在污染风险提示。

### Edge Cases

- 浏览器环境噪声：后台负载、tab 切换、节能模式、浏览器版本差异导致结果漂移。
- 极端规模：档位过高导致浏览器假死或测试超时，如何确保压测可自动结束并留下部分结果。
- 诊断等级差异：某些档位下缺失细粒度事件（例如 light 模式缺 patch/细粒度 trace），报告与 UI 需要能降级呈现而非失败。
- 严格模式/挂起：组件多次 mount/unmount、挂起恢复导致资源抖动，边界如何定义（例如以“稳定交互延迟”而非首次渲染）。

## Non-Goals

- 不以面向源码/内部算法的细粒度单测为主；验收与回归以浏览器模式的长链路集成用例与结构化报告为准。
- 允许补充少量 **非浏览器模式** 的辅助测试（例如 Node 侧的 schema/阈值/diff 语义预检，或少量 micro-benchmark 用于快速归因），但它们不得替代浏览器跑道的预算门禁与边界阈值判定。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须定义一份“压力维度矩阵”（维度、档位、预算阈值、默认 runs/warmup/timeout、stability 阈值、相对预算 ref 约束表达）作为单一事实源，后续迭代必须复用该矩阵进行对比（SSoT：`@logixjs/perf-evidence/assets/matrix.json`）。
- **FR-002**: 系统必须为每个维度输出两类结果：曲线（档位→统计分布）与边界阈值（在指定预算下的最大可承受档位）。
- **FR-003**: 系统必须输出结构化报告，包含环境元信息（浏览器/平台/配置）、样本策略（runs/warmup/统计口径）与各维度结果，便于长期对比与归档。
- **FR-004**: 系统必须支持 Before/After 对比：给定两份结构化报告，能够输出差异摘要（边界提升/回归、最显著档位区间）。
- **FR-005**: 系统必须保证测量过程可自动结束；当某档位过慢或不可用时，必须安全停止或跳过，并在报告中标注该档位为“不可测/超时/失败”而非静默忽略。
- **FR-006**: 系统必须覆盖至少以下类别的压力维度（可按子集分阶段交付）：
  - 端到端交互延迟（用户可感：click-to-paint/交互到稳定 UI）；
  - 事务提交/派生收敛成本（steps、dirty-roots、写入分布）；
  - 诊断分档 overhead（off/light/full）；
  - 并发/挂起相关路径（严格模式/挂起恢复导致的抖动）。
- **FR-007**: 报告必须能提供最小化归因线索：至少区分端到端延迟与运行时内部提交耗时等口径，避免把不同成本混为一谈。
- **FR-008**: 压测矩阵必须显式覆盖“负优化边界”类场景（至少包含）：
  - 高基数 dirty-pattern（低命中率/近似随机写入）；
  - 重复 dirty-pattern（应出现稳定命中与开销降低）；
  - 反直觉 pattern 调度（看似稳定但易误判/抖动）：例如两套稳定 pattern 交替、稳定为主但稀疏噪声注入、warmup/采样阶段 pattern 相位漂移、滑动窗口高重叠但高基数等；
  - 图变化/版本变化导致的缓存失效（应出现稳定 miss + 可观测失效原因）；
  - 列表/动态行写入的 pattern 归一化（不得因 index 膨胀导致不可控的 pattern 基数）。
- **FR-009**: 报告必须包含最小 cache 证据字段（若系统存在缓存/复用机制）：至少包括 cache size、hit/miss、evict 计数、失效代际/版本、以及 budget cut-off 次数；缺失时必须明确标注“该系统/该档位不提供此证据”。证据字段必须可机器解析（建议以 point-level `evidence` 输出，而不是混入人类文本）。
- **FR-010**: 报告必须对齐对外心智模型（013）：使用稳定、有限的关键词命名维度与证据字段（例如 Transaction / Patch/Dirty-set / Converge Mode / Diagnostics Level / Module Override），避免同义词漂移导致不可对比。
- **FR-011**: 报告必须输出“可行动的手动杠杆提示”（不要求自动诊断，但必须可复用）：当某维度越界或出现显著回归时，至少给出 1–3 个与心智模型一致的下一步动作（例如缩小写入范围、模块级覆盖回退/固定模式、降低诊断分档、修正列表/动态行的稳定标识、或拆分模块），并能被文档引用。建议以结构化 `recommendations` 字段输出（带稳定 `id` 与可读 `title`），避免同义词漂移。
  - “显著回归”的判定规则必须可解释且可复现，建议优先级为：`budgetViolations`（阻断级） > `baselineBudgetId`/`limitBudgetId` 对应的 `maxLevel` 降级 > 其它 budget 的 `maxLevel` 降级；若 diff 标注 `stabilityWarning`，recommendation 必须提示“复测以增强证据”。
- **FR-012**: 压测用例必须以 `vitest` 浏览器模式的集成测试交付（允许单条大颗粒度长链路用例），并能在 headless 环境中自动结束；不得依赖 watch/交互模式才能完成测量。
- **FR-013**: 报告必须同时支持“绝对预算”（例如 p95 ≤ 50ms）与“相对预算”（例如 `auto/full ≤ 1.05`）两类门槛口径，并能在回归 diff 中指出从哪个档位开始违反门槛。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 压测集合运行时间必须可控，默认矩阵（Collect 默认 files）在同机同配置下应满足总耗时预算：`quick ≤ 15min`、`default ≤ 45min`、`soak ≤ 120min`；若超出，应通过缩小 suite 子集/档位或调整采样配置回到预算，并在报告 `meta.config` 中记录所用 profile 与采样参数。并且整个过程不得进入交互/驻留模式。
- **NFR-002**: 统计口径必须稳定：至少包含中位数与 p95，并固定 warmup 丢弃策略；同一机器重复运行的波动必须在可解释范围内。
- **NFR-003**: 报告格式必须稳定且可序列化（`JSON.stringify` 不失败），便于归档、对比与后续自动化分析。
- **NFR-004**: 当诊断关闭时，测量不得被日志/控制台输出等额外路径显著污染；当诊断开启时，必须能量化其 overhead 上界并写入报告。
- **NFR-005**: 针对负优化边界场景，压测集合必须输出“资源上界”证据：至少能观察到缓存相关统计或等价资源指标，以验证不会出现随运行无限增长的行为。
- **NFR-006**: 报告的 schema 与关键字段语义必须稳定：报告必须包含版本号/生成器标识；若字段语义发生 breaking change，必须同步更新对比工具与文档口径，避免“同名不同义”导致误判。

### Measurement Semantics（Budget / Relative Pairing / Noise / Overhead）

- **统计口径**：每个时间类 metric 固定输出 `median` 与 `p95`，阈值判定默认使用 `p95`（除非某 budget 显式声明使用其他口径）。
- **原始样本（samples）**：报告默认不写入每次 run 的原始 `samples`（仅输出 `stats`）；当开启样本采集开关时才允许写入 `samples`（用于分布诊断/解释 tail），并且必须在报告中可解释区分“是否包含 samples”（例如通过字段存在与否或显式配置）。
- **绝对预算（absolute）**：对一个 suite 的一个 budget，阈值计算以 “primaryAxis 的档位列表顺序” 为递增序；对每个 `where` 子空间（除 `primaryAxis` 外的其它轴组合）分别计算 `maxLevel` 与 `firstFailLevel`，并在 `reason` 中注明失败类型（timeout/failed/越界）。
- **负优化边界（negative boundaries）**：对抗性场景必须沿一个“可加压的高基数轴”计算阈值（v1：`uniquePatternPoolSize`）；`patternKind` 作为调度策略分面（反直觉/对抗用例），不得让 `patternKind` 成为阈值计算的 primaryAxis。
- **相对预算（relative）**：
  - `numeratorRef` / `denominatorRef` 采用约束表达式（例如 `convergeMode=auto`），含义为 “在同一 suite 内筛选出满足该轴约束的点”。
  - 配对规则：分子/分母必须满足 **除 ref 中出现的轴之外，其余 params 完全相同**；若任一侧缺失、timeout/failed、或 metric 为 unavailable，则该组相对预算结果为 unavailable（必须给出 reason），不得当作 0 或静默跳过。
  - 阈值输出：相对预算同样按 `where` 分组输出阈值；`where` 只描述“配对所需相同的 params 子空间”（通常不包含 ref 轴本身），以便 diff 稳定定位“从哪个档位开始越界”。
- **可复现的对抗场景**：涉及“随机/噪声注入”的对抗场景必须可复现：使用固定 seed 的确定性生成器，并将 seed 作为 `params` 或元信息写入报告；不得依赖真正随机或不可控的时间噪声来构造高基数场景。
- **噪声容忍阈值（stability）**：对同一 suite+params+metric 的两次运行（前一次为 baseline），若 `absΔp95Ms <= max(maxP95DeltaMs, baselineP95Ms * maxP95DeltaRatio)` 则认为在容忍范围内，否则判定超出并输出噪声提示（后台负载/浏览器版本/电源模式/tab 切换等）。阈值必须固化在 `matrix.json` defaults，并写入 report `meta.config.stability`；diff 结果需在 `SuiteDiff.notes` 中给出 `stabilityWarning`。
- **诊断开销（diagnostics overhead）**：当同一场景在 `off/light/full` 下运行时，报告必须能表达 “相对 off 的开销上界”（例如 `full/off` 的 `p95` 比值或 `p95` 差值），并保证可机器解析（不依赖人读日志）；不同指标的观测口径（端到端 e2e / runtime / diagnostics）必须通过 `SuiteResult.metricCategories` 标注，diff 在阈值变化描述中需带上 `category=e2e|runtime|diagnostics` 前缀。

### Key Entities *(include if feature involves data)*

- **Perf Dimension**: 一个可调参数轴（例如 Converge Mode、Diagnostics Level、Module Override、Patch/Dirty-set 形状、watcher 数、steps 数、dirty-roots 数、挂起次数）。
- **Budget**: 体验预算阈值（例如 p95 ≤ 16ms/50ms/100ms 的不同档位，或相对基线的比值门槛如 `auto/full ≤ 1.05`），用于定义“边界”与“及格线”。
- **Baseline / Limit（指标）**:
  - Baseline：每个 suite 选定的“主判定预算”（例如 `p95<=50ms`），用于作为长期对照与回归门槛的锚点（见矩阵中的 `baselineBudgetId`）。
  - Limit：每个 suite 选定的“上限预算”（例如 `p95<=100ms`），用于定义可接受的极限边界（见矩阵中的 `limitBudgetId`）。
- **Boundary Threshold**: 在给定预算下可承受的最大档位（或最大组合规模）。
- **Perf Report**: 一份结构化结果，包含环境元信息、样本策略、每维度曲线、边界阈值与失败档位说明。
- **Regression Diff**: 两份报告的差异摘要（边界变化与显著恶化区间）。
- **Negative Boundary Scenario**: 用于刻意触发潜在负优化的压力场景集合（高基数/低命中率/失效/列表归一化等），用于验证系统“刹车片”是否有效。

### Execution Workflow（Browser → Collect → PerfDiff）

- **Browser 集成测试（主跑道）**：`packages/logix-react/test/browser/**/*` 中的 suite 在 Vitest browser project 下运行，使用统一的 harness（`runMatrixSuite`）按 `matrix.json` 采样，并在每次 run 结束后通过 `LOGIX_PERF_REPORT:<json>` 单行输出结构化结果（`PerfReport`）。
- **采集与合并（Collect）**：Node 侧脚本 `.codex/skills/logix-perf-evidence/scripts/collect.ts`（通过 `pnpm perf collect` 调用）以子进程方式运行 browser project，抓取所有 `LOGIX_PERF_REPORT` 行并合并为一份 `PerfReport`：
  - 默认命令（根目录）：`pnpm perf collect`（或 `pnpm perf collect:quick`）；
  - 默认输出：`specs/014-browser-perf-boundaries/perf/after.worktree.json`（可通过 `--out <file>` 覆盖）；
  - 支持通过 `--files` 只采集部分 suite（例如只跑 converge/diagnostics 子集），但仍必须遵守同一份 `matrix.json` 与 schema 契约。
- **基线固化（Before）**：选定一台基准机器与 profile（如 `quick`），用 Collect 脚本生成一份带 envId 的基线报告：
  - 命名约定：`specs/014-browser-perf-boundaries/perf/before.<gitSha>.<envId>.json`；
  - envId 作为“环境锚点”（OS/arch/CPU/browser/headless），后续对照必须复用同一 envId。
- **Diff 对比（PerfDiff）**：给定一份 Before 与一份 After 报告，使用 `.codex/skills/logix-perf-evidence/scripts/diff.ts`（通过 `pnpm perf diff` 调用）生成 `PerfDiff`：
  - 根命令：`pnpm perf diff -- --before <before.json> --after <after.json> [--out <diff.json>]`；
  - 对照 `PerfMatrix`（`matrix.json`）重算阈值，输出 `thresholdDeltas`（预算下最大可承受档位的变化）；
  - 同时输出 `evidenceDeltas`：对 `requiredEvidence` 与 `budget.cutOffCount` 等证据字段进行聚合对比，显式区分 `missing` / `unavailable(reason)` / 有值（含 0），避免把“测不到”误读为“没有发生”。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 至少产出一份覆盖多维度的“边界地图”报告，包含每维度的中位数/p95曲线与边界阈值，并可被归档与对比。
- **SC-002**: 同一机器重复运行同一压测集合，关键边界阈值的波动在预设容忍范围内（容忍范围需固化并写入报告 meta；同时给出环境元信息）。
- **SC-003**: 支持 Before/After 对比并输出差异摘要，能明确指出“从哪个档位开始恶化/改善”。
- **SC-004**: 能量化诊断分档的 overhead，并能证明“诊断关闭”下的测量不被显著污染。
- **SC-005**: 边界地图覆盖至少一组“负优化边界”场景，并能输出对应的边界阈值与关键证据字段（cache hit/miss/evict/失效/止损等），使后续迭代能判断负优化边界是否变多或变少。
- **SC-006**: 用户仅通过“边界地图报告 + 对外心智模型（013）”即可形成可预期的判断：知道当前瓶颈更可能来自哪一类维度，并能选择对应的手动优化杠杆进行验证。
- **SC-007**: 至少能通过同一套报告口径稳定判定一条“相对下界”门槛（例如 `auto/full ≤ 1.05`）是否满足，并能在回归 diff 中定位从哪个档位开始越界。
