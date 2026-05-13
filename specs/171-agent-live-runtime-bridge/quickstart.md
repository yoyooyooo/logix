# 快速验证：Agent Live Runtime Bridge

本文件是 171 的证明路线。Batch 1 到 Batch 7、semantic MVP、真实 local daemon / browser WebSocket / CLI IPC carrier、concurrent attachment isolation 与 launcher/operator snapshot hardening 均已关闭。后续只剩 future extension，例如 full before/after live compare deep closure、cloud attachment、deep profile、heap snapshot、long-running raw stream 与 autonomous research/adoption loop。

## 1. 确认规划状态

```bash
rtk sed -n '1,220p' specs/171-agent-live-runtime-bridge/spec.md
rtk sed -n '1,360p' specs/171-agent-live-runtime-bridge/plan.md
rtk sed -n '1,260p' specs/171-agent-live-runtime-bridge/implementation-plan.md
rtk sed -n '1,260p' specs/171-agent-live-runtime-bridge/implementation-plan-real-carrier.md
rtk sed -n '1,260p' specs/171-agent-live-runtime-bridge/scenarios.md
rtk sed -n '1,220p' specs/171-agent-live-runtime-bridge/tasks.md
rtk sed -n '1,220p' specs/171-agent-live-runtime-bridge/contracts/README.md
rtk sed -n '1,220p' specs/171-agent-live-runtime-bridge/implementation-details/transport-topology.md
rtk sed -n '1,260p' specs/171-agent-live-runtime-bridge/implementation-details/harness-path.md
```

必须看到：

- public live CLI root 是 `logix live`，不是 flat root commands。
- `RuntimeAttachment` 是规划标签。
- Browser hook 具体名称后置。
- live facts 进入 canonical evidence facets。
- scenarios.md 中 required 场景均能映射到 task、proof 或明确 future 边界。
- implementation-plan.md 中 worker 任务按文件落点、TDD 步骤、验证命令和回写门拆分。
- implementation-plan-real-carrier.md 中 worker 任务已补齐真实 local daemon、browser WebSocket adapter、CLI IPC client、Vite dev plugin entry、dev-only import entry 和 multi-tab proof；早期第二 daemon bin 形态已被 launcher/operator snapshot hardening 收敛为 current CLI re-exec。
- harness-first 路线明确 Playwright 是 final browser proof，`agent-browser` 是 exploratory QA / failure inspection aid。
- Batch 5/6/7 采纳候选已写入 spec、discussion、plan 和 ledger。

## 2. 确认实施前置门已关闭

```bash
rtk rg -n "Q171-005|Q171-010|Q171-012|Q171-013|Q171-014" specs/171-agent-live-runtime-bridge/discussion.md specs/171-agent-live-runtime-bridge/tasks.md
```

关闭条件：

- Q171-005 debug operation allowlist 已回写 spec/plan/tasks。
- Q171-010 performance budget/proof commands 已回写 plan 和 `02-hot-path-direction.md`。
- Q171-012/013/014 researchability header 边界已回写，AutoResearch loop concepts 已降级为 deferred-only。

## 3. Core Attachment 证明

实施后运行：

```bash
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-core test -- --run --cache --silent=passed-only --reporter=dot
```

预期证明：

- disabled path 是 structural no-op。
- adapter offers 不能拥有 runtime identity。
- cleanup 必须 drain evidence 或标记 dropped evidence。
- revoked、disconnected、target-unavailable attachment 必须进入 terminal state，后续请求只允许 denied/gap/degraded。
- transaction window 内无 IO。

## 4. 准入证明

需要覆盖这些用例：

```text
valid declared action + validator available -> operation.accepted -> completed/failed
stale manifest -> operation.denied, no mutation
digest mismatch -> operation.denied, no mutation
unavailable action contract -> operation.denied, no mutation
unauthorized target -> operation.denied, no mutation
missing validator for non-void dispatch -> operation.denied, no mutation
observation-only missing coordinate -> evidence.gap
remote/cloud mutation request -> operation.denied or unsupported gap, no mutation
```

