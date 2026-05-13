# 验证记录

**状态**: 171 semantic MVP closure proof、真实 local daemon / browser WebSocket / CLI IPC carrier、multi-tab 并发隔离、live evidence handoff、comparable perf proof、final sweep 与 launcher/operator snapshot hardening 均已关闭。后续只剩 future extension，例如 full before/after live compare deep closure、cloud attachment、deep profile、heap snapshot、long-running raw stream 与 autonomous research/adoption loop。

本页记录 171 实施过程中的 proof、命令输出摘要、失败重试和剩余 future extension。任何 proof 状态变更必须附上命令、产物路径、失败复测摘要或剩余风险。

## 必需证明索引

| proof | 状态 | 必须记录的 evidence |
| --- | --- | --- |
| W171-001 dogfood handoff | 通过 | core/CLI in-process path 已证明 target discovery、static-live binding、dispatch denial、export canonical evidence、Workbench live projection、trial evidence handoff；examples/logix-react targeted browser live bridge route 与 full playground browser route suite 已通过；full before/after live compare deep closure 归 future extension，不阻塞 171 |
| W171-002 disabled overhead | 通过 | disabled no allocation guard 已由 unit test 覆盖；no bridge / bridge disabled / adapter present inactive 三态 perf baseline 已运行，diff comparable 且无 regression、improvement 或 budget violation |
| W171-003 operation denial no mutation | 通过 | stale manifest、digest mismatch、unavailable action contract、unauthorized target、missing validator for non-void dispatch 均产生 pre-mutation denial |
| W171-004 observation gap/degradation | 通过 | observation-only missing data 产生 evidence gap；capture facet 可携带 dropped/degraded/redaction marker |
| W171-005 stageClass verdict guard | 通过 | live facets 进入 Workbench `live-evidence` projection，不产生 control-plane finding 或 verdict；selector-route drilldown normalization 已测；host/profile/snapshot P1 facets 只作为 artifact、metric、degradation 或 gap 输入，不铸造 check/startup verdict |
| W171-006 DVTools/Playground same projection | 通过 | 同一 live evidence truth input 在 Agent/Core Workbench、DVTools、Playground 得到等价 session/artifact identity；DevTools drilldown feed 已降级为 live facet/gap 输入；targeted parity 与 full playground browser route suite 已通过 |
| W171-007 researchability header only | 通过 | header 只含 comparable refs、owner/unit metric refs、budget/sampling/redaction refs、gaps 和 authority refs；无 adoption verdict |
| W171-008 forbidden text sweep | 通过 | 剩余旧命名命中已逐项分类为 accepted internal live transport、repo-internal vocabulary、negative/adopted-subcommand、history-only 或 unrelated playground scripts |
| W171-009 run evidence repair | 通过 | `logix live export evidence -> trial --evidence -> VerificationControlPlaneReport.repairHints`；`LiveCommandResult` 不含 `repairHints`、`nextRecommendedStage` 或 verification verdict |
| W171-010 terminal topology alignment | 通过 | `agent-react-devtools` 的 daemon/WebSocket/CLI socket pattern 已吸收为 local-dev transport projection；Logix 终局固定为 attachment-first topology，多 tab / 多 process 通过 attachment refs 和 host locators 区分 |
| W171-011 real carrier target discovery | 通过 | `logix live start -> browser WebSocket host.offer -> daemon -> logix live targets --tree` 返回 daemon-backed browser attachment；plugin 注入与 dev-only import 两条前端入口均已证明 |
| W171-012 real carrier multi-tab identity | 通过 | 两个 browser tabs 指向同一 route/runtime 时输出两个 attachment rows，attachment/host/transport locators 不合并 |
| W171-013 daemon-backed capture/export | 通过 | `capture/snapshot/export evidence` 返回 daemon-backed live artifacts、canonical evidence package 或 host-unsupported structured gap，不再使用 in-process proof gap 表示真实 carrier |
| W171-014 disconnect lifecycle | 通过 | tab close、reload、daemon stop 后 attachment 进入 disconnected/degraded/terminal state，后续请求只返回 denied/gap/degraded |
| W171-015 report-owned repair closure under daemon | 通过 | daemon-backed `LiveCommandResult` 不含 repair/verdict 字段，repair advice 仍由 `trial/compare` report 产生 |
| W171-016 real carrier disabled/no-daemon overhead | 通过 | no daemon / bridge disabled 不触发 runtime hot path IO、capture buffer 或 transport allocation |
| W171-017 concurrent attachment isolation | 通过 | ambiguous target、explicit attachment routing、forged response ignore、daemon lineage export 和 duplicate bare capture ref gap 均已覆盖 |
| W171-018 launcher/operator snapshot hardening | 通过 | metadata 是 carrier-local operator snapshot；launcher 清理 stale metadata/socket；无 supervisor；无 `ensure/restart/logs/doctor` public grammar；无第二 daemon bin build surface |

