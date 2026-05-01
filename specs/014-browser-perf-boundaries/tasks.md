# Tasks: 014 浏览器压测基线与性能边界地图

**Input**: `specs/014-browser-perf-boundaries/*`（`spec.md`/`plan.md`/`checklists/*`）

**Tests**: 本特性的主交付物本身就是可执行测试与结构化报告；浏览器模式集成测试视为 REQUIRED。

**Organization**: 按用户故事分组，保证每个故事可独立实现与验证。

## 与 013 的解耦（不阻塞 014 交付）

- 014 的“跑道基础设施”（矩阵 SSoT、报告协议、collect/diff、基线固化）不依赖 013 的具体实现；即使某些指标不可得，也必须以 `unavailable + reason` 形式落到报告里（而不是静默跳过）。
- 受 013 影响的是“点位可测性”，典型包括 `convergeMode=auto`、`runtime.decisionMs`、以及与 planner/cache 相关的证据字段：在未落地前不得伪造或隐式降级，013 落地后通过重跑即可纳入同一份边界地图与门禁。

## Phase 1: Setup（共享准备）

**Purpose**: 先把“口径/产物/固化位置”定死，避免后续只能看日志无法对照。

- [x] T001 创建性能证据模板 `specs/014-browser-perf-boundaries/perf.md`，并建立证据目录 `specs/014-browser-perf-boundaries/perf/`（用于固化 baseline/limit JSON）
- [x] T002 [P] 固化维度矩阵（SSoT）：新增 `@logixjs/perf-evidence/assets/matrix.json`（物理：`packages/logix-perf-evidence/assets/matrix.json`；维度、档位、预算、默认 runs/warmup/timeout）
- [x] T003 [P] 固化报告契约（schema + version）：新增 `@logixjs/perf-evidence/assets/schemas/perf-report.schema.json` 与 `@logixjs/perf-evidence/assets/schemas/perf-diff.schema.json`（物理：`packages/logix-perf-evidence/assets/schemas/*`）
- [x] T004 [P] 在 `packages/logix-react` 明确 014 的 browser 项目运行入口与约束（复用 `packages/logix-react/vitest.config.ts` 的 browser project；不依赖 watch/交互）

---

## Phase 2: Foundational（基线固化链路）

**Purpose**: 打通“跑一遍 → 产出 report → 落盘 → 可对比”的最短闭环。

- [x] T005 定义“机器可解析的输出协议”：browser 用例必须输出一行稳定前缀 + JSON（例如 `LOGIX_PERF_REPORT:<json>`），避免只靠人读日志 `packages/logix-react/test/browser/*`
- [x] T006 [P] 新增采集脚本：运行 `packages/logix-react` 的 browser project，提取 `LOGIX_PERF_REPORT` 行并落盘到 `specs/014-browser-perf-boundaries/perf/after.worktree.json` `packages/logix-perf-evidence/scripts/collect.ts`
- [x] T007 [P] 新增 diff 脚本：对比两份报告并输出差异摘要（边界提升/回归、越界档位、绝对预算与相对预算判定）`packages/logix-perf-evidence/scripts/diff.ts`
- [x] T008 生成并固化一份 “Before 基线”：在同机同配置下运行采集脚本，将输出保存为 `specs/014-browser-perf-boundaries/perf/before.<gitSha>.<envId>.json` 并在 `perf.md` 记录环境元信息与关键指标

**Checkpoint**: 能在本地拿到两份报告并跑出可读 diff；基线文件已固化，可用于后续迭代对照。

---

## Phase 3: User Story 1 - 产出“可对比的边界地图”（Priority: P1）🎯 MVP

**Goal**: 在真实浏览器环境中输出边界地图：曲线（档位→分布）+ 阈值（预算下的最大档位），并可固化落盘。

**Independent Test**: 仅实现本故事即可：跑一次 browser 压测子集生成 `after.worktree.json`，并能从报告中读出至少一个维度的边界阈值。

### Implementation

- [x] T009 [P] 抽出 browser perf harness（统计、warmup 丢弃、timeout、报告聚合）`packages/logix-react/test/browser/perf-boundaries/harness.ts`
- [x] T010 [P] 将 watcher 维度（现有示例）纳入矩阵：改造/复用 `packages/logix-react/test/browser/watcher-browser-perf.test.tsx` 输出机器可解析报告（同时保留可选人类摘要）
- [x] T011 [P] 新增 converge/steps 维度用例：构造 field-heavy 模块与可控 dirty-roots 写入分布，在浏览器端测量“事务提交/派生收敛”相关口径 `packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`
- [x] T012 [P] 新增 diagnostics 维度用例：同一场景在 `off`、`light`、`full` 下产出三条曲线，并以 `suites[].comparisons` 量化相对 off 的 overhead（ratio/delta；同时记录是否存在输出/采样污染）`packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- [ ] T012a 新增 diagnostics 采样档位：补齐 `sampled` 曲线（确定性采样策略 + 可解释 meta），并把 `diagnostics.overhead.e2e` 扩展为 `off/light/sampled/full` 四档对比 `packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- [x] T013 实现边界阈值计算：在给定预算（绝对 ms 或相对 ratio）下求最大可承受档位，并把失败档位原因写入报告（timeout/fail/越界）`packages/logix-react/test/browser/perf-boundaries/harness.ts`
- [x] T014 确保测量可自动结束：为每个档位设置最大耗时与安全跳过策略；不得出现浏览器假死导致全套压测挂死 `packages/logix-react/test/browser/perf-boundaries/*`

---

