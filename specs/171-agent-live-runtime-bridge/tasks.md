# 任务：Agent Live Runtime Bridge

**输入**: `/specs/171-agent-live-runtime-bridge/` 下的设计文档
**前置文档**: [spec.md](./spec.md), [discussion.md](./discussion.md), [plan.md](./plan.md), [research.md](./research.md), [scenarios.md](./scenarios.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md)

当前任务表表示规划已成型。阶段 0 到 10 已完成 semantic MVP 与 terminal topology alignment；阶段 11 是 real carrier implementation delta，必须按后续证明门分阶段推进。

## 阶段 0：实施前收敛

- [x] T001 关闭 Batch 5 DevTools/Playground/Workbench 收敛，并把采纳裁决写入 `specs/171-agent-live-runtime-bridge/spec.md`
- [x] T002 [P] 在 `docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-5.md` 记录 Batch 5 ledger
- [x] T003 按 Batch 5 采纳结果更新 `docs/ssot/runtime/14-dvtools-internal-workbench.md`
- [x] T004 按 Batch 5 更新 `specs/168-kernel-to-playground-verification-parity/spec.md` 的 Playground dogfood 边界
- [x] T005 在 `specs/171-agent-live-runtime-bridge/spec.md` 关闭 Batch 6 debug operation allowlist、permission、redaction、security、budget 裁决
- [x] T006 [P] 在 `docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-6.md` 记录 Batch 6 ledger
- [x] T007 用 Batch 6 采纳的预算和 proof commands 更新 `specs/171-agent-live-runtime-bridge/implementation-details/security-budget.md`
- [x] T008 在 `docs/ssot/runtime/02-hot-path-direction.md` 回写 disabled/enabled bridge overhead 证明要求
- [x] T009 在 `specs/171-agent-live-runtime-bridge/spec.md` 关闭 Batch 7 researchability 字段边界和 AutoResearch deferred list
- [x] T010 [P] 在 `docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-7.md` 记录 Batch 7 ledger
- [x] T011 从 `specs/171-agent-live-runtime-bridge/discussion.md` 的 Must Close 中关闭 Q171-005/Q171-010/Q171-012/Q171-013/Q171-014
- [x] T012 T001-T011 完成后，把 `specs/171-agent-live-runtime-bridge/plan.md` 的 Gate B 改成 admitted

## 阶段 1：初始化与合同

- [x] T013 [P] 完成 `specs/171-agent-live-runtime-bridge/implementation-details/attachment-substrate.md` 的 attachment substrate 细节
- [x] T014 [P] 完成 `specs/171-agent-live-runtime-bridge/implementation-details/evidence-facets.md` 的 evidence facet 细节
- [x] T015 在 `specs/171-agent-live-runtime-bridge/implementation-details/decomposition-brief.md` 填写触及 >=1000 LOC 文件的拆解简报
- [x] T016 创建或更新 `specs/171-agent-live-runtime-bridge/notes/verification.md` 的验证证据 ledger
- [x] T017 创建或更新 `specs/171-agent-live-runtime-bridge/notes/perf-evidence.md` 的性能证据 ledger
- [x] T018 按 `specs/171-agent-live-runtime-bridge/quickstart.md` 执行初始 forbidden text sweep
- [x] T019 在 `specs/171-agent-live-runtime-bridge/implementation-details/harness-path.md` 固化 harness-first 路线、Playwright proof 和 `agent-browser` 辅助边界
- [x] T020 在 `specs/171-agent-live-runtime-bridge/implementation-plan.md` 固化 writing-plans worker 实施计划

## 阶段 2：基础 Core Attachment

- [x] T021 在 `packages/logix-core/src/internal/runtime/core/**` 定义 internal attachment service boundary
- [x] T022 在 `packages/logix-core/src/internal/repoBridge/**` 定义 adapter attach offer 输入
- [x] T023 在 `packages/logix-core/src/internal/runtime/core/**` 实现 disabled static-empty capability path
- [x] T024 在 `packages/logix-core/src/internal/runtime/core/**` 实现 attachment lifecycle state、terminal-state transition 和 cleanup invariant
- [x] T025 在 `packages/logix-core/test/internal/**` 添加 disabled no-op、cleanup 以及 revoked/disconnected/target-unavailable terminal-state 行为测试
- [x] T026 在 `specs/171-agent-live-runtime-bridge/notes/verification.md` 记录 attachment 和 terminal-state proof

## 阶段 3：用户故事 1，Agent 发现活跃 Runtime Topology