## 命令记录

命令结果按时间顺序记录。关闭项必须能追溯到可重复命令、产物路径、失败复测摘要或剩余 future boundary。

### 2026-05-02 Terminal topology alignment

输入参考：

- `callstackincubator/agent-react-devtools` README、`connect.ts`、`daemon.ts`、`daemon-client.ts`、`devtools-bridge.ts`、`types.ts`。
- 关键观察：browser app 通过 WebSocket 连 daemon，CLI 通过 local socket / IPC 连 daemon，daemon 按 connection/root 清理 runtime tree。

裁决：

- WebSocket、local socket、IPC、stdio、daemon port 都是 carrier / locator。
- Logix 终局固定为 attachment-first，不采用 transport-first。
- 每个 browser tab、Node process、Playground host 或 cloud session 提交独立 attachment offer。
- `tabId` 是 optional browser host locator，不是 runtime identity。
- CLI / Workbench 以 `attachmentId + hostCoordinate + runtimeCoordinate + target coordinate` 区分并行 attachment。

回写：

- [../implementation-details/transport-topology.md](../implementation-details/transport-topology.md)
- [../spec.md](../spec.md)
- [../plan.md](../plan.md)
- [../research.md](../research.md)
- [../contracts/README.md](../contracts/README.md)
- [../data-model.md](../data-model.md)
- [../scenarios.md](../scenarios.md)
- [../../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)

### 2026-05-02 MVP core live bridge proof

命令：

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge --reporter=dot
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C examples/logix typecheck
```

结果：

- `test/internal/LiveBridge`: 7 files / 21 tests passed。
- `packages/logix-core typecheck`: exit 0。
- `examples/logix typecheck`: exit 0；同时 `check:pattern-reuse` 通过。

覆盖：

- T021/T023/T024/T025 的 MVP 内部边界：core-owned attachment registry、disabled static-empty capability、terminal state、cleanup drainage、disabled capture no allocation。
- T022/T027/T028/T029/T030/T031/T052/T056 的 MVP adapter offer、target discovery、coordinate handoff 与 examples verification fixture。
- T033/T034/T035/T036/T037/T038/T039 的 MVP live evidence facet 与 Workbench projection。
- W171-003、W171-004 关闭。
- W171-001、W171-002、W171-005 仅关闭 in-process/unit proof 子集。

### 2026-05-02 P1 operations、US5 projection parity 与 researchability proof

命令：

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge --reporter=dot
rtk pnpm -C packages/logix-devtools-react test -- --run test/internal/liveBridgeProjection.test.ts --reporter=dot
rtk pnpm -C packages/logix-playground test -- --run src/internal/summary/liveBridgeProjection.test.ts --reporter=dot
rtk pnpm -C packages/logix-devtools-react typecheck
rtk pnpm -C packages/logix-playground typecheck
```

结果：

- `test/internal/LiveBridge`: 9 files / 26 tests passed。
- DevTools live bridge projection test: 1 file / 1 test passed。
- Playground live bridge projection test: 1 file / 1 test passed。
- `packages/logix-devtools-react typecheck`: exit 0。
- `packages/logix-playground typecheck`: exit 0。

覆盖：

- T044/T045/T046 的 P1 operation routing：target discovery、event-window capture、snapshot、wait、evidence export、declared action dispatch、local runtime profile summary。
- T059/T061/T063/T064/T066 的 shared Workbench projection proof：同一 live facet 经 DVTools 和 Playground 产生同一 session/artifact identity，且不产生 control-plane finding。
- T067/T068/T069/T070/T071 的 researchability-compatible header proof：只包含 evidence digest、capture window、stage class、runtime coordinate、manifest/env/budget/sampling/redaction/proof command refs、owner/unit metric refs、dropped/degraded/redacted 与 gaps，不包含 adoption/merge/publish/release authority。

阶段性缺口，已由后续 proof 关闭：

- examples/logix-react browser dogfood route 尚未加入全量 Playwright route suite 的完全通过证明。

阶段性缺口，已由后续 proof 关闭或转为 future extension：

- no bridge / bridge disabled / adapter present inactive 的 comparable perf 三态基线。
- browser/Playground/DVTools dogfood parity。
- selector/host/profile/snapshot stageClass P1 facet guard。

### 2026-05-02 static-live binding、debug drilldown normalization 与 live bridge browser route proof

