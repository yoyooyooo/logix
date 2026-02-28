# Research: 真实项目 Browser 模式性能集成测试基线

## Decision 1: 真实项目载体选择 `examples/logix-react`

- Decision: 使用 `examples/logix-react` 作为真实场景承载工程，而非仅在 `packages/logix-react` 内构造 synthetic 场景。
- Rationale: 该工程包含真实模块组合与业务流，能更接近目标中的“前端常见 80%+ 场景”。
- Alternatives considered:
  - 仅复用 `packages/logix-react/test/browser/perf-boundaries`：覆盖核心机制强，但业务链路真实性不足。
  - 新建独立 playground 项目：隔离更强，但维护成本高且与 dogfooding 脱节。

## Decision 2: 协议与证据框架复用 014 既有体系

- Decision: 统一采用 `LOGIX_PERF_REPORT` + `PerfReport/PerfDiff` + `matrix.json`；不新增并行报告格式。
- Rationale: 现有 collect/diff 与 comparability 规则成熟，复用可保证跨特性可比与工具链一致。
- Alternatives considered:
  - 新建 feature 私有 JSON 协议：短期快，但会引入并行真相源与长期维护成本。
  - 直接输出人类文本摘要：不可机器校验，无法稳定做回归门禁。

## Decision 3: 场景分层（P1/P2）与预算策略

- Decision:
  - P1：路由切换、查询列表刷新、表单级联校验、高频交互 burst；
  - P2：外部输入同步、诊断分档开销。
  - 预算同时支持 absolute + relative 两类。
- Rationale: 先覆盖最常见交互路径并保留诊断维度，兼顾“体验指标”与“可解释链路”。
- Alternatives considered:
  - 全量场景一次性上线：成本高，首轮反馈慢。
  - 只做 absolute 预算：对策略切换回归不敏感。

## Decision 4: collect 脚本按“目标工程”扩展而非复制

- Decision: 在 `collect.ts` 增加目标工程参数（如 `--project` / `--cwd` / `--config`），允许对 `examples/logix-react` 采集。
- Rationale: 保持统一入口 `pnpm perf collect`，避免复制脚本造成行为漂移。
- Alternatives considered:
  - 为 examples 再写一套 collect 脚本：短期可行，但后续 drift 风险高。
  - 手动运行 browser 测试并粘贴报告：不可重复且易漏字段。

## Decision 5: 门禁分层执行

- Decision:
  - 开发/PR：`quick` + 场景子集；
  - 合入前：`default` 全 P1；
  - 周期巡检：`soak` 全集。
- Rationale: 兼顾反馈速度与统计稳定性，避免把 soak 成本前置到每次提交。
- Alternatives considered:
  - 全部默认跑 soak：稳定但成本过高，不适合日常节奏。
  - 只跑 quick：无法支撑硬结论。

## Decision 6: 失败与漂移处理策略

- Decision: 对 `timeout/missing/comparable=false` 明确降级语义，只输出线索，不输出回归硬结论。
- Rationale: 保证结论可信度，减少误报与过度优化。
- Alternatives considered:
  - 直接失败阻断全部流水线：可操作性差，定位效率低。
  - 忽略可比性继续给结论：风险不可接受。

## Implementation Retrospective（T039）

### 最终采用策略

- 验收主套件固定为 `examples.logixReact.scenarios`，并与 `converge.txnCommit` 分轨运行：前者用于 Feature 103 验收，后者仅作为容量建模参考。
- quick workflow 默认纳入 103 场景 quick 子集；sweep workflow 同时保留 converge 轨道并扩展 scenarios 的 default/soak 采集。
- `collect.ts` 与 scenario harness 统一采集 `memory` / `diagnostics` / `soak` 证据，报告中补齐 evidence meta，确保“规模化边界”可回放。
- `tuning.recommend.ts` 与 quick summary 增加按切片定位的建议输出，把回归信号直接映射为可执行动作。

### 放弃方案与原因

- 放弃“对历史 baseline 直接做 strict diff 并下硬结论”：因 matrix requiredEvidence 扩展导致 `matrixHash` 漂移，不可比；改为 `diff:triage` 只输出线索。
- 放弃“把 tail-recheck 直接套到 scenarios suite”：该机制基于 converge 的 dirtyRootsRatio / relative 预算语义，与场景套件不匹配；改为在产物中显式标注 `not_applicable`。
- 放弃“再造一套场景专用采集脚本”：会形成并行真相源；最终继续复用统一 `PerfReport/PerfDiff` 管道。

### 结果证据

- diff/summary/tail-recheck：`specs/103-browser-real-project-perf/perf/diff.baseline__head.darwin-arm64.local.default.json`、`summary.md`、`tail-recheck-summary.json`
- soak/recommendations：`specs/103-browser-real-project-perf/perf/soak.darwin-arm64.local.json`、`recommendations.darwin-arm64.local.md`
- 验证归档：`verification.typecheck.txt`、`verification.lint.txt`、`verification.browser.txt`、`verification.test-turbo.txt`