记录到：

```text
specs/171-agent-live-runtime-bridge/notes/verification.md
```

## 4A. 运行证据到修复建议证明

实施后必须至少跑通一条 dogfood proof：

```text
logix live capture or dispatch
  -> logix live export evidence
    -> logix trial --mode startup --evidence <ref> or logix compare
      -> VerificationControlPlaneReport.repairHints
```

预期：

- `LiveCommandResult` 只包含 denial/gap/degraded、target coordinate、binding header、source/declaration refs 或 artifact refs 等 repair clues。
- `LiveCommandResult` 不包含 `repairHints`、`nextRecommendedStage` 或 verification verdict。
- `VerificationControlPlaneReport.repairHints` 是唯一修复建议 authority。
- 至少一个 localized repair hint 能通过 `relatedArtifactOutputKeys`、evidence refs 或 stable coordinate 追溯到 live-derived evidence。

## 4B. Browser Harness 证明

可重复 browser proof 使用 Playwright 或 repo 既有 browser test command：

```bash
rtk pnpm -C examples/logix-react test:browser -- --run --silent=passed-only --reporter=dot
```

实施过程中可以使用 `agent-browser` 辅助探索和故障定位：

```bash
rtk agent-browser open <local-url>
rtk agent-browser snapshot
rtk agent-browser console
rtk agent-browser errors
rtk agent-browser network requests
rtk agent-browser screenshot specs/171-agent-live-runtime-bridge/artifacts/browser-smoke.png
```

关闭规则：

- Playwright/browser test、CLI proof script 或 Vitest proof 可以关闭 browser/dogfood proof。
- `agent-browser` screenshot、snapshot、console、network、trace、recording 只能作为辅助 artifact，不能单独关闭 W171-001、W171-006 或 W171-009。
- Browser trace/profile 不能成为 `171` evidence authority；需要进入修复闭环时必须先转 canonical evidence package。

## 4C. Real Local Carrier 证明

本地体验与 dogfood proof 固定复用 examples dev server 的 5173 口径，不新增固定端口。root 已提供 `pnpm cli`，所有 Agent 可见 live 命令都通过它执行。

最小手动链路：

```bash
rtk pnpm cli live start --runId live-demo-start
rtk pnpm -C examples/logix-react dev -- --host localhost --port 5173 --strictPort
```

打开直达 demo：

```text
http://localhost:5173/playground/logix-react.live-bridge
```

随后在同一仓库根目录执行：

```bash
rtk pnpm cli live status --runId live-demo-status
rtk pnpm cli live targets --runId live-demo-targets --tree
rtk pnpm cli live timeline --runId live-demo-timeline-empty --target runtime:example-runtime/module:LiveBridgeFixture/instance:default --attachment <attachmentId> --limit 1
rtk pnpm cli live dispatch --runId live-demo-dispatch --target runtime:example-runtime/module:LiveBridgeFixture/instance:default --attachment <attachmentId> --action missing-action
rtk pnpm cli live timeline --runId live-demo-timeline-first --target runtime:example-runtime/module:LiveBridgeFixture/instance:default --attachment <attachmentId> --limit 1
rtk pnpm cli live timeline --runId live-demo-timeline-next --target runtime:example-runtime/module:LiveBridgeFixture/instance:default --attachment <attachmentId> --limit 2 --cursor <cursor.next>
rtk pnpm cli live capture --runId live-demo-capture --target runtime:example-runtime/module:LiveBridgeFixture/instance:default --attachment <attachmentId> --window 500ms
rtk pnpm cli live export evidence --runId live-demo-export --from <artifactRef.file>
```

预期输出形态：