命令：

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge/live-static-binding.contract.test.ts --reporter=dot
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge/live-workbench-projection.contract.test.ts --reporter=dot
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge --reporter=dot
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-devtools-react test -- --run test/internal/liveBridgeProjection.test.ts test/internal/workbench-derivation.contract.test.ts --reporter=dot
rtk pnpm -C packages/logix-devtools-react typecheck
rtk pnpm -C examples/logix-react test -- --run test/playground-registry.contract.test.ts --reporter=dot
rtk pnpm -C examples/logix-react typecheck
rtk pnpm -C examples/logix-react exec tsx test/browser/playground-live-bridge-dogfood.playwright.ts
```

结果：

- static-live binding targeted test: 1 file / 2 tests passed。
- live Workbench projection targeted test: 1 file / 3 tests passed。
- `test/internal/LiveBridge`: 10 files / 29 tests passed。
- `packages/logix-core typecheck`: exit 0。
- DevTools targeted tests: 2 files / 6 tests passed。
- `packages/logix-devtools-react typecheck`: exit 0。
- examples/logix-react registry test: 1 file / 12 tests passed。
- `examples/logix-react typecheck`: exit 0。
- targeted Playwright live bridge dogfood route: `live bridge dogfood Playwright contract passed`。

覆盖：

- T042: `checkStaticLiveBinding` 以 167 `RuntimeReflectionManifest` 为输入，生成 matched/stale/mismatch/missing binding header；live admission/operation facets 携带 binding，但 reflection 不拥有 active runtime event。
- T060: DVTools raw debug drilldown feed 在进入 Workbench `truthInputs` 前被降级为 `live-evidence` facet 或 `evidence-gap`；panel selection/export 仍只作为 projection view/selectionHints，不成为 evidence truth。
- T062: `examples/logix-react` 新增 `logix-react.live-bridge` Logic-first Playground route；targeted Playwright 证明 route 输出 live target coordinate、`operation.denied` clue 和 canonical evidence package shape，且不含 `repairHints`、`nextRecommendedStage` 或 verification `verdict`。
- T065: core Workbench projection 测试覆盖 selector-route drilldown feed normalization，证明 raw debug feed 不直接进入 projection truth。
- W171-006 关闭 DVTools/Playground targeted projection parity 子集。

阶段性缺口，已由后续 proof 关闭或转为 future extension：

- 曾观察到 `rtk pnpm -C examples/logix-react test:browser:playground` 在既有 diagnostics route `assertDiagnosticsDemoRealReports` 阶段失败，失败点是 `runtime.trial/startup` diagnostics detail 未出现 `MissingDependency`。后续通过刷新 sandbox kernel bundle 与新增 browser regression 关闭该缺口。
- no bridge / bridge disabled / adapter present inactive 的 comparable perf 三态基线。
- selector/host/profile/snapshot stageClass P1 facet guard。
- `logix compare` 消费 live-derived before/after evidence 的完整 repair closure。

### 2026-05-02 CLI live namespace 与 evidence handoff proof

命令：

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-command-result.contract.test.ts test/Integration/live-namespace.contract.test.ts test/Integration/live-flat-root-rejection.guard.test.ts test/Integration/live-evidence-handoff.e2e.test.ts test/Integration/command-schema.guard.test.ts test/Integration/output-contract.test.ts test/Integration/unknown-command-transport.guard.test.ts --reporter=dot
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-cli run typecheck:test
```

结果：

- Targeted CLI tests: 7 files / 13 tests passed。
- `packages/logix-cli typecheck`: exit 0。
- `packages/logix-cli typecheck:test`: exit 0。

覆盖：

- `logix live <task>` public namespace 已接入 parser、entry、schema mirror。
- flat root `logix status/capture/snapshot/wait/export/trigger` 仍拒绝。
- `LiveCommandResult` 与 `CommandResult` 分离；live result 不含 `primaryReportOutputKey`、`repairHints`、`nextRecommendedStage`、`verdict`。
- `logix live export evidence -> logix trial --evidence` proof 通过；repair hint authority 仍在 `VerificationControlPlaneReport.repairHints`，并通过 `relatedArtifactOutputKeys: ["evidenceInput"]` 回链 live-derived evidence input。
- W171-009 关闭。

剩余 future extension：

- `logix live capture` 到真实 browser/runtime capture 的端到端 proof。
- `logix compare` 消费 live-derived before/after evidence 的完整 repair closure。
- daemon/transport projection 仍是 minimal in-process proof，不拥有 runtime identity。

### 2026-05-02 full browser route suite、perf proof 与 final sweep

命令：