**目标**: Agent 能用稳定坐标列出 connected runtimes/modules/instances。

**独立测试**: dogfood app 暴露多个 runtime instances，并提供 machine-readable target list，无需 human log parsing。

- [x] T027 [US1] 在 `packages/logix-core/src/internal/runtime/core/**` 实现 live target discovery
- [x] T028 [US1] 在 `packages/logix-core/src/internal/observability/**` 实现 target coordinate normalization
- [x] T029 [US1] 在 `packages/logix-core/src/internal/observability/**` 添加 no-runtime-attached evidence gap 处理
- [x] T030 [P] [US1] 在 `packages/logix-core/test/internal/**` 添加 target discovery tests
- [x] T031 [US1] 在 `examples/logix/src/verification/**` 添加 dogfood target listing fixture
- [x] T032 [US1] 在 `specs/171-agent-live-runtime-bridge/notes/verification.md` 记录 US1 proof

## 阶段 4：用户故事 2，Agent 观察 Live Evidence 且不拥有 Verdict

**目标**: Agent 捕获 bounded live evidence 并导出 canonical evidence，同时不创建 verdict truth。

**独立测试**: live event/snapshot/selector/host evidence 作为 canonical facets 导出，并被 Workbench projection 消费。

- [x] T033 [US2] 在 `packages/logix-core/src/internal/observability/**` 实现 live operation event facet builder
- [x] T034 [US2] 在 `packages/logix-core/src/internal/observability/**` 实现 live capture facet builder
- [x] T035 [US2] 在 `packages/logix-core/src/internal/observability/**` 实现 budget/drop/degraded/redaction markers
- [x] T036 [US2] 在 `packages/logix-core/src/internal/observability/**` 接入 canonical evidence handoff
- [x] T037 [US2] 在 `packages/logix-core/src/internal/workbench/**` 添加 live facets 到 Workbench authority bundle 的映射
- [x] T038 [P] [US2] 在 `packages/logix-core/test/internal/**` 添加 canonical evidence facet tests
- [x] T039 [P] [US2] 在 `packages/logix-core/test/internal/**` 添加 live facets Workbench projection tests
- [x] T040 [US2] 在 `specs/171-agent-live-runtime-bridge/notes/verification.md` 记录 US2 proof

## 阶段 5：用户故事 3，Agent 执行 Controlled Debug Operations

**目标**: Agent 可以运行 Batch 6 allowlisted controlled operations。

**独立测试**: declared action dispatch、event-window capture、read-only snapshot、wait、evidence export、local-only runtime profile summary 遵守 admission taxonomy；unauthorized operations 以 no mutation 拒绝。

- [x] T041 [US3] 在 `packages/logix-core/src/internal/runtime/core/**` 实现 operation admission request shape
- [x] T042 [US3] 在 `packages/logix-core/src/internal/reflection/**` 实现 against 167 reflection facts 的 static-live binding check
- [x] T043 [US3] 在 `packages/logix-core/src/internal/observability/**` 实现 `operation.denied` pre-mutation evidence
- [x] T044 [US3] 在 `packages/logix-core/src/internal/observability/**` 实现 accepted/completed/failed operation evidence
- [x] T045 [US3] 按 Batch 6 allowlist 在 `packages/logix-core/src/internal/runtime/core/**` 实现 `dispatch.declaredAction`
- [x] T046 [US3] 按 Batch 6 allowlist 在 `packages/logix-core/src/internal/runtime/core/**` 实现 `target.discover`、`capture.eventWindow`、`snapshot.read`、`wait.condition`、`evidence.export`、`profile.runtimeSummary`
- [x] T047 [P] [US3] 在 `packages/logix-core/test/internal/**` 添加 stale manifest/digest mismatch/validator unavailable denial tests
- [x] T048 [P] [US3] 在 `packages/logix-core/test/internal/**` 添加 unauthorized target no-mutation tests
- [x] T049 [P] [US3] 在 `packages/logix-core/test/internal/**` 添加 budget/redaction/admission request field tests
- [x] T050 [US3] 在 `specs/171-agent-live-runtime-bridge/notes/verification.md` 记录 US3 proof

## 阶段 6：用户故事 4，Agent 通过 `logix live` 把 Live Session 转成 Verification Closure

**目标**: live session 导出 canonical evidence，供 Workbench 和现有 verification stages 消费。

**独立测试**: captured failing session 导出 evidence，verification 消费 refs，compare 使用现有 admissibility。

