# Review Report: 067-action-surface-manifest

**Status**: APPROVED
**Digest**: DONE (2026-01-02) — 已回写到 `spec.md` / `plan.md` / `tasks.md` / `quickstart.md`
**Reviewer**: Antigravity
**Date**: 2026-01-02

## 0. Assumptions

- No codebase access; referenced paths in `packages/logix-core` not verified.

## 1. 执行摘要 (Executive Summary)

- 一句话裁决：设计扎实，Spec 与 Plan 对齐度极高，Constituion Check 完备；Action Token 与 Effects 注册面的引入填补了 Runtime → Studio 全双工链路的关键缺口。
- Top 3 issues（若有）：
  1. 需要确保 `tasks.md` 生成（当前缺失）。
  2. 需重点验证“Manifest 大小超限时的确定性截断”行为（SC-006）。
  3. 需确保旧版字符串 dispatch 在新架构下的兼容性（FR-009）。

## 2. 必须修改 (Blockers)

> 只列会阻塞进入实现/拆任务的点

- 无。

## 3. 风险与建议 (Risks & Recommendations)

- R101 [MINOR] [Suggestion] Manifest 截断策略需明确验证

  - 风险：当 Action 数量巨大导致 Manifest > 64KB 时，如果截断策略不确定（如随机截断），会导致 Studio 每次看到的 Action 列表抖动。
  - 建议：在 `tasks.md` 中增加专门针对 SC-006 的测试任务，特别是“确定性截断”的验证（e.g. 总是截断尾部，或按字母序保留头部）。
  - 验证：单元测试构造超大 Actions 集合，验证多次生成的 Manifest hash 一致且截断点一致。

- R102 [MINOR] [Suggestion] `ActionToken` 与 `Schema` 混合定义的类型推导体验
  - 风险：允许 `actions` 混合使用 Schema 对象与 Token 对象可能导致 TS 类型推导变慢或在 IDE 中提示不直观。
  - 建议：在快速开始或文档中明确推荐一种“最佳实践”写法（例如全 Schema 或全 Token），尽量减少混合写法的使用，除非必要。
  - 验证：在 DX 测试中包含混合定义的 benchmark。

## 4. 技术分析 (Technical Analysis)

- **架构合理性**：通过 `Module.make` 规范化 ActionToken 并固化 `actionTag = key`，消除了长期以来 Action 标识的二义性；将 Effects 提升为注册面是治理副作用的正确方向，与 Logix-as-React 理念一致。
- **与仓库既有约定对齐点**：
  - 严格遵守了 Constitution 2.6.0 的 "Forward-only" 与 "Unified Minimal IR"。
  - 性能与可诊断性优先（NFR-001/SC-004）在 Plan 中有详细的证据计划。
- **可实施性与复杂度**：Plan 将核心逻辑落在 `logix-core`，消费侧落在 Devtools/Sandbox，分层清晰。复杂度主要集中在 `Reflection.extractManifest` 的实现，风险可控。

## 5. 宪法与质量门检查 (Constitution Check)

- 性能与可诊断性：PASS — Plan 已包含详细的 Perf Evidence Plan 与 Budget。
- IR/锚点漂移风险：PASS — ActionRef 定义清晰 (`moduleId + actionTag`)。
- 稳定标识（instanceId/txnSeq/opSeq）：PASS — 沿用现有模型，未引入随机性。
- 事务窗口（禁止 IO）：PASS — 明确 Effects 在事务外执行。
- 破坏性变更与迁移说明：PASS — 明确 forward-only，ActionTag 规则变更视为协议升级。
- public submodules / internal 分层：PASS — Project Structure 清晰定义了 `src/*.ts` 与 `src/internal/**`。

## 6. 覆盖与漂移 (Coverage & Drift)

- 未覆盖的 FR/NFR/SC：无明显缺口。
- plan ↔ tasks 漂移点：`tasks.md` 尚未生成（预期内）。

## 7. Next Actions

- 把本文件保存为 `specs/067-action-surface-manifest/review.md`。
- 回到 speckit 会话，执行：`$speckit plan-from-review 067`（这将自动触发后续流程）。
- 执行 `$speckit tasks` 生成任务清单。
