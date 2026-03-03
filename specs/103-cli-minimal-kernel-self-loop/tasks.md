---
description: "Task list for 103-cli-minimal-kernel-self-loop"
---

# Tasks: Logix CLI 最小内核 + 自扩展 + 自验证闭环

**Input**: `specs/103-cli-minimal-kernel-self-loop/spec.md`  
**Prerequisites**: `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: 本特性触及 CLI 协议与门禁闭环，测试为必需项（contracts + integration + verify-loop 样例）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（无直接依赖）
- **[US1..US5]**: 对应 `spec.md` 用户故事
- 每个任务包含明确文件路径

---

## Phase 1: Setup（规格与骨架对齐）

- [x] T001 创建 103 协议与扩展目录骨架 `packages/logix-cli/src/internal/protocol/`、`packages/logix-cli/src/internal/extension-host/`、`packages/logix-cli/src/internal/verify-loop/`
- [x] T002 [P] 增加 103 契约入口索引与 README 回链 `specs/103-cli-minimal-kernel-self-loop/contracts/README.md`
- [x] T003 [P] 新增 103 schema 载入测试骨架 `packages/logix-cli/test/Contracts/Contracts.103.Schemas.test.ts`

---

## Phase 2: Foundational（阻塞层）

**⚠️ CRITICAL**: 本阶段完成前，不进入任何用户故事实现。

- [x] T004 实现 `CommandRegistry` 真值源（help/describe/dispatch 同源）`packages/logix-cli/src/Commands.ts`
- [x] T005 [P] 定义协议核心类型 `ControlCommand/ControlEvent/ControlState/CommandResultV2` `packages/logix-cli/src/internal/protocol/types.ts`
- [x] T006 [P] 实现稳定标识分配器 `instanceId/txnSeq/opSeq/attemptSeq` `packages/logix-cli/src/internal/protocol/identity.ts`
- [x] T007 实现统一结果构造与退出码映射 `packages/logix-cli/src/internal/protocol/resultV2.ts`
- [x] T008 [P] 实现 reason catalog 校验器（未知码 fail-fast）`packages/logix-cli/src/internal/protocol/reasonCatalog.ts`
- [x] T069 [P] 同步 reason catalog：按 runtime/governance gate 集合维护稳定 reason code 映射 `specs/103-cli-minimal-kernel-self-loop/contracts/reason-catalog.md`
- [x] T009 [P] 增加 `CommandResult@v2` 合同测试 `packages/logix-cli/test/Contracts/Contracts.103.CommandResultV2.test.ts`
- [x] T010 增加 registry 一致性测试（help/describe/dispatch）`packages/logix-cli/test/Integration/cli.registry-truthfulness.test.ts`
- [x] T054 [P] 收紧 `command-result.v2` schema：unknown field fail-fast + stable IDs required + nextActions DSL 最小字段 `specs/103-cli-minimal-kernel-self-loop/contracts/schemas/command-result.v2.schema.json`
- [x] T055 [P] 收紧 `extension-manifest.v1` schema：根与子对象 fail-fast（保留 `ext` 扩展槽）`specs/103-cli-minimal-kernel-self-loop/contracts/schemas/extension-manifest.v1.schema.json`
- [x] T056 [P] 合同测试：unknown field 注入必须 fail-fast（result/manifest）`packages/logix-cli/test/Contracts/Contracts.103.FailFastUnknownFields.test.ts`

**Checkpoint**: 协议核成立，可机读、可验证、可重放。

---

## Phase 2.1: 控制流水线与预检强化（思想吸收项）

**Goal**: 以“吸收思想不照搬实现”的方式补齐规划强化项。  
**Independent Test**: 流水线阶段可观测、配置来源可解释、非 TTY 危险写默认拒绝。

- [x] T041 实现五段式控制流水线编排器（parse/normalize/validate/execute/emit）`packages/logix-cli/src/internal/runtime/pipeline.ts`
- [x] T042 [P] 实现配置优先级解析与来源追踪（defaults/profile/env/argv）`packages/logix-cli/src/internal/runtime/configResolution.ts`
- [x] T043 [P] 实现 preflight 前置校验（互斥参数、路径可写、会话名合法）`packages/logix-cli/src/internal/runtime/preflight.ts`
- [x] T044 [P] 集成测试：配置覆盖链与最终值来源可解释 `packages/logix-cli/test/Integration/cli.config-precedence.trace.test.ts`
- [x] T045 [P] 集成测试：non-TTY 危险写默认拒绝并返回结构化 reason code `packages/logix-cli/test/Integration/cli.non-tty-dangerous-write-deny.test.ts`
- [x] T037 [P] 补充 `describe --json` 能力快照（protocol/capabilities/availability）`packages/logix-cli/src/internal/commands/describe.ts`
- [x] T061 实现事务窗口守卫（禁止 txn 内 IO/async 逃逸）`packages/logix-cli/src/internal/runtime/txnGuard.ts`
- [x] T062 [P] 集成测试：事务窗口违规必须阻断并产生日志事件 `packages/logix-cli/test/Integration/cli.txn-window.guard.test.ts`

---

## Phase 3: User Story 1 - 稳定控制协议（Priority: P1）

**Goal**: 外部 Agent 获得稳定协议输出并可据此编排下一步。  
**Independent Test**: 同语义输入重复运行，结果可比对一致。

- [x] T011 [US1] 把现有子命令输出迁移为 `CommandResult@v2` `packages/logix-cli/src/internal/commands/*.ts`
- [x] T012 [P] [US1] 在结果中加入 `nextActions[]` 与 `trajectory` `packages/logix-cli/src/internal/protocol/resultV2.ts`
- [x] T013 [P] [US1] 产出 `control.events.json` artifact `packages/logix-cli/src/internal/protocol/eventsArtifact.ts`
- [x] T014 [US1] 集成测试：协议字段完整性与可序列化 `packages/logix-cli/test/Integration/cli.command-result-v2.fields.test.ts`
- [x] T015 [P] [US1] 集成测试：同输入稳定输出（排除显式允许差异）`packages/logix-cli/test/Integration/cli.command-result-v2.determinism.test.ts`

---

## Phase 4: User Story 2 - 策略外移扩展层（Priority: P1）

**Goal**: 核心协议不含项目语义，策略通过扩展注入。  
**Independent Test**: 替换策略扩展无需修改核心协议核。

- [x] T016 [US2] 定义 Extension Host Runtime 接口与生命周期 `packages/logix-cli/src/internal/extension-host/runtime.ts`
- [x] T017 [P] [US2] 实现 `extension.manifest` 校验与版本协商 `packages/logix-cli/src/internal/extension-host/manifest.ts`
- [x] T018 [P] [US2] 实现能力白名单与 internal import 防护 `packages/logix-cli/src/internal/extension-host/capabilities.ts`
- [x] T019 [US2] 实现扩展加载执行链（before/after hooks）`packages/logix-cli/src/internal/extension-host/executor.ts`
- [x] T020 [P] [US2] 合同测试：manifest 不兼容/无效时 fail-fast `packages/logix-cli/test/Contracts/Contracts.103.ExtensionManifest.test.ts`
- [x] T021 [P] [US2] 集成测试：核心字段无项目语义泄漏 `packages/logix-cli/test/Integration/cli.no-project-semantics-leak.test.ts`

---

## Phase 5: User Story 3 - verify-loop 硬门闭环（Priority: P1）

**Goal**: 落地可机器执行的验证链并形成 verdict。  
**Independent Test**: 违规/可重试/无进展均能稳定判定。

- [x] T022 [US3] 实现 verify-loop 状态机与 verdict 映射 `packages/logix-cli/src/internal/verify-loop/stateMachine.ts`
- [x] T023 [P] [US3] 实现 runtime gate runner（gate:type/gate:lint/gate:test/gate:control-surface-artifact/gate:diagnostics-protocol），不包含 governance gates `packages/logix-cli/src/internal/verify-loop/gates.ts`
- [x] T024 [P] [US3] 实现 no-progress 检测与重试预算控制 `packages/logix-cli/src/internal/verify-loop/retryPolicy.ts`
- [x] T025 [US3] 暴露 `logix verify-loop` 命令入口 `packages/logix-cli/src/internal/commands/verifyLoop.ts`
- [x] T026 [P] [US3] 集成测试：违规返回 `exitCode=2` + reason catalog `packages/logix-cli/test/Integration/cli.verify-loop.violation.test.ts`
- [x] T027 [P] [US3] 集成测试：可重试返回 `exitCode=3` 且 attempt 轨迹递增 `packages/logix-cli/test/Integration/cli.verify-loop.retryable.test.ts`
- [x] T028 [P] [US3] 集成测试：无进展返回 `exitCode=5` `packages/logix-cli/test/Integration/cli.verify-loop.no-progress.test.ts`
- [x] T046 [US3] 实现瞬态错误分类器（EAGAIN/EOF/ECONN* -> RETRYABLE）`packages/logix-cli/src/internal/verify-loop/transientClassifier.ts`
- [x] T047 [P] [US3] 集成测试：瞬态错误映射为 `RETRYABLE(exitCode=3)` `packages/logix-cli/test/Integration/cli.verify-loop.transient-retryable.test.ts`
- [x] T057 [US3] 新增 `verify-loop.report` 字段级 schema `specs/103-cli-minimal-kernel-self-loop/contracts/schemas/verify-loop.report.v1.schema.json`
- [x] T058 [US3] 实现 report 生成器（含稳定 IDs、gateResults、reasonCode、nextActions）`packages/logix-cli/src/internal/verify-loop/report.ts`
- [x] T059 [P] [US3] 合同测试：`verify-loop.report.json` 通过 schema 校验 `packages/logix-cli/test/Contracts/Contracts.103.VerifyLoopReport.test.ts`
- [x] T060 [P] [US3] 集成测试：unknown field 注入 report 时 fail-fast + verdict/exitCode 对齐 `packages/logix-cli/test/Integration/cli.verify-loop.report-contract.test.ts`
- [x] T065 [US3] 定义 verify-loop run/resume 输入契约并接线命令参数 `specs/103-cli-minimal-kernel-self-loop/contracts/verify-loop.md`
- [x] T066 [P] [US3] 集成测试：run/resume 多轮 attempt 轨迹可关联回放 `packages/logix-cli/test/Integration/cli.verify-loop.resume-trace.test.ts`
- [x] T067 [US3] 新增 `verify-loop.input` schema（run/resume + previousRunId 约束）`specs/103-cli-minimal-kernel-self-loop/contracts/schemas/verify-loop.input.v1.schema.json`
- [x] T068 [P] [US3] 合同测试：`verdict <-> exitCode` 映射非法组合必须被 schema 阻断 `packages/logix-cli/test/Contracts/Contracts.103.VerifyLoopVerdictExitCode.test.ts`
- [x] T070 [P] [US3] 合同测试：`gateScope(runtime|governance)` 与 `gateResults.gate` 集合必须一致 `packages/logix-cli/test/Contracts/Contracts.103.VerifyLoopGateScope.test.ts`

---

## Phase 6: User Story 4 - 扩展热重载与回滚（Priority: P2）

**Goal**: 扩展支持受控热重载，失败自动回滚。  
**Independent Test**: 健康检查失败时自动回滚到最后健康 revision。

- [x] T029 [US4] 实现 `shadow start -> healthcheck -> atomic swap` `packages/logix-cli/src/internal/extension-host/hotReload.ts`
- [x] T030 [P] [US4] 实现 snapshot/restore state 迁移 `packages/logix-cli/src/internal/extension-host/stateMigration.ts`
- [x] T031 [P] [US4] 集成测试：热重载失败自动回滚 `packages/logix-cli/test/Integration/cli.extension.reload-rollback.test.ts`
- [x] T032 [P] [US4] 集成测试：capability 越权拒绝 `packages/logix-cli/test/Integration/cli.extension.capability-guard.test.ts`
- [x] T048 [US4] 实现 `atomic swap` 前二次策略校验 `packages/logix-cli/src/internal/extension-host/revalidateBeforeSwap.ts`
- [x] T049 [P] [US4] 集成测试：策略漂移场景下拒绝 swap 并回滚 `packages/logix-cli/test/Integration/cli.extension.policy-drift-revalidate.test.ts`
- [x] T063 [US4] 实现扩展 hook 资源预算执行器（timeout/cpu/memory/queue）`packages/logix-cli/src/internal/extension-host/resourceBudget.ts`
- [x] T064 [P] [US4] 集成测试：资源超限触发回退且宿主不崩溃 `packages/logix-cli/test/Integration/cli.extension.resource-budget.test.ts`

---

## Phase 6.5: 外部 bootstrap-loop 自举点（Out-of-CLI）

**Goal**: 形成“外部编排驱动 CLI 收敛”的里程碑，不把 loop 能力并入 logix-cli 发布物。  
**Independent Test**: 外部 Agent 在 non-TTY 条件下，自动完成 2+ 轮“实现->门禁->修复->再验证”并收敛 PASS。

- [x] T051 [US3] 产出外部编排脚本（读取 `nextActions` 自动推进，非 CLI 发布物）`specs/103-cli-minimal-kernel-self-loop/scripts/bootstrap-loop.mjs`
- [x] T052 [P] [US3] E2E 样例：两轮以上自动闭环收敛并记录 run 轨迹 `packages/logix-cli/test/Integration/cli.bootstrap-loop.e2e.test.ts`
- [x] T053 [P] [US3] 产出自举审计报告（runId/reasonCode/attempt/verdict）`specs/103-cli-minimal-kernel-self-loop/notes/bootstrap-self-bootstrap.md`

---

## Phase 7: User Story 5 - Forward-only 迁移治理（Priority: P2）

**Goal**: breaking 演进有自动化迁移保障，无兼容层。  
**Independent Test**: 缺迁移说明或缺证据的 breaking 变更被 CI 阻断。

- [x] T033 [US5] 新增迁移说明模板与映射文档 `specs/103-cli-minimal-kernel-self-loop/migration-template.md`
- [x] T034 [P] [US5] 增加协议版本/迁移检查脚本 `scripts/checks/evolution-forward-only.ts`
- [x] T035 [P] [US5] 增加 SSoT 漂移检查（核心改动必须回写文档）`scripts/checks/ssot-alignment.ts`
- [x] T036 [US5] CI 接线：加入 governance gate（gate:migration-forward-only/gate:ssot-drift/gate:perf-hard）`.github/workflows/ci.yml`
- [x] T039 [P] [US5] 性能证据采集与 diff 落盘（governance perf-hard 输入）`specs/103-cli-minimal-kernel-self-loop/perf/*.json`
- [x] T040 [US5] 运行并记录 governance gate 结果（gate:migration-forward-only/gate:ssot-drift/gate:perf-hard，另见 T050 的 no-copy gate；同时记录 base 与 worktree 两套口径）`specs/103-cli-minimal-kernel-self-loop/notes/verification.md`

---

## Phase 8: Polish & Cross-Cutting

- [x] T038 [P] 补齐 quickstart 的无人闭环示例与失败演练 `specs/103-cli-minimal-kernel-self-loop/quickstart.md`
- [x] T050 [P] 增加“反照搬守则”检查（禁止随机 ID、粗粒度 exit code、未登记 reason code）`scripts/checks/protocol-antipatterns.ts`

---

## Phase 9: Round-1 后续需求增量（未完成）

**Goal**: 把“静态工件闭环”推进到“可执行自治闭环”，并清空公开命令面的 `CLI_NOT_IMPLEMENTED`。  
**Independent Test**: 在 `examples/logix` 上完成 `describe -> ir export -> trialrun -> ir validate(profile contract) -> ir diff -> transform.module(report)` 全链路，并产出统一 `verdict.json`。

- [x] T071 [US1] 将 `describe` 升级为运行时真相投影（命令可见性=可执行性）`packages/logix-cli/src/internal/commands/describe.ts`
- [x] T072 [P] [US1] 集成测试：禁止 ghost command（可见但不可执行）`packages/logix-cli/test/Integration/cli.describe-runtime-truth.test.ts`
- [x] T073 [US3] 实现 `trialrun` 最小可执行路径与 `trialrun.report.json` 产物 `packages/logix-cli/src/internal/commands/trialRun.ts`
- [x] T074 [P] [US3] 集成测试：`trialrun` 同输入双次重跑稳定标识链一致 `packages/logix-cli/test/Integration/cli.trialrun.determinism.test.ts`
- [x] T075 [US5] 命令合并迁移：`contract-suite.run -> ir validate --profile contract`（旧入口返回 `E_CLI_COMMAND_MERGED`）`packages/logix-cli/src/internal/commands/contractSuiteRun.ts`
- [x] T076 [P] [US5] 命令合并迁移：`spy.evidence -> trialrun --emit evidence`（旧入口返回 `E_CLI_COMMAND_MERGED`）`packages/logix-cli/src/internal/commands/spyEvidence.ts`
- [x] T077 [P] [US5] 命令合并迁移：`anchor.index -> ir export --with-anchors`（旧入口返回 `E_CLI_COMMAND_MERGED`）`packages/logix-cli/src/internal/commands/anchorIndex.ts`
- [x] T078 [P] [US5] 更新 reason catalog / migration 文档（新增 `E_CLI_COMMAND_MERGED` 与迁移动作）`specs/103-cli-minimal-kernel-self-loop/contracts/reason-catalog.md`
- [x] T079 [US4] 实现 `transform.module` 最小原语（insert/remove/replace）并保持 report-first `packages/logix-cli/src/internal/commands/transformModule.ts`
- [x] T080 [P] [US4] 集成测试：`transform.module --mode report` 报告可解释且确定性稳定 `packages/logix-cli/test/Integration/cli.transform-module.report.test.ts`
- [x] T081 [US3] 增加 `ir validate --profile contract` 与契约产物校验 `packages/logix-cli/src/internal/commands/irValidate.ts`
- [x] T082 [P] [US3] 集成测试：`trialrun --emit evidence` 产出 `trace.slim.json/evidence.json` `packages/logix-cli/test/Integration/cli.trialrun.evidence.test.ts`
- [x] T083 [US3] 新增 examples 自治闭环脚本（static->dynamic->contract->decision->verdict）`examples/logix/scripts/cli-autonomous-loop.mjs`
- [x] T084 [P] [US3] 新增自治闭环 E2E 测试（含 `verdict.json/checksums.sha256`）`packages/logix-cli/test/Integration/cli.autonomous-loop.examples.e2e.test.ts`
- [x] T085 [US5] CI 接线：新增 `verify-autonomous-loop` 门禁任务并设为阻断 `.github/workflows/ci.yml`
- [x] T086 [P] 补齐 quickstart/contracts 对“命令合并迁移 + 自治闭环门禁”的用户指引 `specs/103-cli-minimal-kernel-self-loop/quickstart.md`

---

## Phase 10: Round-2 后续需求增量（真实执行器 + 单一真相源 + examples-real）

**Goal**: 把 verify-loop/nextActions/identity/extension-control-surface 推进到真实可执行闭环，并在 examples-real 上形成 CI 阻断里程碑。  
**Independent Test**: 在 `examples/logix` 真实工程上完成至少两轮 `run -> resume` 收敛，并产出可校验 `verdict.json/checksums.sha256`。

- [x] T087 [US3] 补齐 verify-loop 真实 gate 执行器契约（runtime/governance 命令清单与轨迹字段）`specs/103-cli-minimal-kernel-self-loop/contracts/verify-loop.md`；验收：`pnpm -C packages/logix-cli vitest run test/Contracts/Contracts.103.VerifyLoopInput.test.ts test/Contracts/Contracts.103.VerifyLoopGateScope.test.ts` 通过。
- [x] T088 [US3] 实现统一 real gate 执行编排器（`gateScope` 仅决定 gate 集合，不决定是否执行）`packages/logix-cli/src/internal/verify-loop/realGateExecutor.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.verify-loop.target-alias.test.ts test/Integration/cli.verify-loop.gate-scope.test.ts` 通过。
- [x] T089 [P] [US3] 集成测试：`gateScope=runtime` 执行真实 runtime gate 并输出命令轨迹 `packages/logix-cli/test/Integration/cli.verify-loop.gate-scope.test.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.verify-loop.gate-scope.test.ts` 通过。
- [x] T090 [P] [US5] 集成测试：`gateScope=governance` 执行真实 governance gate 且失败阻断 `packages/logix-cli/test/Integration/cli.verify-loop.gate-scope.test.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.verify-loop.gate-scope.test.ts` 通过。
- [x] T091 [US1] 定义 `nextActions` canonical DSL（`id/action/args` 必填，禁止硬编码隐式参数）`specs/103-cli-minimal-kernel-self-loop/contracts/verify-loop.md`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.next-actions.dsl-no-hardcode.e2e.test.ts` 通过。
- [x] T092 [US3] 实现 bootstrap-loop DSL 执行器（直接消费 `action+args`，移除硬编码分支）`specs/103-cli-minimal-kernel-self-loop/scripts/bootstrap-loop.mjs`；验收：`node specs/103-cli-minimal-kernel-self-loop/scripts/bootstrap-loop.mjs --runIdPrefix phase10-dsl --gateScope runtime --target fixture:retryable --retryTarget fixture:pass --maxRounds 3 --maxAttempts 3 --outDir .artifacts/phase10-dsl --auditFile .artifacts/phase10-dsl/audit.json` 退出码为 `0`。
- [x] T093 [P] [US3] 实现 autonomous-loop DSL 执行器（bootstrap/autonomous 共用 canonical DSL）`examples/logix/scripts/cli-autonomous-loop.mjs`；验收：`node examples/logix/scripts/cli-autonomous-loop.mjs --runIdPrefix phase10-autonomous --outDir .artifacts/phase10-autonomous --entry examples/logix/src/runtime/root.impl.ts#RootImpl --verifyTarget examples/logix --gateScope runtime --maxAttempts 3` 退出码为 `0`。
- [x] T094 [P] [US3] E2E 测试：bootstrap/autonomous 不允许 action 分支硬编码兜底 `packages/logix-cli/test/Integration/cli.next-actions.dsl-no-hardcode.e2e.test.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.next-actions.dsl-no-hardcode.e2e.test.ts` 通过。
- [x] T095 [US3] 统一 identity 单一真相源（run/resume 共享 identity allocator）`packages/logix-cli/src/internal/protocol/identity.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Contracts/Contracts.103.IdentityChainConsistency.test.ts` 通过。
- [x] T096 [P] [US3] 合同测试：`instanceId/attemptSeq/txnSeq/opSeq` 在 result/report/verdict 三工件一致 `packages/logix-cli/test/Contracts/Contracts.103.IdentityChainConsistency.test.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Contracts/Contracts.103.IdentityChainConsistency.test.ts` 通过。
- [x] T097 [P] [US3] 集成测试：resume 只能推进 `attemptSeq`，禁止重置 `instanceId/txnSeq/opSeq` `packages/logix-cli/test/Integration/cli.verify-loop.resume-identity-monotonic.test.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.verify-loop.resume-identity-monotonic.test.ts` 通过。
- [x] T098 [US3] 实现 identity 漂移 fail-fast（输入 identity 与既有轨迹不一致直接 `VIOLATION`）`packages/logix-cli/test/Integration/cli.verify-loop.identity-drift-violation.test.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.verify-loop.identity-drift-violation.test.ts` 通过。
- [x] T099 [US4] 接线 extension 控制面最小命令：`validate/load/reload/status + stateFile` `packages/logix-cli/src/internal/commands/extension*.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.extension.control-surface.commands.test.ts` 通过。
- [x] T100 [P] [US4] 集成测试：`extension status` 与 `reload` 只读取/更新 `stateFile`（单一真相源）`packages/logix-cli/test/Integration/cli.extension.state-file.sot.test.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.extension.state-file.sot.test.ts` 通过。
- [x] T101 [US3] 新增 examples-real 自举里程碑 E2E（至少两轮 `run -> resume` 并产出 `verdict.json/checksums.sha256`）`packages/logix-cli/test/Integration/cli.autonomous-loop.examples.e2e.test.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.autonomous-loop.examples.e2e.test.ts` 通过。
- [x] T102 [US5] CI 接线 `self-bootstrap-readiness@examples-real` 阻断门 `.github/workflows/ci.yml`；验收：`pnpm run verify:self-bootstrap-readiness-examples-real` 返回 `0`，且 CI job 失败时阻断合并。

---

## Phase 11: Scenario-Driven 缺口补齐（Wave A/B/C）

**Goal**: 把“命令级 primitives 可用”推进到“业务场景级闭环可执行”，并按 P0/P1/P2 缺口分波次清空。  
**Input Baseline**: `analysis/scenario-orthogonal-decomposition.md` + `analysis/scenario-cli-coverage-matrix.md` + `analysis/gap-backlog.md` + `analysis/remediation-blueprint.md`。  
**Independent Test**: 场景 S01-S10 从 `0 covered / 9 partial / 1 missing` 收敛到 `0 covered / 10 partial / 0 missing`（先消灭 `missing`，再逐步提升 `covered`）。

- [x] T103 [US1] 固化场景索引契约（S01-S10、场景语义、推荐命令链）`specs/103-cli-minimal-kernel-self-loop/contracts/scenario-index.md`；验收：`pnpm -C packages/logix-cli vitest run test/Contracts/Contracts.103.ScenarioIndex.test.ts` 通过。
- [x] T104 [US3] 定义 `scenario-playbook.input.v1` schema（primitives 命令链 + 动作序列 + 断言 + fixture）`specs/103-cli-minimal-kernel-self-loop/contracts/schemas/scenario-playbook.input.v1.schema.json`；验收：`pnpm -C packages/logix-cli vitest run test/Contracts/Contracts.103.ScenarioPlaybookInput.test.ts` 通过。
- [x] T105 [US3] 定义 `scenario-playbook.report.v1` / `scenario.verdict.v1` schema（统一场景工件）`specs/103-cli-minimal-kernel-self-loop/contracts/schemas/scenario-playbook.report.v1.schema.json`、`specs/103-cli-minimal-kernel-self-loop/contracts/schemas/scenario.verdict.v1.schema.json`；验收：`pnpm -C packages/logix-cli vitest run test/Contracts/Contracts.103.ScenarioPlaybookReport.test.ts` 通过。
- [x] T106 [US3] 实现基于 primitives 的场景编排脚本（不新增子命令）`specs/103-cli-minimal-kernel-self-loop/scripts/scenario-playbook-runner.mjs`；验收：`node specs/103-cli-minimal-kernel-self-loop/scripts/scenario-playbook-runner.mjs --input specs/103-cli-minimal-kernel-self-loop/contracts/examples/s01.playbook.json --outDir .artifacts/scenario-s01` 退出码为 `0`。
- [x] T107 [US3] 将场景编排接入现有 primitives（`describe/ir export/trialrun/ir validate/ir diff/transform.module/next-actions exec/verify-loop`）并统一产物落盘 `specs/103-cli-minimal-kernel-self-loop/scripts/scenario-playbook-runner.mjs`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.scenario-playbook.primitives-chain.test.ts` 通过。
- [x] T108 [P] [US3] 集成测试：S01/S03/S06 三类场景 playbook 可重放且双次可比 `packages/logix-cli/test/Integration/cli.scenario-playbook.replay.test.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.scenario-playbook.replay.test.ts` 通过。
- [x] T109 [US3] 统一场景级 verdict 聚合产物（`scenario.verdict.json` + checksum）`specs/103-cli-minimal-kernel-self-loop/scripts/scenario-playbook-runner.mjs`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.scenario-verdict.aggregate.test.ts` 通过。
- [x] T110 [P] [US3] reason -> remediation actions 场景化映射（覆盖 S03/S04/S09）`specs/103-cli-minimal-kernel-self-loop/contracts/scenario-remediation-map.md`、`specs/103-cli-minimal-kernel-self-loop/contracts/reason-catalog.md`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.scenario-remediation-actions.test.ts` 通过。
- [x] T111 [US1] `describe` 增补场景索引投影（保持核心协议无项目语义污染）`packages/logix-cli/src/internal/commands/describe.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.describe.scenario-projection.test.ts` 通过。
- [x] T112 [P] [US3] 集成测试：S08 外部源同步场景从 `missing` 提升到 `partial/covered` `packages/logix-cli/test/Integration/cli.scenario.external-source-sync.test.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.scenario.external-source-sync.test.ts` 通过。
- [x] T113 [US3] `ir validate` 新增 cross-module profile（S02/S07）`packages/logix-cli/src/internal/commands/irValidate.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.ir-validate.cross-module-profile.test.ts` 通过。
- [x] T114 [P] [US3] 场景 playbook 支持时间预算/超时断言（S06）`specs/103-cli-minimal-kernel-self-loop/contracts/schemas/scenario-playbook.input.v1.schema.json`、`specs/103-cli-minimal-kernel-self-loop/scripts/scenario-playbook-runner.mjs`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.scenario-playbook.time-budget.test.ts` 通过。
- [x] T115 [P] [US3] 外部源/导入 fixture adapter 协议化（S05/S08）`specs/103-cli-minimal-kernel-self-loop/contracts/schemas/scenario-playbook.input.v1.schema.json`、`specs/103-cli-minimal-kernel-self-loop/scripts/scenario-fixture-adapter.mjs`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.scenario-fixture-adapter.test.ts` 通过。
- [x] T116 [US5] 产出场景覆盖率报告（covered/partial/missing）并接入 CI 阻断阈值 `scripts/checks/scenario-coverage.ts`、`.github/workflows/ci.yml`；验收：`pnpm run check:scenario-coverage` 返回 `0`。
- [x] T117 [P] 文档收口：README 场景优先叙事（用户视角 + Agent 视角）`packages/logix-cli/README.md`、`packages/logix-cli/README.zh.md`；验收：README 含 `场景 -> 命令链 -> 证据 -> 决策` 完整路径。
- [x] T118 [P] 更新 103 quickstart/tasks 与 analysis 回链，形成单一实施导航 `specs/103-cli-minimal-kernel-self-loop/quickstart.md`、`specs/103-cli-minimal-kernel-self-loop/tasks.md`；验收：`analysis/*` 中每个 P0 gap 至少绑定 1 个可执行任务。

---

## Phase 12: M1 收口（Primitives-first + Facts Gate）

**Goal**: 从“场景外显”收口到“用户只感知 primitives”，并把覆盖率 gate 从 markdown 解析迁移到事实产物驱动。  
**Independent Test**: `describe/help` 默认只暴露 primary 命令；场景投影默认隐藏；CI 的 Scenario Coverage 以 `verification.bundle.json` 为输入源。

- [x] T119 [US1] 命令面可见性分层（`primary` vs `migration`）并冻结帮助输出分区 `packages/logix-cli/src/internal/commandRegistry.ts`、`packages/logix-cli/src/Commands.ts`、`packages/logix-cli/test/Contracts/Contracts.103.CommandSurface.freeze.test.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Contracts/Contracts.103.CommandSurface.freeze.test.ts` 通过。
- [x] T120 [US1] `describe` 默认隐藏场景投影，仅在 `LOGIX_DESCRIBE_INTERNAL=1` 输出 `ext.internal.orchestration` `packages/logix-cli/src/internal/commands/describe.ts`、`packages/logix-cli/test/Integration/cli.describe.scenario-projection.test.ts`；验收：`pnpm -C packages/logix-cli vitest run test/Integration/cli.describe.scenario-projection.test.ts` 通过。
- [x] T121 [US5] 场景覆盖率 facts 化（`scenario-suite-runner` + `verification.bundle` + facts checker）并接入 CI `specs/103-cli-minimal-kernel-self-loop/scripts/scenario-suite-runner.mjs`、`scripts/checks/scenario-coverage-facts.ts`、`package.json`、`.github/workflows/ci.yml`；验收：`pnpm run check:scenario-coverage` 返回 `0`。
- [x] T122 [P] 文档回摆到 primitives-first，场景链路降级为内部附录 `packages/logix-cli/README.md`、`packages/logix-cli/README.zh.md`、`specs/103-cli-minimal-kernel-self-loop/quickstart.md`；验收：默认叙事不依赖场景命令链，且 quickstart 明确 facts gate 输入源为 `verification.bundle.json`。

---

## Phase 13: M2 Core-First 判定内核下沉

**Goal**: 把 `ir validate` / `trialrun` 的判定语义下沉到 `logix-core`，CLI 仅保留命令编排与 I/O 包装。  
**Independent Test**: `logix-core` 暴露可复用的控制面校验与 trialrun 判定 API；`logix-cli` 保持现有行为与 reasonCode 稳定。

- [x] T123 [US1] 在 `logix-core/Reflection` 新增控制面校验 API（digest seed、known-file 校验、workflow linkage、cross-module 约束）`packages/logix-core/src/internal/reflection/controlPlaneValidation.ts`、`packages/logix-core/src/Reflection.ts`；验收：`pnpm -C packages/logix-core exec vitest run test/Reflection.controlPlaneValidation.test.ts` 通过。
- [x] T124 [US3] 在 `logix-core/Reflection` 新增 trialrun 判定 API（failure reason 列表、summary reasonCode、summary verdict）`packages/logix-core/src/internal/reflection/controlPlaneValidation.ts`、`packages/logix-core/src/Reflection.ts`；验收：同 T123。
- [x] T125 [US3] `ir.validate` 改为调用 core 判定 API（CLI 仅做文件读取/落盘）`packages/logix-cli/src/internal/commands/irValidate.ts`；验收：`pnpm -C packages/logix-cli exec vitest run test/Integration/cli.ir-validate.profile-contract.test.ts test/Integration/cli.ir-validate.profile-contract.pass.test.ts test/Integration/cli.ir-validate.cross-module-profile.test.ts` 通过。
- [x] T126 [US3] `trialrun` 改为调用 core 判定 API（CLI 仅做执行编排/工件包装）`packages/logix-cli/src/internal/commands/trialRun.ts`；验收：`pnpm -C packages/logix-cli exec vitest run test/Integration/cli.trialrun.evidence.test.ts test/Integration/cli.trialrun.missing-services.test.ts test/Integration/cli.trialrun.determinism.test.ts` 通过。

---

## Phase 14: M3 Entry 控制面投影下沉（Core-First + CLI Thin）

**Goal**: 把 entry 级 `control-surface/workflow-surface` 生成逻辑下沉到 `logix-core`，CLI 仅消费投影结果并保持协议稳定。  
**Independent Test**: `ir.export`/`trialrun` 使用 core 投影后仍保持可执行、可验证、可重放，facts gate 继续通过。

- [x] T127 [US1] 在 `logix-core/Reflection` 新增 entry 控制面投影 API（manifest + workflowSurfaces）`packages/logix-core/src/internal/reflection/controlPlaneEntryProjection.ts`、`packages/logix-core/src/Reflection.ts`；验收：`pnpm -C packages/logix-core exec vitest run test/Reflection.controlPlaneValidation.test.ts` 通过。
- [x] T128 [US1] `workflowSurface` 改为 core 薄包装（直接消费 entry 投影，移除 source 反推 entry）`packages/logix-cli/src/internal/commands/workflowSurface.ts`；验收：`pnpm -C packages/logix-cli typecheck:test` 通过。
- [x] T129 [US3] `ir.export`/`trialrun` 接线 entry 投影并保持 `CommandResult@v2` digest 协议稳定 `packages/logix-cli/src/internal/commands/irExport.ts`、`packages/logix-cli/src/internal/commands/trialRun.ts`；验收：`pnpm -C packages/logix-cli exec vitest run test/Integration/cli.ir-export.projection.test.ts test/Integration/cli.ir-validate.profile-contract.pass.test.ts test/Integration/cli.ir-validate.profile-contract.test.ts test/Integration/cli.trialrun.determinism.test.ts test/Integration/cli.trialrun.evidence.test.ts test/Integration/cli.trialrun.missing-services.test.ts` 通过。
- [x] T130 [P] [US5] 复跑 `describe/command-surface` 与 scenario facts gate，确认 M3 无侧向回归 `packages/logix-cli/test/Integration/cli.describe-json.test.ts`、`packages/logix-cli/test/Integration/cli.describe-runtime-truth.test.ts`、`packages/logix-cli/test/Integration/cli.describe.scenario-projection.test.ts`、`packages/logix-cli/test/Contracts/Contracts.103.CommandSurface.freeze.test.ts`、`scripts/checks/scenario-coverage-facts.ts`；验收：`pnpm run check:scenario-coverage` 返回 `0`。

---

## Phase 15: M4 Primitives 可发现性增强（无新命令）

**Goal**: 在不新增命令、不引入场景语义的前提下，增强 Agent 对 primitives 验证链的可发现性。  
**Independent Test**: `describe.report.json` 默认包含 `agentGuidance.verificationChains`，且链路仅引用 primary 可执行命令。

- [x] T131 [US1] `describe` 新增 `agentGuidance.verificationChains`（static-contract/dynamic-evidence/change-safety/closure-ready）`packages/logix-cli/src/internal/commands/describe.ts`；验收：`pnpm -C packages/logix-cli exec vitest run test/Integration/cli.describe-json.test.ts` 通过。
- [x] T132 [P] [US1] 集成测试：guidance 链路仅包含 executable primary commands（不包含 migration/unavailable）`packages/logix-cli/test/Integration/cli.describe-runtime-truth.test.ts`；验收：`pnpm -C packages/logix-cli exec vitest run test/Integration/cli.describe-runtime-truth.test.ts` 通过。
- [x] T133 [P] [US5] 文档补充：README 中明确 `describe` 的 primitives 验证链提示用途 `packages/logix-cli/README.md`、`packages/logix-cli/README.zh.md`；验收：README 中包含 `agentGuidance.verificationChains` 说明。
- [x] T134 [US1] `describe` guidance 改为基于 `commandRegistry` 自动解析（含候选命令回退），避免 registry 演进漂移 `packages/logix-cli/src/internal/commands/describe.ts`；验收：`pnpm -C packages/logix-cli exec vitest run test/Integration/cli.describe-json.test.ts test/Integration/cli.describe-runtime-truth.test.ts` 通过。
- [x] T135 [P] [US1] 集成测试：guidance 链去重且第一步固定为 `describe`（保持 discoverability 稳定）`packages/logix-cli/test/Integration/cli.describe-runtime-truth.test.ts`；验收：同 T134。
- [x] T136 [P] [US1] guidance 补充 `expectedOutputKeys` 并由 command contract 自动推导（避免输出键文档漂移）`packages/logix-cli/src/internal/commands/describe.ts`、`packages/logix-cli/test/Integration/cli.describe-json.test.ts`、`packages/logix-cli/test/Integration/cli.describe-runtime-truth.test.ts`；验收：`pnpm -C packages/logix-cli exec vitest run test/Integration/cli.describe-json.test.ts test/Integration/cli.describe-runtime-truth.test.ts` 通过。
- [x] T137 [P] [US1] guidance 的 `expectedArtifacts` 改为由 command contract 的 `defaultArtifactFileName` 自动推导（避免文件名清单手工漂移）`packages/logix-cli/src/internal/commandRegistry.ts`、`packages/logix-cli/src/internal/commands/describe.ts`、`packages/logix-cli/test/Integration/cli.describe-runtime-truth.test.ts`；验收：`pnpm -C packages/logix-cli exec vitest run test/Integration/cli.describe-json.test.ts test/Integration/cli.describe-runtime-truth.test.ts` 通过。
- [x] T138 [US1] 新增独立 verification-chain contract 文件并在 `describe` 中接线（实现与策略模板解耦）`packages/logix-cli/src/internal/contracts/verificationChains.ts`、`packages/logix-cli/src/internal/commands/describe.ts`；验收：`pnpm -C packages/logix-cli typecheck:test` 通过。
- [x] T139 [P] [US5] 为 verification-chain catalog 与 describe report 增加 schema 校验（运行时 fail-fast）并补合同测试 `packages/logix-cli/src/internal/protocol/schemaValidation.ts`、`packages/logix-cli/test/Contracts/Contracts.103.DescribeSchema.test.ts`；验收：`pnpm -C packages/logix-cli exec vitest run test/Contracts/Contracts.103.DescribeSchema.test.ts test/Integration/cli.describe-json.test.ts` 通过。

---

## Phase 16: M5 Describe/Guidance 契约资产化（Schema SSoT 补齐）

**Goal**: 将 `describe.report` 与 `verification-chain.catalog` 从“运行时校验”推进到“可独立分发的 schema 契约资产”，减少实现与规范漂移。  
**Independent Test**: schema 文件纳入 103 contracts 索引并通过合同加载测试。

- [x] T140 [US5] 新增 `describe.report.v1` 与 `verification-chain.catalog.v1` schema 契约文件 `specs/103-cli-minimal-kernel-self-loop/contracts/schemas/describe.report.v1.schema.json`、`specs/103-cli-minimal-kernel-self-loop/contracts/schemas/verification-chain.catalog.v1.schema.json`；验收：`pnpm -C packages/logix-cli exec vitest run test/Contracts/Contracts.103.Schemas.test.ts` 通过。
- [x] T141 [P] [US5] 更新 contracts 索引与 schema 加载测试，确保新契约可被自动发现与校验 `specs/103-cli-minimal-kernel-self-loop/contracts/README.md`、`packages/logix-cli/test/Contracts/Contracts.103.Schemas.test.ts`；验收：同 T140。

---

## Phase 17: 审查收口增量（P0/P1）

**Goal**: 收口审查发现的闭环断点与契约漂移，确保 CLI 真正具备“可自动收敛”的执行底盘。  
**Independent Test**: `VERIFY_RETRYABLE` 与 `VERIFY_NO_PROGRESS` 样本均可通过 canonical nextActions 执行链推进，且无 `CLI_PROTOCOL_VIOLATION/unsupported action` 断链。

- [x] T142 [US3] 对齐 `verify-loop` 默认 `rerun(resume)` payload，显式携带 `target/instanceId/previousRunId` 并与 identity 链一致 `packages/logix-cli/src/internal/verify-loop/report.ts`、`packages/logix-cli/src/internal/commands/verifyLoop.ts`
- [x] T143 [P] [US3] 扩展 `next-actions exec` 对 canonical action 全集支持（`run-command/rerun/inspect/stop`）并定义稳定执行语义 `packages/logix-cli/src/internal/commands/nextActionsExec.ts`
- [x] T144 [P] [US3] 让 `--strict` 成为真实执行策略开关（失败处理/中断策略可区分）`packages/logix-cli/src/internal/commands/nextActionsExec.ts`、`specs/103-cli-minimal-kernel-self-loop/contracts/schemas/next-actions.execution.v1.schema.json`
- [x] T145 [P] [US3] 集成测试：`verify-loop(run)->next-actions exec->verify-loop(resume)` retryable 链路无断链 `packages/logix-cli/test/Integration/cli.verify-loop.emit-next-actions.test.ts`、`packages/logix-cli/test/Integration/cli.next-actions.exec.test.ts`
- [x] T146 [US3] real executor 让 `target` 进入实际 gate 执行作用域（而非仅探针）`packages/logix-cli/src/internal/verify-loop/realGateExecutor.ts`
- [x] T147 [P] [US3] real 路径接入瞬态错误分类与 retryable 映射 `packages/logix-cli/src/internal/verify-loop/realGateExecutor.ts`、`packages/logix-cli/src/internal/commands/verifyLoop.ts`
- [x] T148 [P] [US3] 修复 trajectory 历史 reason 覆写，保留每轮 attempt 原始 reason `packages/logix-cli/src/internal/protocol/trajectory.ts`、`packages/logix-cli/src/internal/commands/verifyLoop.ts`
- [x] T149 [US5] 对齐 runtime validator 与 contracts schema 约束（`describe.report` const/minItems、`verify-loop.input` required 策略）`packages/logix-cli/src/internal/protocol/schemaValidation.ts`、`specs/103-cli-minimal-kernel-self-loop/contracts/schemas/*.json`
- [x] T150 [P] [US5] 合同测试：新增 schema/runtime 等价性回归（describe + verify-loop.input）`packages/logix-cli/test/Contracts/Contracts.103.DescribeSchema.test.ts`、`packages/logix-cli/test/Contracts/Contracts.103.VerifyLoopInput.test.ts`
- [x] T151 [P] [US3] 集成测试：`inspect/stop` 在 next-actions exec 可执行且不再 unsupported `packages/logix-cli/test/Integration/cli.next-actions.exec.test.ts`
- [x] T152 [US5] 复跑质量门并回写证据（typecheck/test/build + governance checks）`specs/103-cli-minimal-kernel-self-loop/notes/verification.md`

---

## Dependencies & Execution Order

- Phase 1 -> Phase 2 -> Phase 2.1
- Phase 2.1 -> Phase 3（US1）, Phase 4（US2）, Phase 5（US3）（可并行）
- Phase 5（US3/runtime）-> Phase 6.5（self-bootstrap 外部编排里程碑）
- Phase 6.5 -> Phase 7（US5/governance）
- Phase 4 -> Phase 6（US4）
- Phase 8 仅在 Phase 6 + Phase 7 完成后执行，且不产出任何 runtime/governance gate 输入
- Phase 9 在 Phase 8 后执行（作为 Round-1 后续增量），并要求 US1/US3/US5 联动收敛
- Phase 10 在 Phase 9 后执行（Round-2 增量）：`T087-T094` -> `T095-T098` -> `T099-T100` -> `T101-T102`
- Phase 11 在 Phase 10 后执行（场景驱动补齐）：`T103-T111`（Wave A/P0）-> `T112-T115`（Wave B/P1）-> `T116-T118`（Wave C/P2）
- Phase 12 在 Phase 11 后执行（M1 收口）：`T119-T120`（命令面/describe 收口）-> `T121`（facts gate 接线）-> `T122`（文档回摆）
- Phase 13 在 Phase 12 后执行（M2 core-first）：`T123-T124`（core 判定 API）-> `T125-T126`（CLI 接线与回归）
- Phase 14 在 Phase 13 后执行（M3 entry-projection core-first）：`T127`（core 投影 API）-> `T128-T129`（CLI 薄包装与协议稳定）-> `T130`（守门回归）
- Phase 15 在 Phase 14 后执行（M4 discoverability）：`T131`（describe guidance）-> `T132`（链路可执行性约束测试）-> `T133`（README 收口）-> `T134-T135`（registry 自动解析与稳定性约束）-> `T136`（expected output keys 自动推导）-> `T137`（expected artifacts 自动推导）-> `T138`（独立 contract）-> `T139`（schema fail-fast + 合同测试）
- Phase 16 在 Phase 15 后执行（M5 schema-asset）：`T140`（新增 describe/guidance schema 资产）-> `T141`（contracts 索引与加载测试回写）
- Phase 17 在 Phase 16 后执行（审查收口）：`T142-T145`（P0 nextActions 闭环）-> `T146-T149`（real executor + trajectory + schema 等价）-> `T150-T152`（回归与证据收口）

## Implementation Strategy

### MVP First

1. 完成 Phase 1 + Phase 2 + Phase 2.1。  
2. 仅交付 US1 + US3（稳定协议 + verify-loop）。  
3. 完成 Phase 6.5（self-bootstrap 自举点）后，再进入扩展热重载与治理强化。

### Incremental Delivery

1. 协议核先冻结。  
2. 策略层后注入。  
3. 扩展与迁移治理最后加硬。
4. Phase 10 先打通真实 gate 与 canonical DSL，再收口 identity/extension，最后冻结 examples-real CI 阻断门。
5. Phase 11 按 `P0 -> P1 -> P2` 清缺口：先场景闭环能力，再复杂语义深度，最后文档与 DX 收口。
