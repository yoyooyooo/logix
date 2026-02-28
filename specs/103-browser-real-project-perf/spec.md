# Feature Specification: 真实项目 Browser 模式性能集成测试基线

**Feature Branch**: `[103-browser-real-project-perf]`  
**Created**: 2026-02-27  
**Status**: Planned  
**Input**: User description: "在真实项目中集成 logix-core + logix-react，使用 vitest browser mode 做性能集成测试，验证前端常见 80%+ 场景的性能表现，并形成可回归的证据与门禁。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-10, NS-4
- **Kill Features (KF)**: KF-8, KF-4

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 建立真实场景基线跑道 (Priority: P1)

作为 Runtime 维护者，我需要在真实业务工程里运行一组可复现的浏览器端集成场景，验证 `@logixjs/core + @logixjs/react` 在前端高频链路中的性能下界与上界。

**Traceability**: NS-10, KF-8

**Why this priority**: 没有真实业务场景的稳定基线，后续优化与重构无法判断是否在关键路径上发生退化。

**Independent Test**: 仅实现本故事即可在同一机器上执行一套场景并产出结构化报告，且每个场景都能得到可解释的时延与阈值结果。

**Acceptance Scenarios**:

1. **Given** 已定义的 80% 常见前端场景集合，**When** 执行浏览器模式集成测试，**Then** 每个场景都产出统一结构的性能结果（指标、参数、预算阈值、失败原因）。
2. **Given** 同一环境重复执行同一场景集合，**When** 对比两次报告，**Then** 结果波动在预设稳定阈值内，超出时给出可诊断提示。

---

### User Story 2 - 构建回归门禁与证据闭环 (Priority: P1)

作为提交者，我需要将基线报告纳入“before/after/diff”证据闭环，使每次改动都能得到可自动判定的性能结论，而不是依赖人工主观判断。

**Traceability**: NS-4, KF-4

**Why this priority**: 性能体系价值在于“持续回归防线”，不是一次性压测。

**Independent Test**: 仅实现本故事即可对同一场景的 before/after 报告生成 diff，并输出回归/提升与越界位置。

**Acceptance Scenarios**:

1. **Given** 一份 before 与一份 after 报告，**When** 运行 diff，**Then** 输出每个场景的阈值变化、预算违例与建议动作。
2. **Given** 配置或环境发生漂移，**When** 运行 diff，**Then** 明确标注可比性状态并阻止产生“硬结论”。

---

### User Story 3 - 支持问题定位与优化决策 (Priority: P2)

作为排障与优化负责人，我需要从报告直接看到“哪个维度开始恶化”和“优先采取什么优化杠杆”，缩短定位与修复时间。

**Traceability**: NS-10, NS-4, KF-8

**Why this priority**: 性能问题常见于交互复杂路径，需要可解释证据支撑快速决策。

**Independent Test**: 仅实现本故事即可基于 diff 结果得到场景级根因线索与可执行优化建议。

**Acceptance Scenarios**:

1. **Given** 某个场景发生回归，**When** 查看 diff，**Then** 能定位到具体参数切片与首个失败档位。
2. **Given** 场景包含诊断档位差异，**When** 查看报告，**Then** 能区分业务耗时与诊断开销，避免误归因。

### Edge Cases

- 场景集只覆盖了低复杂度路径，导致“80%+ 常见场景”覆盖声明与实际不一致。
- 某些场景超时或失败时未输出结构化原因，导致 diff 无法比较。
- 同一场景在不同浏览器/系统版本下执行，报告可比性不足却被误用为强结论。
- 诊断等级开启后出现开销抖动，掩盖真实业务路径的性能变化。
- 长会话或大数据场景下出现资源持续增长，短测无法暴露问题。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-10, KF-8) 系统必须定义“真实项目 80%+ 常见前端场景”的测试矩阵，至少覆盖：列表筛选/分页、表单联动与校验、查询加载与重试、路由切换、外部数据流入、高频交互更新。
- **FR-002**: 系统必须对每个场景输出统一的结构化性能报告，包含参数、指标统计（至少 median/p95）、预算阈值结果、失败原因与证据字段。
- **FR-003**: 系统必须支持 before/after/diff 对比流程，并能输出回归/提升结论与首个失败档位。
- **FR-004**: 系统必须提供场景级过滤执行能力，允许按场景子集快速运行以支持日常开发反馈。
- **FR-005**: 系统必须在报告中显式记录环境与配置信息，并在可比性不足时给出明确标记。
- **FR-006**: 系统必须为回归结果输出可行动建议（例如收窄写入范围、调整诊断分档、优化订阅粒度、拆分热点模块）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10) 系统必须为每个 P1 场景定义可复现预算，并在同机同配置下提供稳定基线。
- **NFR-002**: 系统必须保证诊断关闭时近零额外开销，并可量化 `off/light/sampled/full` 档位的 overhead。
- **NFR-003**: 系统必须使用稳定标识（instanceId/txnSeq/opSeq）保证报告与诊断链路可对齐、可回放。
- **NFR-004**: 系统必须保证事务窗口内无 IO/async 写逃逸；若场景触发违规，报告必须可观测且可失败。
- **NFR-005**: 系统必须确保报告字段 Slim 且可序列化，适合长期归档与自动 diff。
- **NFR-006**: 系统必须支持 quick/default/soak 分层运行档位，并在结论中区分探索结果与硬门结果。

### Key Entities _(include if feature involves data)_

- **ScenarioSuite**: 一组可独立执行和评估的真实业务场景，包含场景 ID、优先级、参数轴、预算与证据字段。
- **PerfReport**: 单次运行产物，记录环境、配置、场景点位、阈值与证据。
- **PerfDiff**: 两份 PerfReport 的对比产物，记录可比性、回归/提升、预算变化、建议动作。
- **ComparabilityMeta**: 对比前提元信息（profile、runs/warmup、browser/env、matrix 版本）与漂移告警。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-10, KF-8) 至少 6 个常见前端场景被纳入基线矩阵，且其中 P1 场景在默认档位全部可稳定产出报告。
- **SC-002**: 在同机同配置下，连续两次默认档位运行的 P1 场景 p95 结果波动满足稳定阈值；超阈值时 diff 正确输出告警。
- **SC-003**: before/after/diff 闭环可在一次命令链路中完成，并输出场景级回归定位信息。
- **SC-004**: 对于任一预算违例场景，报告可在 5 分钟内定位到失败切片并给出至少 1 条可执行优化建议。
- **SC-005**: 诊断档位 overhead 对比可被量化，且在结论中可区分“业务退化”与“诊断开销变化”。
- **SC-006**: 新改动接入后可通过同一矩阵复跑并得到可比结论，不需要新增并行真相源。
- **SC-007**: `SC-001` 与 `SC-003` 的验收证据仅接受 `examples.logixReact.scenarios` suite 的 before/after/diff 报告，且报告必须落盘在 `specs/103-browser-real-project-perf/perf/`。