```bash
rtk pnpm -C packages/logix-sandbox bundle:kernel
rtk pnpm -C packages/logix-sandbox test -- --project browser --run test/browser/sandbox-run-trial-shape-separation.browser.test.ts --reporter=dot
rtk pnpm -C examples/logix-react test:browser:playground
rtk env LOGIX_PREFLIGHT=1 pnpm -C packages/logix-react test -- --run test/perf-boundaries/contract-preflight.test.ts --reporter=dot
rtk pnpm -C packages/logix-react test -- --project browser --run test/browser/perf-boundaries/live-bridge-disabled-overhead.test.tsx --reporter=dot
rtk pnpm perf collect -- --profile default --files test/browser/perf-boundaries/live-bridge-disabled-overhead.test.tsx --out specs/171-agent-live-runtime-bridge/perf/before.worktree.local.live-bridge.default.json
rtk pnpm perf collect -- --profile default --files test/browser/perf-boundaries/live-bridge-disabled-overhead.test.tsx --out specs/171-agent-live-runtime-bridge/perf/after.worktree.local.live-bridge.default.json
rtk pnpm perf validate -- --report specs/171-agent-live-runtime-bridge/perf/before.worktree.local.live-bridge.default.json --allow-partial
rtk pnpm perf validate -- --report specs/171-agent-live-runtime-bridge/perf/after.worktree.local.live-bridge.default.json --allow-partial
rtk pnpm perf diff -- --before specs/171-agent-live-runtime-bridge/perf/before.worktree.local.live-bridge.default.json --after specs/171-agent-live-runtime-bridge/perf/after.worktree.local.live-bridge.default.json --out specs/171-agent-live-runtime-bridge/perf/diff.worktree.live-bridge.default.json
rtk pnpm test:turbo
rtk rg -n "Runtime\\.devtools|runtime\\.devtools|Runtime\\.inspect|runtime\\.inspect|Logix\\.Reflection|RuntimeAgentPort|LiveEvidenceSidecar|RuntimeOperationEvent|CommandResult.*live|globalThis\\.__LOGIX|\\blogix (status|capture|snapshot|trigger|wait|export)\\b" packages docs specs examples
```

结果：

- sandbox kernel bundle 已刷新；browser regression 覆盖 bundled kernel `$.readyAfter` 与 missing config 投影为 `MissingDependency`。
- `examples/logix-react test:browser:playground` 通过，输出包含 `playground route Playwright contract passed`。
- perf preflight 识别 `liveBridge.disabledOverhead.txnCommit` suite；browser perf test 通过。
- before/after perf reports 均通过 `perf validate --allow-partial`；partial 只表示本次只采集 171 live bridge suite，matrix/config/env 仍参与校验。
- diff artifact `specs/171-agent-live-runtime-bridge/perf/diff.worktree.live-bridge.default.json` 显示 `comparability.comparable=true`，`regressions=0`，`improvements=0`，`budgetViolations=0`。
- diff warning 只有 `git.dirty.before=true` 与 `git.dirty.after=true`，来自当前并行未提交工作区，不是 comparability mismatch。
- `pnpm test:turbo`: 15 tasks successful；scripts vitest 5 files / 16 tests passed。

final sweep 分类：

- `LiveCommandResult` imports/tests 属于 accepted internal live transport；`CommandResult` 仍只服务 `check / trial / compare`。
- `RuntimeOperationEvent` 属于既有 repo-internal reflection/workbench vocabulary，不是 public API 或 171 primary noun。
- 171/15 文档里的 flat root `logix status/capture/snapshot/wait/export` 命中均是 negative/adopted-subcommand 说明；公开入口固定为 `logix live <task>`。
- review-plan、archived/spec 历史命中属于 history-only、negative-only 或 superseded ledger。
- `globalThis.__LOGIX_*` 命中多为历史 superpowers/spec 或 unrelated playground scripts；171 不冻结 browser hook 名称，也不把 global hook 当 authority。

关闭：

- W171-001 关闭 full playground browser route suite；full before/after live compare deep closure 归 future extension。
- W171-002 关闭 no bridge / bridge disabled / adapter present inactive 三态 comparable perf proof。
- W171-005 关闭 P1 live facets stageClass verdict guard。
- W171-006 关闭 DVTools/Playground targeted parity 与 full playground browser route suite。
- W171-008 关闭 final negative sweep。

### 2026-05-02 closure revalidation

命令：

