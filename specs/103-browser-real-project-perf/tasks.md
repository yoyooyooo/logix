# Tasks: 真实项目 Browser 模式性能集成测试基线

**Input**: Design documents from `/specs/103-browser-real-project-perf/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 本特性核心交付就是 Browser 集成性能测试与回归门禁，测试任务为必选。

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立 feature 103 的目录骨架、执行入口与场景注册基线。

- [x] T001 创建 `examples/logix-react/test/browser/perf-scenarios/` 与 `examples/logix-react/test/perf-boundaries/` 目录骨架，并补充 `README.md`
- [x] T002 更新 `examples/logix-react/vitest.config.ts`，注册 `test/browser/perf-scenarios/**` Browser 项目匹配与稳定超时配置
- [x] T003 [P] 新建 `examples/logix-react/test/browser/perf-scenarios/protocol.ts`，定义 ScenarioSuite/Budget/requiredEvidence 常量与类型映射
- [x] T004 [P] 更新 `scripts/perf.ts`，补充 feature 103 的 collect/diff 快捷命令入口（指向 `examples/logix-react`）
- [x] T005 在 `specs/103-browser-real-project-perf/perf/.gitkeep` 初始化证据目录并补充 `specs/103-browser-real-project-perf/perf/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 打通统一 PerfReport/PerfDiff 协议与真实项目运行链路，作为所有用户故事的前置。

**⚠️ CRITICAL**: 本阶段完成前，不开始用户故事实现。

- [x] T006 扩展 `.codex/skills/logix-perf-evidence/scripts/collect.ts` 以支持 `--cwd`/`--config` 目标工程采集参数，并保持向前兼容语义
- [x] T007 [P] 扩展 `.codex/skills/logix-perf-evidence/scripts/diff.ts`，在 `meta.comparability` 中输出 feature 103 所需漂移告警字段
- [x] T008 [P] 更新 `.codex/skills/logix-perf-evidence/assets/matrix.json`，新增 `examples/logix-react` 的 `perf-scenarios` suite 配置入口
- [x] T009 新建 `examples/logix-react/test/browser/perf-scenarios/shared/runScenarioSuite.ts`，统一点位执行、阈值评估与证据归档
- [x] T010 [P] 新建 `examples/logix-react/test/browser/perf-scenarios/shared/runtimeGuards.ts`，封装 no-IO/no-tearing/稳定标识断言辅助
- [x] T011 [P] 更新 `specs/103-browser-real-project-perf/contracts/scenario-suite.schema.json`，补充真实场景矩阵字段校验（priority/axes/requiredEvidence）
- [x] T012 更新 `specs/103-browser-real-project-perf/contracts/gate-policy.schema.json`，固化 quick/default/soak 与 comparability 失败策略

**Checkpoint**: `pnpm perf collect` 已可对 `examples/logix-react/test/browser/perf-scenarios` 产出可比较报告。

---

## Phase 3: User Story 1 - 建立真实场景基线跑道 (Priority: P1) 🎯 MVP

**Goal**: 在真实业务样例中落地 80% 常见路径场景并稳定输出结构化性能报告。

**Independent Test**: 运行 `pnpm -C examples/logix-react test -- --project browser test/browser/perf-scenarios`，每个 P1 场景均有阈值结果与失败原因。

### Tests for User Story 1

- [x] T013 [P] [US1] 新建 `examples/logix-react/test/perf-boundaries/contract-preflight.test.ts`，校验 ScenarioSuite/budget/evidence 注册完整性
- [x] T014 [P] [US1] 新建 `examples/logix-react/test/perf-boundaries/semantics.test.ts`，校验 no-tearing 与事务窗口 no-IO 语义

### Implementation for User Story 1

- [x] T015 [P] [US1] 新建 `examples/logix-react/test/browser/perf-scenarios/route-switch.test.tsx`，覆盖路由切换热点路径
- [x] T016 [P] [US1] 新建 `examples/logix-react/test/browser/perf-scenarios/query-list-refresh.test.tsx`，覆盖查询加载/刷新/重试路径
- [x] T017 [P] [US1] 新建 `examples/logix-react/test/browser/perf-scenarios/form-cascade-validate.test.tsx`，覆盖表单联动与校验路径
- [x] T018 [P] [US1] 新建 `examples/logix-react/test/browser/perf-scenarios/dense-interaction-burst.test.tsx`，覆盖高频交互更新路径
- [x] T019 [P] [US1] 新建 `examples/logix-react/test/browser/perf-scenarios/external-push-sync.test.tsx`，覆盖外部输入流入路径
- [x] T020 [US1] 在 `examples/logix-react/test/browser/perf-scenarios/protocol.ts` 注册 P1/P2 场景预算（absolute + relative）与 evidence 字段
- [x] T021 [US1] 更新 `examples/logix-react/test/browser/perf-scenarios/shared/runScenarioSuite.ts`，统一产出 `median/p95`、阈值、首个失败档位，并通过 `LOGIX_PERF_REPORT` 写入统一 PerfReport 产物
- [x] T022 [US1] 执行一次 `default` 档采集（suite=`examples.logixReact.scenarios`）并落盘 `specs/103-browser-real-project-perf/perf/baseline.<envId>.default.json`

**Checkpoint**: P1 场景可独立运行并生成稳定基线报告。

---

## Phase 4: User Story 2 - 构建回归门禁与证据闭环 (Priority: P1)

**Goal**: 打通 before/after/diff 可比性门禁与自动结论输出。

**Independent Test**: 在同一环境执行 before 与 after 后，`pnpm perf diff` 能输出场景级回归结论与 comparability 状态。

### Tests for User Story 2

- [x] T023 [P] [US2] 新建 `.codex/skills/logix-perf-evidence/scripts/lib/capacity-envelope.examples-browser.test.ts`，校验真实场景阈值包络计算
- [x] T024 [P] [US2] 新建 `examples/logix-react/test/browser/perf-scenarios/diff-comparability.test.ts`，校验 `comparable=false` 时阻止硬结论

### Implementation for User Story 2

- [x] T025 [US2] 更新 `.github/workflows/logix-perf-quick.yml`，接入 `examples.logixReact.scenarios` 的 quick 子集回归检查
- [x] T026 [US2] 更新 `.github/workflows/logix-perf-sweep.yml`，接入 `examples.logixReact.scenarios` 的 default/soak 采集链路与 artifact 落盘
- [x] T027 [US2] 更新 `.github/scripts/logix-perf-quick-summary.cjs`，输出场景级预算变化、首个失败档位与 comparability 漂移原因
- [x] T028 [US2] 更新 `.github/scripts/logix-perf-capacity-model.cjs`，将 feature 103 场景纳入 dynamic floor 目标解析
- [x] T029 [US2] 更新 `specs/103-browser-real-project-perf/quickstart.md`，补齐 before/after/diff 一次命令链路与失败回退
- [x] T030 [US2] 产出 `specs/103-browser-real-project-perf/perf/diff.baseline__head.<envId>.default.json`，并归档同次关键 run 的 `summary`/`tail-recheck` 到 `specs/103-browser-real-project-perf/perf/`，随后回写 `tasks.md` 状态与结论

**Checkpoint**: before/after/diff 闭环可自动给出回归定位，且可比性不足时只输出线索。

---

## Phase 5: User Story 3 - 支持问题定位与优化决策 (Priority: P2)

**Goal**: 在 diff 结果上增加规模化边界信号（内存/长时/诊断开销）与可执行优化建议。

**Independent Test**: 任一回归场景可在 5 分钟内定位到失败切片，并看到至少一条可执行建议。

### Tests for User Story 3

- [x] T031 [P] [US3] 新建 `examples/logix-react/test/browser/perf-scenarios/memory-soak.test.tsx`，验证长时运行下资源漂移采样
- [x] T032 [P] [US3] 新建 `examples/logix-react/test/browser/perf-scenarios/diagnostics-overhead.test.tsx`，验证 `off/light/sampled/full` 开销分档

### Implementation for User Story 3

- [x] T033 [US3] 更新 `examples/logix-react/test/browser/perf-scenarios/protocol.ts`，新增内存漂移与诊断开销证据字段（Slim/可序列化）
- [x] T034 [US3] 更新 `.codex/skills/logix-perf-evidence/scripts/collect.ts`，采集并写入 memory/soak 相关 evidence 元数据
- [x] T035 [US3] 更新 `.codex/skills/logix-perf-evidence/scripts/tuning.recommend.ts`，将回归切片映射到优化建议（订阅粒度/写入范围/诊断档位）
- [x] T036 [US3] 更新 `.github/scripts/logix-perf-quick-summary.cjs`，补充 memory/overhead 诊断摘要与行动建议输出
- [x] T037 [US3] 产出 `specs/103-browser-real-project-perf/perf/soak.<envId>.json` 与建议摘要 `specs/103-browser-real-project-perf/perf/recommendations.<envId>.md`

**Checkpoint**: 回归报告具备规模化边界信号与可执行优化建议。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 收口质量门、文档与证据归档，保证可持续回归执行。

- [x] T038 [P] 更新 `specs/103-browser-real-project-perf/plan.md` Constitution Check 的实现后复核结论与证据链接
- [x] T039 [P] 更新 `specs/103-browser-real-project-perf/research.md`，补充最终采用策略与放弃方案复盘
- [x] T040 运行 `pnpm typecheck` 并将结果归档到 `specs/103-browser-real-project-perf/perf/verification.typecheck.txt`
- [x] T041 运行 `pnpm lint` 并将结果归档到 `specs/103-browser-real-project-perf/perf/verification.lint.txt`
- [x] T042 运行 `pnpm -C examples/logix-react test -- --project browser` 并将结果归档到 `specs/103-browser-real-project-perf/perf/verification.browser.txt`
- [x] T043 运行 `pnpm test:turbo` 并将结果归档到 `specs/103-browser-real-project-perf/perf/verification.test-turbo.txt`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 → 无依赖，可立即开始。
- Phase 2 → 依赖 Phase 1，且阻塞所有用户故事。
- Phase 3 (US1) → 依赖 Phase 2；MVP 首先完成此阶段。
- Phase 4 (US2) → 依赖 US1 的场景与报告结构。
- Phase 5 (US3) → 依赖 US2 的 diff/gate 证据链。
- Phase 6 → 依赖所有目标用户故事完成。

### User Story Dependencies

- US1 (P1): 无故事级前置，基础能力完成后优先落地。
- US2 (P1): 依赖 US1 的场景结果作为 before/after 输入。
- US3 (P2): 依赖 US2 的 diff 结果进行诊断增强与建议生成。

### Parallel Opportunities

- Phase 1: T003/T004/T005 可并行。
- Phase 2: T007/T008/T010/T011 可并行。
- US1: T015~T019 可并行开发，T020/T021 汇总串联。
- US2: T023/T024 可并行，workflow 与 summary 脚本可并行推进。
- US3: T031/T032 可并行，T035/T036 可并行。
- Phase 6: T038/T039 可并行，验证命令按顺序执行。

---

## Parallel Example: User Story 1

```bash
Task: "[US1] 实现 route-switch 场景 (T015)"
Task: "[US1] 实现 query-list-refresh 场景 (T016)"
Task: "[US1] 实现 form-cascade-validate 场景 (T017)"
Task: "[US1] 实现 dense-interaction-burst 场景 (T018)"
Task: "[US1] 实现 external-push-sync 场景 (T019)"
```

---

## Implementation Strategy

### MVP First (US1)

1. 完成 Phase 1 + Phase 2，打通真实项目采集链路。
2. 完成 US1（Phase 3），先拿到可复现基线报告。
3. 以 US1 报告作为后续 diff 与门禁的基线。

### Incremental Delivery

1. US1：交付场景基线。
2. US2：交付自动回归门禁闭环。
3. US3：交付规模化边界诊断与优化建议。
4. 每阶段都在 `specs/103-browser-real-project-perf/perf/` 增量落盘证据。

### Notes

- 所有任务遵循 forward-only，不引入兼容层。
- 报告与 diff 协议统一复用 PerfReport/PerfDiff，禁止并行真相源。
- 对事务窗口 no-IO、稳定标识、Slim 诊断事件的约束必须在场景与报告中可验证。