- [x] T051 [US4] 在 `packages/logix-core/src/internal/observability/**` 实现 canonical evidence export handoff
- [x] T052 [US4] 在 `packages/logix-core/src/internal/repoBridge/**` 实现 selection/target coordinate handoff
- [x] T053 [US4] 在 `packages/logix-cli/src/**` 实现 `logix live` public namespace 和 `LiveCommandResult`
- [x] T054 [US4] 在 `packages/logix-cli/src/**` 确保 `CommandResult` 只服务 check/trial/compare，`LiveCommandResult` 只服务 live commands
- [x] T055 [P] [US4] 在 `packages/logix-cli/test/**` 添加 CLI live namespace、flat root rejection 和 envelope boundary tests
- [x] T056 [US4] 在 `examples/logix/src/verification/**` 添加 compare handoff fixture
- [x] T057 [P] [US4] 在 `packages/logix-core/test/internal/**` 添加 Workbench evidence package projection tests
- [x] T058 [US4] 在 `specs/171-agent-live-runtime-bridge/notes/verification.md` 记录 US4 proof

## 阶段 7：用户故事 5，维护者围绕 Agent-first Evidence 重定位 DevTools 与 Playground

**目标**: DVTools 与 Playground 消费和 Agent live route 相同的 evidence/projection。

**独立测试**: 一个 evidence package 在 Agent route、DVTools、Playground 中得到等价 session/finding/artifact/gap identities。

- [x] T059 [US5] 在 `packages/logix-devtools-react/src/internal/**` 把 DVTools imported/live evidence consumer 接到 Workbench projection
- [x] T060 [US5] 在 `packages/logix-devtools-react/src/internal/**` 移除或降级 DVTools panel-only truth paths
- [x] T061 [US5] 在 `packages/logix-playground/src/internal/**` 把 Playground dogfood host 接到 live bridge adapter offer
- [x] T062 [US5] 在 `examples/logix-react/src/playground/**` 添加 live bridge dogfood route
- [x] T063 [P] [US5] 在 `packages/logix-devtools-react/test/**` 添加 DVTools projection parity tests
- [x] T064 [P] [US5] 在 `packages/logix-playground/test/**` 添加 Playground projection parity tests
- [x] T065 [P] [US5] 在 `packages/logix-core/test/internal/**` 添加 debug drilldown feed normalization tests
- [x] T066 [US5] 在 `specs/171-agent-live-runtime-bridge/notes/verification.md` 记录 US5 proof

## 阶段 8：用户故事 6，维护者为 Agent Researchability 准备 Kernel

**目标**: 暴露 bounded comparable evidence header，同时不拥有 AutoResearch loop。

**独立测试**: baseline/candidate evidence 可以引用 comparable header refs，adoption policy 留给 future spec。

- [x] T067 [US6] 按 Batch 7 在 `packages/logix-core/src/internal/observability/**` 实现 researchability-compatible evidence header
- [x] T068 [US6] 在 `packages/logix-core/src/internal/observability/**` 实现 environment fingerprint ref、budget/sampling/redaction refs 和 proof command refs
- [x] T069 [US6] 在 `packages/logix-core/src/internal/observability/**` 为 unavailable metric families 或 detailed traces 添加 evidence gap
- [x] T070 [P] [US6] 在 `packages/logix-core/test/internal/**` 添加 comparable header tests
- [x] T071 [US6] 在 `specs/171-agent-live-runtime-bridge/notes/verification.md` 记录 US6 proof

## 阶段 9：回写与验证