```bash
rtk env LOGIX_PREFLIGHT=1 pnpm -C packages/logix-react test -- --run test/perf-boundaries/contract-preflight.test.ts --reporter=dot
rtk pnpm -C packages/logix-react test -- --project browser --run test/browser/perf-boundaries/live-bridge-disabled-overhead.test.tsx --reporter=dot
rtk pnpm -C packages/logix-react typecheck
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-evidence-handoff.e2e.test.ts test/Integration/live-command-result.contract.test.ts --reporter=dot
rtk pnpm -C examples/logix-react test -- --run test/playground-registry.contract.test.ts --reporter=dot
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
rtk pnpm -C examples/logix-react test:browser:playground
rtk rg -n "Runtime\\.devtools|runtime\\.devtools|Runtime\\.inspect|runtime\\.inspect|Logix\\.Reflection|RuntimeAgentPort|LiveEvidenceSidecar|RuntimeOperationEvent|CommandResult.*live|globalThis\\.__LOGIX|\\blogix (status|capture|snapshot|trigger|wait|export)\\b" packages docs specs examples
```

结果：

- perf preflight: 1 file / 3 tests passed。
- browser live bridge disabled overhead: 1 file / 1 test passed；9 个 points 全部 `ok`，`captureBufferAllocations`、`transportAllocations`、`operationRequests`、`transactionWindowIoCount` 全为 0，两个 threshold 均为 `maxLevel=512`、`firstFailLevel=null`。
- `packages/logix-react typecheck`: exit 0。
- targeted CLI handoff/result tests: 2 files / 3 tests passed。
- examples/logix-react registry contract: 1 file / 12 tests passed。
- `pnpm typecheck`: TypeScript no errors。
- `pnpm lint`: oxlint 0 warnings / 0 errors，eslint exit 0。
- `pnpm test:turbo`: 15 tasks successful；workspace package tests passed，scripts vitest 5 files / 16 tests passed。
- `examples/logix-react test:browser:playground`: passed，输出包含 `logix-react.live-bridge ... liveBridgeDogfood` 与 `playground route Playwright contract passed`。

### 2026-05-03 Real Carrier Delta Targeted Matrix

命令：

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge/live-host-coordinate.contract.test.ts test/internal/LiveBridge/live-wire-types.contract.test.ts test/internal/LiveBridge/live-target-discovery.contract.test.ts --reporter=dot
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-namespace.contract.test.ts test/Integration/live-command-result.contract.test.ts test/Integration/live-daemon-carrier.contract.test.ts test/Integration/live-daemon-multitab.contract.test.ts test/Integration/live-daemon-disconnect.contract.test.ts --reporter=dot
rtk pnpm -C packages/logix-react test -- --run test/internal/dev/live-browser-adapter.contract.test.ts --reporter=dot
rtk pnpm -C examples/logix-react exec vitest run test/hmr-host-carrier.contract.test.ts --reporter=dot
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-react typecheck
rtk pnpm -C examples/logix-react typecheck
rtk pnpm -C examples/logix-react exec tsx test/browser/live-real-carrier.playwright.ts
rtk pnpm -C examples/logix-react exec tsx test/browser/live-dev-only-import.playwright.ts
```

结果：

- core live bridge targeted tests: 3 files / 4 tests passed。
- CLI live targeted tests: 5 files / 11 tests passed。
- React live adapter targeted test: 1 file / 2 tests passed。
- examples HMR/live Vite injection contract: 1 file / 5 tests passed。
- `packages/logix-core typecheck`: exit 0。
- `packages/logix-cli typecheck`: exit 0。
- `packages/logix-react typecheck`: exit 0。
- `examples/logix-react typecheck`: exit 0。
- `live-real-carrier.playwright.ts`: passed，输出 `live real carrier Playwright contract passed`。
- `live-dev-only-import.playwright.ts`: passed，输出 `live dev-only import carrier Playwright contract passed`。
- `live-daemon-carrier.contract.test.ts`: 额外通过 `logix live start -> logix live status -> logix live stop`，证明 CLI 已能直接拉起与关闭 daemon 进程，而不是只消费外部预起服务。

### 2026-05-03 Deeper Runtime Phase Targeted Matrix

命令：

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts test/Integration/live-evidence-handoff.e2e.test.ts --reporter=dot
rtk pnpm -C packages/logix-react test -- --run test/internal/dev/live-browser-adapter.contract.test.ts test/RuntimeProvider/runtime-hot-lifecycle-projection.contract.test.tsx --reporter=dot
rtk pnpm -C examples/logix-react exec tsx test/browser/live-real-carrier.playwright.ts
rtk pnpm -C examples/logix-react exec tsx test/browser/live-dev-only-import.playwright.ts
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-react typecheck
```

结果：

- `live-daemon-carrier.contract.test.ts` 现在覆盖：
  - `start/status/stop`
  - `snapshot.read`
  - `capture.eventWindow`
  - `wait.condition`
  - `dispatch.declaredAction`