## Phase 4: User Story 2 - 回归定位与归因线索（Priority: P2）

**Goal**: 当边界变差时，指出从哪个维度/哪个档位开始恶化，并提供最小可行动线索（避免误归因）。

**Independent Test**: 人工制造一次“只改一个维度”的对比（例如改 runs 或切换诊断档位），diff 输出能稳定定位差异集中点。

### Implementation

- [x] T015 实现 diff 摘要：输出每维度边界变化与“最显著恶化区间”（例如从 watchers=256 起 p95 越界）`packages/logix-perf-evidence/scripts/diff.ts`
- [x] T016 在报告中拆分观测口径：端到端延迟 vs 事务提交/收敛耗时 vs 诊断 overhead；diff 必须按口径分别呈现，避免混在一起 `@logixjs/perf-evidence/assets/schemas/perf-report.schema.json`
- [x] T017 若系统存在缓存/复用机制：在报告 point-level `evidence` 中输出最小 cache 证据字段并在 diff 中区分 hit/miss/invalidate/cut-off；不可得时显式标注 unavailable + reason（避免“0=没有发生”的误读）`packages/logix-react/test/browser/perf-boundaries/*`
- [x] T024 新增负优化边界 browser 用例：覆盖 `matrix.json` 的 `negativeBoundaries.dirtyPattern`，并沿 `uniquePatternPoolSize` 主轴计算阈值（示例档位：8/64/512/4096）。同时覆盖反直觉调度（alternatingTwoStable/mostlyStableWithNoise/warmupPhaseShift/slidingWindowOverlap/sawtoothCardinality 等）与 repeatedStable/randomHighCardinality/graphChangeInvalidation/listIndexExplosion。涉及噪声/随机的场景必须使用固定 `seed`（写入 params），并产出 `requiredEvidence`（cache.*、budget.cutOffCount 等）`packages/logix-react/test/browser/perf-boundaries/negative-dirty-pattern.test.tsx`
- [x] T025 在 diff 中输出“手动杠杆提示”：对越界与显著回归的 `budgetViolations`/`thresholdDeltas` 填充结构化 `recommendations`（稳定 id + title，1–3 条）`packages/logix-perf-evidence/scripts/diff.ts`

---

## Phase 5: User Story 3 - 测量不被诊断/日志噪声污染（Priority: P3）

**Goal**: 压测结果主要反映运行时与渲染成本；诊断成本可量化且有上界；噪声可解释。

**Independent Test**: 同一场景 off、light、full（以及 sampled）运行，报告能输出 overhead 区间，并给出噪声来源提示（浏览器/负载/配置差异）。

### Implementation

- [x] T018 约束输出噪声：默认只输出一行机器可解析报告；若需要人类摘要，必须可开关并在报告 meta 中记录 `packages/logix-react/test/browser/perf-boundaries/*`
- [x] T019 固化统计元信息：runs/warmupDiscard/采样策略/timeout/浏览器版本/运行模式(headless)/stability 阈值 必须写入报告 meta.config `packages/logix-react/test/browser/perf-boundaries/harness.ts`
- [x] T020 增加“噪声提示”字段：当两次运行差异超过 `meta.config.stability` 的容忍阈值，报告必须提示可能原因（tab 切换/节能模式/后台负载/浏览器版本等）`packages/logix-perf-evidence/scripts/collect.ts`
- [x] T026 覆盖严格模式/挂起抖动边界：实现 `matrix.json` 的 `react.strictSuspenseJitter` suite（interaction→stable），并输出可对比曲线/阈值 `packages/logix-react/test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 文档互引、固化流程与质量门禁收口，保证后续迭代可交接。

- **Note**: T027/T028 为可选 Node preflight（contract/semantics），默认不作为 CI 门禁；建议通过显式开关启用（例如 `LOGIX_PREFLIGHT=1`），用于本地快速回归。

- [x] T021 更新/校对互引：runtime 文档中的 browser 基线说明明确以 `@logixjs/perf-evidence/assets/*` 为 SSoT（并确认链接有效）`docs/ssot/runtime/logix-core/api/03-logic-and-flow.md`、`docs/ssot/runtime/logix-core/impl/04-watcher-performance-and-flow.md`
- [x] T022 在 `specs/014-browser-perf-boundaries/perf.md` 写清楚“如何生成/更新基线与上限指标”的流程与命名约定（Before/After、envId、预算口径）
- [x] T029 固化运行入口：在 `packages/logix-perf-evidence/package.json` 增加 perf 相关 scripts，并在 014 文档中统一采集/diff 命令入口 `specs/014-browser-perf-boundaries/quickstart.md`、`specs/014-browser-perf-boundaries/perf.md`
- [x] T023 跑通质量门禁并记录一次基线：`pnpm typecheck`、`pnpm lint`、`pnpm -C packages/logix-react test -- --project browser`（不使用 watch）
- [x] T027 [P] 增加非浏览器模式的 contract preflight：校验 `matrix.json` 的关键不变量（主轴/seed/相对预算 ref 约束）与 report/diff schema 的兼容性；提供最小 fixtures 做 JSON schema 校验（含 `unavailable+reason` 与 `samples` 默认不落盘策略）`packages/logix-react/test/perf-boundaries/contract-preflight.test.ts`
- [x] T028 [P] 增加非浏览器模式的语义预检：覆盖相对预算配对规则、stability 判定、阈值/失败原因传播、diff recommendations 稳定 id 等纯算法语义；用小输入 fixtures 断言输出，作为 browser 集成测试之外的快速回归 `packages/logix-react/test/perf-boundaries/semantics.test.ts`