- 每条 `pnpm cli live ...` stdout 只有一个 JSON `LiveCommandResult`。
- `status` 的 primary artifact kind 是 `LiveStatus`，inline 内含 IPC/WebSocket health 与 attachment states。
- `targets --tree` 的 primary artifact kind 是 `LiveTargetList`，target row 内含 `attachmentId`。同一 target 多 tab 时，后续 operation 必须显式传 `--attachment`。
- 首次空 timeline 可以返回 `LiveInspectArtifact(section="timeline")`，其 timeline gaps 中包含 `missing-operation-window`。这是 machine-readable gap，不需要人工日志判定。
- dispatch missing action 返回 `LiveOperationFacet(kind="operation.denied")`，并在 runtime-owned ledger 中产生后续 timeline 可读事件。
- timeline continuation 只使用 opaque `cursor.next`，不传 raw watermark JSON 或时间游标。
- capture 返回 daemon lineage ref，位于 artifact value 的 `artifactRef.file`。
- export evidence 返回 `CanonicalEvidencePackage`，或者返回结构化 `EvidenceGap`。`LiveCommandResult` 不包含 `repairHints`、`nextRecommendedStage` 或 verification verdict。

real carrier closure 必须运行：

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts test/Integration/live-daemon-multitab.contract.test.ts test/Integration/live-daemon-disconnect.contract.test.ts --reporter=dot
rtk pnpm -C packages/logix-react test -- --run test/internal/dev/live-browser-adapter.contract.test.ts test/hmr-host-carrier.contract.test.ts --reporter=dot
rtk pnpm -C examples/logix-react test:browser:live-real-carrier
rtk pnpm -C examples/logix-react exec tsx test/browser/live-dev-only-import.playwright.ts
```

预期：

- `logix live status` 能显示 daemon / IPC / WebSocket carrier health。
- browser dev adapter 通过 WebSocket 向 daemon 提交 `host.offer`。
- Vite dev plugin 与 `import "@logixjs/react/dev/live"` dev-only import 都安装同一个 browser adapter。
- dev-only import 轻页面 E2E 不依赖 Playground，不依赖 Vite plugin 注入，只通过一行 import 建立 browser -> daemon -> CLI/IPC 链路。
- CLI 通过 local IPC 获取 daemon-backed targets。
- 两个 browser tabs 指向同一 runtime 时输出两个 attachment rows。
- tab close / reload / daemon stop 后，相关 attachment 进入 disconnected/degraded/terminal state。
- daemon-backed `snapshot.read`、`capture.eventWindow`、`wait.condition`、`dispatch.declaredAction` 使用同一 browser-backed operation lane。
- daemon-backed `capture/snapshot/export evidence` 输出 live artifact、canonical evidence package 或 structured gap，不再使用 in-process proof gap 表示真实 carrier 场景。
- daemon-backed `wait.condition` 与 `dispatch.declaredAction` 使用同一 browser-backed operation lane，返回 `LiveOperationFacet` 或 owner-backed gap。
- 当同一 target coordinate 同时出现在多个 browser attachments 中，`capture/snapshot/wait/dispatch` 必须带 `--attachment <attachmentId>`；否则 daemon 返回 `ambiguous-live-target`，不隐式选择第一个 tab。
- operation 响应只接受同一 WebSocket、同一 `attachmentId`、同一 `requestId` 的回包；乱序并发允许，跨 tab 伪造或误发的回包不会 resolve pending request。
- `export evidence --from` 的精确输入是 operation 返回的 daemon lineage ref，也就是 artifact value 中的 `artifactRef.file`。裸 `captureId` 只作为调试别名；若多个 attachment 产生相同裸 ref，export 返回 `ambiguous-live-artifact-ref`。
- `LiveCommandResult` 仍不包含 `repairHints`、`nextRecommendedStage` 或 verification verdict。

## 4D. Launcher / Operator Snapshot 证明

daemon lifecycle hardening 必须运行：

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
```

预期：