- [x] T072 用最终 live evidence handoff fields 更新 `docs/ssot/runtime/09-verification-control-plane.md`
- [x] T073 用最终 DVTools consumer boundary 更新 `docs/ssot/runtime/14-dvtools-internal-workbench.md`
- [x] T074 用完成的 dogfood proof refs 更新 `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
- [x] T075 若 Workbench projection inputs 改变，更新 `specs/165-runtime-workbench-kernel/spec.md`
- [x] T076 若 static-live binding refs 改变，更新 `specs/167-runtime-reflection-manifest/spec.md`
- [x] T077 若 Playground dogfood boundary 改变，更新 `specs/168-kernel-to-playground-verification-parity/spec.md`
- [x] T078 运行 `rtk pnpm -C packages/logix-core typecheck`
- [x] T079 运行 `rtk pnpm -C packages/logix-core test -- --run --cache --silent=passed-only --reporter=dot`
- [x] T080 运行 `rtk pnpm -C packages/logix-react typecheck`
- [x] T081 运行 `rtk pnpm -C packages/logix-cli typecheck`
- [x] T082 运行 `rtk pnpm -C packages/logix-playground typecheck`
- [x] T083 运行 `rtk pnpm -C packages/logix-devtools-react typecheck`
- [x] T084 运行 `rtk pnpm -C examples/logix-react typecheck`
- [x] T085 运行 `rtk pnpm typecheck`
- [x] T086 运行 `rtk pnpm lint`
- [x] T087 运行 `rtk pnpm test:turbo`
- [x] T088 运行 `specs/171-agent-live-runtime-bridge/quickstart.md` 中的 browser dogfood proof
- [x] T089 运行 performance proof，并把结果记录到 `specs/171-agent-live-runtime-bridge/notes/perf-evidence.md`
- [x] T090 运行 `specs/171-agent-live-runtime-bridge/quickstart.md` 中的 final negative sweep
- [x] T091 对照 `specs/171-agent-live-runtime-bridge/scenarios.md` 核验 required 场景均已有 proof refs 或明确 owner handoff
- [x] T092 运行 run -> evidence -> repair proof，确认 live output 只给 repair clues，最终 repair hints 由 `VerificationControlPlaneReport` 产生
- [x] T093 所有 success criteria 通过后才移动 `specs/171-agent-live-runtime-bridge/spec.md` status

## 阶段 10：Post-closure terminal topology alignment

- [x] T094 吸收 `agent-react-devtools` 的 daemon/WebSocket/CLI socket pattern，并在 `specs/171-agent-live-runtime-bridge/implementation-details/transport-topology.md` 固化 Logix attachment-first 终局拓扑
- [x] T095 把 host / transport / attachment / runtime coordinate topology 回写到 `spec.md`、`plan.md`、`research.md`、`contracts/README.md`、`data-model.md`、`scenarios.md` 和 `docs/ssot/runtime/15-cli-agent-first-control-plane.md`

## 阶段 11：Post-closure real carrier implementation delta

**目标**: 把当前 `logix live` in-process proof transport 替换为真实 local daemon / browser WebSocket / CLI IPC carrier，并保留 attachment-first owner law。

**独立测试**: examples/logix-react 打开两个 browser tabs 后，CLI 能通过 daemon-backed `logix live targets --tree` 分别看到两个 attachment rows；关闭一个 tab 后 attachment 进入 disconnected/degraded；`logix live export evidence` 产出 canonical evidence package 且 `LiveCommandResult` 不含 repair verdict 字段。

- [x] T096 在 `specs/171-agent-live-runtime-bridge/implementation-plan-real-carrier.md` 固化 writing-plans worker 实施计划
- [x] T097 [P] 在 `packages/logix-core/src/internal/runtime/core/liveTypes.ts` 增加 `LiveHostCoordinate` 与 `LiveTransportProjection`
- [x] T098 [P] 在 `packages/logix-core/test/internal/LiveBridge/live-host-coordinate.contract.test.ts` 覆盖多 tab 同 runtime 不合并
- [x] T099 在 `packages/logix-core/src/internal/runtime/core/liveAttachment.ts` 保留 attachment offer 的 host/transport locator 并投影到 target descriptor
- [x] T100 [P] 在 `packages/logix-core/src/internal/runtime/core/liveWireTypes.ts` 定义 live daemon/browser/CLI wire envelope 与 forbidden report-field guard
- [x] T101 [P] 在 `packages/logix-core/test/internal/LiveBridge/live-wire-types.contract.test.ts` 覆盖 wire envelope guard
- [x] T102 在 `packages/logix-core/src/internal/live-bridge-api.ts` 回收 real carrier 所需 repo-internal live wire exports
- [x] T103 [P] 在 `packages/logix-cli/src/internal/liveTransportPaths.ts` 实现 state dir、socket path、metadata path 与 default WebSocket host/port 解析
- [x] T104 [P] 在 `packages/logix-cli/src/internal/liveDaemonClient.ts` 实现 CLI IPC request/response、status probing、timeout 和 stop
- [x] T105 在 `packages/logix-cli/src/internal/liveDaemonServer.ts` 实现 WebSocket browser carrier、local IPC server、metadata 写入和 attachment registry routing
- [x] T106 在 `packages/logix-cli/src/bin/logix.ts` 的隐藏 `__internal_live_daemon` selector 接入 daemon runtime；最终构建面只保留当前 CLI re-exec，不保留第二 daemon bin entry
- [x] T107 在 `packages/logix-cli/src/internal/liveClient.ts` 将 `status/targets/capture/snapshot/wait/dispatch/profile/export` 路由到 daemon client；no-daemon 返回 structured status 或 evidence gap
- [x] T108 [P] 在 `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts` 覆盖 daemon-backed status、browser host offer 和 targets IPC
- [x] T109 [P] 在 `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts` 覆盖两个 browser WebSocket connections 的 distinct attachment rows
- [x] T110 [P] 在 `packages/logix-cli/test/Integration/live-daemon-disconnect.contract.test.ts` 覆盖 tab close、reload、daemon stop 的 terminal/degraded state
- [x] T111 在 `packages/logix-react/src/internal/dev/lifecycleCarrier.ts` 暴露 dev lifecycle runtime binding snapshot，避免 browser adapter 发明第二套 React host registry
- [x] T112 在 `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts` 实现 dev-only browser WebSocket adapter、host.offer submit、binding snapshot projection 与 disconnect handling
- [x] T113 在 `packages/logix-react/src/dev/live.ts` 暴露 dev-only live adapter side-effect import 与 named install entry，并在 `packages/logix-react/package.json` 增加 `./dev/live` export
- [x] T114 在 `packages/logix-react/src/dev/vite.ts` 增加 live bridge dev injection helper，注入同一个 `@logixjs/react/dev/live` adapter entry，复用既有 lifecycle Vite 插件边界
- [x] T115 [P] 在 `packages/logix-react/test/internal/dev/live-browser-adapter.contract.test.ts` 覆盖 fake WebSocket host.offer、side-effect import install、no report truth 字段和 SSR/prod guard
- [x] T116 在 `examples/logix-react/vite.config.ts` 为 dogfood app 启用 live bridge dev injection
- [x] T117 在 `examples/logix-react/test/browser/live-real-carrier.playwright.ts` 与 `examples/logix-react/test/browser/live-dev-only-import.playwright.ts` 增加 plugin 注入双 tab proof 和一行 dev-only import 轻页面 proof
- [x] T118 在 `examples/logix-react/package.json` 增加 `test:browser:live-real-carrier` 与 `test:browser:live-dev-only-import`
- [x] T119 更新 `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`，优先使用 daemon-backed evidence export 证明 repair closure 仍由 `trial/compare` 持有
- [x] T120 运行 targeted real carrier matrix，并把 W171-011 到 W171-015 记录到 `specs/171-agent-live-runtime-bridge/notes/verification.md`
- [x] T121 运行 disabled/no-daemon perf proof，并把 W171-016 记录到 `specs/171-agent-live-runtime-bridge/notes/perf-evidence.md`
- [x] T122 更新 `specs/171-agent-live-runtime-bridge/quickstart.md`、`scenarios.md` 和 `docs/ssot/runtime/15-cli-agent-first-control-plane.md`，把 real carrier proof commands 纳入终局验证路线
- [x] T123 运行 final negative sweep，确认 WebSocket、daemon id、socket path、tab id、React DevTools protocol 均未成为 runtime truth 或 public authority

## 阶段 12：Concurrent attachment isolation hardening

**目标**: 完全规避多 browser tab、同 browser tab 多 binding、以及并发 live operation 下的请求、响应和 evidence artifact 串数据。

**独立测试**: 两个 browser WebSocket attachments 提交同一 target coordinate 时，未带 `attachmentId` 的 operation 返回 `ambiguous-live-target`；带不同 `attachmentId` 的并发 operation 分别路由到对应 WebSocket；错误 WebSocket 伪造同一 `requestId` 不会 resolve pending request；两个 attachment 返回相同裸 `captureId` 时，`export evidence` 只能通过 daemon lineage ref 精确导出，裸 ref 返回 `ambiguous-live-artifact-ref`。

- [x] T124 在 `specs/171-agent-live-runtime-bridge/implementation-plan-concurrency-isolation.md` 固化并发隔离 writing-plans 计划
- [x] T125 在 `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts` 覆盖 ambiguous target 不隐式选第一个 tab
- [x] T126 在 `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts` 覆盖显式 `attachmentId` 并发 routing 不串 tab artifact
- [x] T127 在 `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts` 覆盖错误 WebSocket 伪造同一 `requestId` 会被忽略
- [x] T128 在 `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts` 覆盖 daemon lineage ref 导出与裸 duplicate `captureId` ambiguity gap
- [x] T129 在 `packages/logix-cli/src/internal/liveDaemonServer.ts` 实现 attachment-first target resolution、pending operation WebSocket/attachment guard、daemon lineage artifact cache
- [x] T130 在 `packages/logix-cli/src/internal/args.ts`、`liveClient.ts`、`entry.ts` 和 command schema 中接入 `--attachment <attachmentId>`
- [x] T131 在 `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts` 改为 full target coordinate binding resolution，不再按 `runtimeId` 猜 binding
- [x] T132 在 `packages/logix-react/test/internal/dev/live-browser-adapter.contract.test.ts` 覆盖同 runtime 不同 module/instance 不被 runtimeId-only fallback 误解析
- [x] T133 更新 `quickstart.md`、`scenarios.md`、`notes/verification.md` 和 `docs/ssot/runtime/15-cli-agent-first-control-plane.md`，补充 attachment-first 与 lineage export 口径

## 阶段 13：Live daemon launcher/operator snapshot hardening

**目标**: 把 daemon 启动策略、metadata 校验、stale cleanup 与构建入口卫生收回 repo-internal launcher/operator snapshot 边界；不新增 supervisor，不新增 public lifecycle grammar。

**独立测试**: stale metadata 不会被 launcher 复用；server 只写 carrier-local operator metadata；`live status` 能报告 degraded operator snapshot；包构建面不再包含第二 daemon bin。

- [x] T134 在 `packages/logix-cli/src/internal/liveDaemonOperatorSnapshot.ts` 固定 carrier-local operator snapshot，不把 pid/log/state 升级为 public contract
- [x] T135 在 `packages/logix-cli/src/internal/liveDaemonLauncher.ts` 把 stale metadata/socket cleanup 收回 launcher boundary，并保持默认 current CLI re-exec
- [x] T136 在 `packages/logix-cli/src/internal/liveClient.ts` 与 `packages/logix-cli/src/internal/liveDaemonServer.ts` 复用 operator snapshot 状态/metadata 投影，避免 live client 自己拼 status 或 server 写 runtime truth
- [x] T137 删除第二 daemon bin source/build entry，并用 `packages/logix-cli/test/Integration/public-surface.guard.test.ts` 固定只有 `dist/logix.js` public binary

## 依赖

- 阶段 0 到 10 已完成 semantic MVP 与 terminal topology alignment。
- 阶段 11 依赖 T094/T095 的 attachment-first topology 裁决。
- T097-T102 阻塞 T105/T107/T112，因为 daemon/browser/CLI 必须共享 host/transport locator 与 wire guard。
- T103/T104 阻塞 T107。
- T105/T106 阻塞 T108-T110 与 T117；T134-T137 已把 T106 的早期第二 bin 形态收敛为 hidden current-CLI re-exec。
- T111 阻塞 T112/T115。
- T112-T116 阻塞 T117 的 plugin 注入 proof；T113 阻塞 T117 的 dev-only import 轻页面 proof。两条 frontend entry 必须共用 T112 的 adapter，不允许形成第二套 browser bridge。
- T117/T119 阻塞 T120。
- T121 必须在 final closure 前运行，确认 real carrier 没有破坏 disabled/no-daemon hot path。

## 并行机会

- 阶段 1 的 attachment substrate、evidence facets、verification ledger、perf ledger 可并行。
- US2 的 canonical evidence facet tests 与 Workbench projection tests 可在 facet builders 存在后并行。
- US5 的 DVTools 和 Playground parity tests 可在 shared evidence package fixture 存在后并行。
- 阶段 11 中 core host/wire tests、CLI path/client tests、React adapter fake WebSocket tests 可以并行；daemon server integration 需要在 shared wire types 后串行接入。
- 阶段 13 的 operator snapshot、launcher cleanup、status projection、public surface guard 可按 TDD 小步并行评审，但同一代码落点实施时必须串行合并。

## MVP 范围

阶段 0 后的 MVP：

- 阶段 2 core attachment substrate。
- US1 target discovery。
- US2 canonical evidence facets。
- US4 evidence export to Workbench/verification closure。

US3 active operations、US5 DVTools/Playground convergence、US6 researchability header 已由 semantic MVP proof 关闭。阶段 11/12/13 已补齐真实 carrier、并发隔离与 launcher/operator snapshot hardening；后续只剩 future extension，例如 cloud attachment、deep profile、heap snapshot、long-running raw stream 与 full before/after live compare deep closure。