- `live-evidence-handoff.e2e.test.ts` 现在使用 daemon-backed `snapshot -> export evidence -> trial --evidence <dir>`。
- React targeted tests 覆盖 richer `targetCoordinate` binding snapshot 与 browser-side operation response handling。
- `live-real-carrier.playwright.ts` 现在断言：
  - 有 runtime-semantic target row
  - daemon-backed `snapshot.read`
  - daemon-backed `capture.eventWindow`
  - daemon-backed `wait.condition`
  - daemon-backed `dispatch.declaredAction`
  - `export evidence` 复用真实 capture artifact
- `live-dev-only-import.playwright.ts` 继续证明一行 import 最小 attach 链路。

新增关闭：

- richer target projection 已成立，browser attachment 不再只报弱 target。
- `snapshot.read`、`capture.eventWindow`、`wait.condition`、`dispatch.declaredAction` 已进入同一 browser-backed operation lane。
- `export evidence` 已优先复用真实 live artifact，而不是只写最小 gap manifest。
- 并发隔离 hardened：同一 target coordinate 命中多个 browser attachments 时返回 `ambiguous-live-target`；显式 `attachmentId` 并发请求分别路由到对应 WebSocket；响应必须匹配 pending `requestId + attachmentId + WebSocket`；daemon lineage ref 支撑精确 `export evidence`，重复裸 `captureId` 返回 `ambiguous-live-artifact-ref`。
- CLI task 已映射到 daemon operation kind：`snapshot -> snapshot.read`、`capture -> capture.eventWindow`、`wait -> wait.condition`；`dispatch` 继续显式走 `dispatch.declaredAction`。

W171 关闭情况：

- W171-011: closed。真实 local daemon + browser WebSocket + CLI IPC 链路已跑通；plugin 注入 dogfood 页面可在 daemon status 中看到 browser attachments。
- W171-012: closed。两个 browser tabs 连接同一路由时，daemon status 保留两个独立 browser attachments；默认 attachmentId 冲突由 daemon connection record 消解。
- W171-013: closed at current v1 scope。daemon-backed `export evidence` 已返回真实 manifest 目录并完成 `trial --evidence <dir>` handoff；`capture/snapshot` 仍允许返回 host-unsupported structured gap，但不再回落到旧 in-process proof gap。
- W171-014: closed。tab close 后 attachment 进入 `disconnected`，daemon status 可见。
- W171-015: closed。`LiveCommandResult` targeted tests与两条 Playwright proof均确认无 `repairHints`、`nextRecommendedStage`、verification verdict。
- W171-017: closed。multi-tab concurrent isolation proof 覆盖 ambiguous target、explicit attachment routing、forged response ignore、daemon lineage export 和 duplicate bare capture ref gap。

### 2026-05-03 Final Negative Sweep

命令：

```bash
rtk rg -n "Runtime\\.devtools|runtime\\.devtools|Runtime\\.inspect|runtime\\.inspect|Logix\\.Reflection|RuntimeAgentPort|LiveEvidenceSidecar|CommandResult.*live|globalThis\\.__LOGIX|\\blogix (status|capture|snapshot|trigger|wait|export)\\b" packages docs specs examples
```

结果：