- stale metadata 不会被 launcher 当作 ready daemon 复用。
- invalid metadata 会投影为 degraded carrier-local operator snapshot。
- ready-looking metadata 在 IPC unavailable 时会降级为 degraded carrier-local operator snapshot，而不是继续报告 ready。
- server metadata 不包含 targets、attachments、runtime、evidence 或 report truth。
- 默认 daemon 启动路径不包含 `tsx` 或第二 daemon bin；`tsx` 只允许作为测试 launch override 的实现细节。
- public/build surface 只保留 `logix` binary，不构建或发布第二 daemon bin。
- 未新增 `ensure/restart/logs/doctor` public lifecycle grammar。
- pid/log/state 只作为 carrier-local operator evidence，不是 public file contract。

## 5. Canonical Evidence 证明

实施后验证 live facts 只能通过 canonical evidence 进入：

```bash
rtk rg -n "LiveEvidenceSidecar|RuntimeOperationEvent|produced runtime evidence|live-owned validator" packages docs specs/171-agent-live-runtime-bridge specs/165-runtime-workbench-kernel specs/167-runtime-reflection-manifest
```

预期证明：

- active facts 是 canonical event/artifact facets。
- reflection manifest 不包含 produced runtime evidence。
- Workbench 只消费 canonical evidence 或 owner-approved artifact refs。

## 6. Workbench Projection 证明

聚焦检查：

```bash
rtk pnpm -C packages/logix-core test -- --run --cache --silent=passed-only --reporter=dot
rtk pnpm -C packages/logix-devtools-react typecheck
rtk pnpm -C packages/logix-playground typecheck
```

预期证明：

- live operation facets 进入 `truthInputs`。
- static-live binding header 进入 `contextRefs` 或 facet metadata。
- selection manifest 只能进入 `selectionHints`。
- Workbench 不能只凭 operation facet 创建 diagnostic finding。

## 7. Selector / Host Stage 证明

必需用例：

```text
selector-route observation without stageClass -> drilldown or evidence gap
host commit evidence without scenario/host-harness authority -> no check/startup verdict
profile/snapshot facet with drilldown-only -> no compare primary axis
scenario evidence -> scenario-backed projection allowed
host-harness artifact -> host-harness-backed projection allowed
```

相关文档：

```bash
rtk sed -n '140,190p' docs/ssot/runtime/09-verification-control-plane.md
rtk sed -n '250,290p' specs/165-runtime-workbench-kernel/spec.md
```

## 8. Dogfood Route 证明

Playground wiring 存在后执行：

```bash
rtk pnpm -C examples/logix-react typecheck
rtk pnpm -C examples/logix-react test:browser -- --run --silent=passed-only --reporter=dot
```

必需 dogfood flow：

```text
attach
  -> logix live targets
    -> bind manifest
      -> Batch 6 allowlisted operation or capture slot
        -> capture window
          -> logix live export evidence
            -> Workbench projection
              -> compare handoff
```

## 9. 性能证明

使用 Batch 6 采纳的预算：

```bash
rtk pnpm check:effect-v4-matrix
rtk pnpm perf collect -- --profile default --out specs/171-agent-live-runtime-bridge/perf/before.<sha>.<envId>.default.json
rtk pnpm perf collect -- --profile default --out specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json
rtk pnpm perf diff -- --before specs/171-agent-live-runtime-bridge/perf/before.<sha>.<envId>.default.json --after specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json --out specs/171-agent-live-runtime-bridge/perf/diff.before__after.json
rtk pnpm perf validate -- --report specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json
```

记录位置：

```text
specs/171-agent-live-runtime-bridge/notes/perf-evidence.md
```

## 10. 最终负向文本扫查

```bash
rtk rg -n "Runtime\\.devtools|runtime\\.devtools|Runtime\\.inspect|runtime\\.inspect|Logix\\.Reflection|RuntimeAgentPort|LiveEvidenceSidecar|RuntimeOperationEvent|CommandResult.*live|globalThis\\.__LOGIX|\\blogix (status|capture|snapshot|trigger|wait|export)\\b" packages docs specs examples
```

所有剩余命中必须分类：

- forbidden-shape
- history-only
- discussion-only
- deferred-only
- negative-only
- internal-only

关闭要求：不存在采用 forbidden shape 的 active authority 或 public sample 命中。