- `packages/logix-cli/src/internal/commands/live.ts`、`packages/logix-cli/src/internal/entry.ts`、`packages/logix-cli/test/Integration/live-command-result.contract.test.ts` 中的 `LiveCommandResult` 是 accepted internal live transport。
- `packages/logix-cli/test/Integration/live-namespace.contract.test.ts` 中 `logix status/capture/trigger` 命中只存在于 rejected root assertions。
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`、`specs/171-agent-live-runtime-bridge/**` 中的 flat root 命中均为 negative/adopted-subcommand 说明。
- `Runtime.devtools`、`Runtime.inspect`、`Logix.Reflection`、`RuntimeAgentPort`、`LiveEvidenceSidecar` 命中仅位于历史 spec、archive-like planning、negative sweep 说明或其他既有 owner spec 的禁止性文字，不构成 171 新 public authority。

结论：

- T123 所需 final negative sweep 已执行。
- 本轮新增实现没有把 WebSocket、daemon id、socket path、tab id、React DevTools protocol 升格为 runtime truth 或 public authority。

final sweep 复核分类：

- `packages/logix-cli/src/internal/commands/live.ts`、`packages/logix-cli/src/internal/entry.ts` 与 live CLI tests 中的 `LiveCommandResult` 是 accepted live transport implementation。
- `packages/logix-core/src/internal/reflection/**`、`packages/logix-playground/src/internal/runner/**`、167/168/165 文档中的 `RuntimeOperationEvent` 是既有 repo-internal reflection/workbench vocabulary 或 negative/public-surface guard，不是 171 public live API。
- `specs/025-*`、`specs/030-*`、`specs/092-*` 等旧 specs 命中是 archived/history context 或 prior draft，不是 171 active authority；本轮不修改冻结/历史规格。
- `docs/superpowers/**` 与 `docs/review-plan/**` 命中是 planning/run ledger。
- 171 内 `logix status/capture/snapshot/wait/export/trigger` 命中均为 rejected flat-root examples、negative sweep pattern 或 adopted-subcommand mapping。

### 2026-05-03 Live daemon launcher/operator snapshot hardening

Scope:

- `live client` 不拥有 daemon launch strategy、`src/dist` 分流、`tsx` 路径或 stale process file cleanup。
- `liveDaemonLauncher` 是唯一 daemon process launch authority；默认通过 current CLI re-exec 和 hidden `__internal_live_daemon` selector 启动 daemon。
- `daemon.json` 只作为 carrier-local operator snapshot，记录 readiness/health locator、pid、stateDir、metadataPath、optional logPath 与 stale cleanup evidence。
- `daemon.json` 不承载 runtime truth、attachment truth、evidence truth、report truth 或 public file contract。
- ready-looking metadata 只有 pid liveness 不足以表示 daemon ready；`live status` 在 IPC unavailable 时必须降级为 degraded operator snapshot。
- 未新增 supervisor，未新增 `logix live ensure/restart/logs/doctor` 或其他 public lifecycle grammar。
- 构建面只保留 `src/bin/logix.ts`，不再保留第二 daemon bin source/build entry。

Proof:

```bash
rtk pnpm -C packages/logix-cli test -- --run \
  test/Integration/live-daemon-operator-snapshot.contract.test.ts \
  test/Integration/live-daemon-carrier.contract.test.ts \
  test/Integration/live-daemon-disconnect.contract.test.ts \
  test/Integration/live-daemon-multitab.contract.test.ts \
  test/Integration/live-evidence-handoff.e2e.test.ts \
  test/Integration/live-namespace.contract.test.ts \
  test/Integration/live-command-result.contract.test.ts \
  test/Integration/public-surface.guard.test.ts \
  --reporter=dot
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-cli build
rtk rg -n 'logix live ensure|logix live restart|logix live logs|logix live doctor|logix-live-daemon|pid/log/state 文件 schema|public file contract' docs specs packages/logix-cli -g '*.md' -g '*.ts'
rtk git diff --check -- packages/logix-cli docs/proposals/live-daemon-lifecycle-architecture-memo.md docs/ssot/runtime/15-cli-agent-first-control-plane.md specs/171-agent-live-runtime-bridge/spec.md specs/171-agent-live-runtime-bridge/plan.md specs/171-agent-live-runtime-bridge/research.md specs/171-agent-live-runtime-bridge/scenarios.md specs/171-agent-live-runtime-bridge/quickstart.md specs/171-agent-live-runtime-bridge/implementation-plan-real-carrier.md specs/171-agent-live-runtime-bridge/notes/verification.md specs/171-agent-live-runtime-bridge/tasks.md
```

Expected:

- focused CLI live daemon tests pass。
- `packages/logix-cli typecheck` passes。
- `packages/logix-cli build` passes，`package.json` 仍只暴露 `dist/logix.js`。
- invalid metadata、stale pid metadata、IPC unavailable 都会返回 carrier-local stopped/degraded/cleanup evidence，不会伪装 ready runtime truth。
- sweep 无 public docs 教学 `ensure/restart/logs/doctor`；`logix-live-daemon` 只允许出现在 negative guard、history plan 或本 hardening 记录里。

### 2026-05-01 初始 forbidden text sweep

命令：

```bash
rtk rg -n "Runtime\\.devtools|runtime\\.devtools|Runtime\\.inspect|runtime\\.inspect|Logix\\.Reflection|RuntimeAgentPort|LiveEvidenceSidecar|RuntimeOperationEvent|CommandResult.*live|globalThis\\.__LOGIX|\\blogix (status|capture|snapshot|trigger|wait|export)\\b" specs/171-agent-live-runtime-bridge docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-*.md docs/ssot/runtime/02-hot-path-direction.md docs/ssot/runtime/09-verification-control-plane.md docs/ssot/runtime/14-dvtools-internal-workbench.md docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md specs/165-runtime-workbench-kernel/spec.md specs/168-kernel-to-playground-verification-parity/spec.md
```

分类：

- `Runtime.devtools`、`runtime.devtools`、`Runtime.inspect`、`runtime.inspect`、`Logix.Reflection`：negative-only、must-cut 或 out-of-scope。
- `logix live ...`：adopted public namespace，必须使用 `LiveCommandResult` 并映射 core-owned live capabilities；历史 Batch 2 的 zero-public 结论只保留为 superseded context。
- flat root `logix status/capture/snapshot/wait/export` 与 `logix trigger`：forbidden public roots；能力归位到 `logix live <task>`。
- `RuntimeAgentPort`：history-only、rejected DTO-first 或 internal-only vocabulary，不是 public 或 SSoT primary noun。
- `LiveEvidenceSidecar`、`RuntimeOperationEvent`：rejected 或 history-only。
- `CommandResult.*live`：negative-only，`CommandResult` 只保留为 `check / trial / compare` stdout envelope。
- `globalThis.__LOGIX...`：history-only 或 negative cloud-authority context；exact browser hook name 不冻结。

结论：初始 sweep 未发现 active public authority 或 active implementation requirement 采用 forbidden shape。实施后的 final sweep 仍必须按 W171-008 重新执行。

### 2026-05-01 规划收敛 sweep

命令：

```bash
rtk rg -n "<open-planning-marker-pattern>" specs/171-agent-live-runtime-bridge docs/ssot/runtime/02-hot-path-direction.md docs/ssot/runtime/09-verification-control-plane.md docs/ssot/runtime/14-dvtools-internal-workbench.md docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md specs/165-runtime-workbench-kernel/spec.md specs/168-kernel-to-playground-verification-parity/spec.md
```

其中 `<open-planning-marker-pattern>` 覆盖 open Q171-001 到 Q171-014、常见待办占位词、实施前待填、阶段 0 未完成和批次未收口标记。

结果：无命中。

任务编号核验：

```json
{
  "items": 93,
  "unique": 93,
  "min": 1,
  "max": 93,
  "gaps": [],
  "openPlanningTasks": 0,
  "openRuntimeTasks": 73
}
```

结论：

- Q171-001 到 Q171-014 已关闭。
- Q171-D01 到 Q171-D08 已转为 deferred / non-blocking，不阻塞实施。
- 阶段 0 planning closure 任务 T001 到 T020 已关闭。
- T021 到 T093 是后续 runtime implementation 与 proof tasks，不代表 planning 未收敛。
- `spec.md` 仍保持 Draft，因为 runtime proof gates 尚未运行。

### 2026-05-02 Harness-first 自验证补强

命令与检查：

```bash
rtk agent-browser --help
rtk agent-browser skills get core
rtk python3 -c '... task id continuity check ...'
```

结果：

- `agent-browser --help` 可用，确认 `open / snapshot / screenshot / console / errors / network requests / trace / profiler / record / stream` 等命令存在。
- `agent-browser skills get core` 在当前本机版本返回 `Unknown command: skills`；171 规划不依赖该动态 skill 入口。
- 当时 `tasks.md` 的 semantic MVP 任务编号连续。当前已追加 T094/T095 terminal topology alignment 与 T096-T123 real carrier implementation delta；后续关闭阶段 11 时必须重新运行任务编号连续性检查。

结论：

- [implementation-details/harness-path.md](../implementation-details/harness-path.md) 是实施 Agent 的自验证路线。
- Playwright、Vitest、CLI proof script、perf command、text sweep 是可关闭 proof 的可重复命令。
- `agent-browser` 只作为 exploratory QA 与 failure inspection 工具，用于截图、accessibility snapshot、console/error/network、trace/profile/recording 或 streaming 观察。
- `agent-browser` artifact 可以附在失败复现或 dogfood 记录中，但不能单独关闭 W171-001、W171-006、W171-008 或 W171-009。

## 关闭规则

- `comparable=false`、missing suite、timeout 或 stability warning 禁止关闭 W171-002。
- `operation.denied` 必须发生在 runtime mutation 前；否则 W171-003 不通过。
- Live observation 不能生成 `runtime.check` 或 startup-trial verdict；否则 W171-005 不通过。
- 禁止只用人工截图、日志文本或 `agent-browser` artifact 关闭 W171-001、W171-006、W171-008 或 W171-009。
- W171-009 必须同时证明：
  - `LiveCommandResult` 不含 `repairHints`、`nextRecommendedStage` 或 verification verdict。
  - `LiveCommandResult` 只输出 denial/gap/degraded markers、target coordinate、binding header、source/declaration refs、canonical evidence package refs 或 artifact refs。
  - `VerificationControlPlaneReport.repairHints` 是唯一 repair advice authority。
  - 至少一个 repair hint 通过 `relatedArtifactOutputKeys`、evidence refs 或 owner-approved stable coordinate 追溯到 live-derived evidence。
