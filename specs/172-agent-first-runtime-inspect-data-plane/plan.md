# 实施计划：Agent-first Runtime Inspect Data Plane

## 目标

172 以双轨关闭 Runtime inspect data plane：

- Core pressure lane：补齐 CLI 终局所需的 owner-backed Runtime inspect facets。
- CLI product lane：把 `logix live` 打磨为 Agent 可用的概念 DevTools 问法。

172 完成后，当前 P0/P1 Runtime 观察问题都应能通过 CLI 获取 owner-backed output、canonical evidence 或 structured gap。P2 只保留 future owner 与 reopen bar。

## 技术上下文

- TypeScript 5.9、Effect 4 beta、Vitest、Playwright。
- live carrier 已由 171 完成：browser WebSocket adapter、local daemon、CLI IPC、多 attachment 隔离、daemon lineage export。
- 172 必须在修改 `packages/logix-cli/src/internal/liveDaemonServer.ts` 与 `packages/logix-cli/src/internal/liveClient.ts` 前重新读取文件，因为存在并行会话改动风险。
- 所有 shell 命令使用 `rtk`。

## 约束

- 不新增 public `Runtime.inspect`、`Runtime.devtools`、`Logix.Reflection`。
- 不把 live output 升级成 verification verdict。
- 不复制 DevTools UI state。
- 不在 CLI 层拼第二套 Runtime truth。
- 不破坏 171 的 attachment-first 与并发隔离。
- 不让 Workbench Kernel 变成 Runtime fact owner。
- 新命令必须同步 docs SSoT、CLI schema/contract tests、skills。
- harness/proof 资产遵循 [../../../docs/standards/harness-and-proof-assets-standard.md](../../../docs/standards/harness-and-proof-assets-standard.md)；`R172-*` row refs 只允许停在 specs、notes、test metadata 或 test-only coverage inventory。
- 生产 `src/**`、CLI machine output、daemon/browser adapter payload 不保留 matrix row helper、spec 编号 schema version 或 temporary probe/witness/pressure helper。

## 已冻结裁决

- `parity-matrix.md` 是 route SSoT。
- 采纳 `LiveInspectFacetEnvelope<View, Payload>` 与 `LiveInspectArtifact(section=...)`。
- 拒绝长期大 bundle `RuntimeInspectProjection`。
- `inspect <target>` 返回 target detail、host context、manifest digest 和 facet refs。
- `state/actions/events/timeline/fields/field-graph/field-summary/summary` 是单 facet drilldown。
- `snapshot` 是 bounded target bundle composition，不是新 fact model。
- `capture` 继续只做 event window/evidence capture。
- `events --kind <kind>` 是 bounded owner-side filter。
- Runtime Inspect Coverage Harness 是最终验收门：当前内核可 inspect fact family 必须全部映射到 route、owner-backed facet、structured gap、deferred owner 或 rejected/future row。
- P0 必须实现 owner-backed output；P1 必须实现 owner-backed output 或 structured gap；P2 默认 deferred。
- `discussion.md` 只保存 deferred/open items。

## 阶段计划

### Phase 0 - Authority Freeze And Discussion Drainage

Status: complete for planning baseline.

1. `spec.md` 已冻结目标函数、fact authority、priority closure 和 facet contract。
2. `parity-matrix.md` 已升级为有限 matrix 合同。
3. `discussion.md` 已排水，只保留仍未决 implementation risks 与明确 deferred 项。
4. `implementation-details/*` 已承接已采纳的 owner、grammar、facet、evidence bridge 裁决。
5. [implementation-details/core-implementation-slices.md](./implementation-details/core-implementation-slices.md) 已把 core pressure 拆成可执行切片，实施 `WP-002 / WP-003 / WP-005 / WP-006 / WP-008` 前必须先读。

### Phase 1 - P0 Core Pressure

Implementation reference: [implementation-details/core-implementation-slices.md](./implementation-details/core-implementation-slices.md) Slice A/B/C/F.

1. 实现 target-scoped inspect facet。
2. 实现 target-scoped latest state / state path facet。
3. 实现 live target -> reflection action manifest 绑定，唯一内部绑定事实为 owner-side `LiveManifestBindingRef`。
4. 实现 owner-backed payload validation/static-live binding dispatch header。
5. 实现 snapshot facet refs composition，替换空壳 capture。
6. 补 disabled-overhead、serialization budget、redaction/degraded marker tests。

### Phase 2 - P0 CLI Commands

1. 重新读取 `packages/logix-cli/src/internal/liveDaemonServer.ts` 与 `packages/logix-cli/src/internal/liveClient.ts`。
2. 升级 `logix live inspect <target>`。
3. 新增 `logix live state`。
4. 新增 `logix live actions`。
5. harden `logix live dispatch`。
6. 升级 `logix live snapshot`。
7. 添加 CLI parser、schema、contract tests 和 daemon/browser e2e tests。

### Phase 3 - P1 Core Pressure

Implementation reference: [implementation-details/core-implementation-slices.md](./implementation-details/core-implementation-slices.md) Slice D/E/F.

1. 下沉 event/timeline projection，避免依赖 React DevTools compute。
2. owner-side 生成 bounded `stateAfter`，只允许真实 post-event state source，禁止用 latest state 回填历史 item。
3. 下沉 operation summary projection。
4. 增加 field inspect JSON-safe digest-guarded projection，`field-graph` 固定为 fieldPath-keyed semantic adjacency summary。
5. 增加 inspect artifacts 到 evidence/workbench 的桥接。
6. 所有暂缺 owner hook 的 P1 facet 返回 structured gap。

### Phase 4 - P1 CLI Commands

1. 新增 `logix live events --kind <kind>`。
2. 新增 `logix live timeline`。
3. 新增 `logix live summary`。
4. 新增 `logix live fields`。
5. 新增 `logix live field-graph`。
6. 新增 `logix live field-summary`。
7. 添加 E2E：Playwright 页面 + dev-only import + simulated CLI 完整查询链路。

### Phase 5 - Runtime Inspect Coverage Harness

Implementation reference: [implementation-details/runtime-inspect-coverage-harness.md](./implementation-details/runtime-inspect-coverage-harness.md).

1. 建立 runtime inspect coverage inventory，覆盖当前 core inspectable fact families。
2. 将每个 fact family 映射到 `parity-matrix.md` row、CLI route、artifact section 和 proof ref。
3. 对 `RuntimeInternals`、DebugSink、reflection、field-runtime、repoBridge live 能力做 unmapped scan。
4. 分四层证明：core inventory contract、core facet contract、CLI/schema contract、browser E2E + evidence handoff。
5. 失败条件固定为：P0/P1 row 未映射、core fact family 未映射、CLI/daemon/browser adapter 成为 fact authority、gap 无 owner/reopen bar、绕过 `LiveManifestBindingRef`、latest state 回填历史 `stateAfter`、field graph 使用 raw graph identity。
6. 将 harness command、inventory digest、unmapped count、gap/deferred/rejected counts 和 evidence export refs 写入 `notes/verification.md`。
7. 运行 production source hygiene sweep，确认 `R172-*`、`matrixRow`、test-only inventory schema 与 planning helper 未进入 `src/**`。
8. 对仍以 structured gap 或 deferred owner 关闭的 producer，按 [implementation-details/owner-gap-closure-analysis.md](./implementation-details/owner-gap-closure-analysis.md) 反推终局 owner model、现有实现让道点、内核重构前置条件、优先级和后续需求拆分；179 关闭后，该文件作为 closure ledger，当前只剩 React host evidence 与 local profiler owner 两个 deferred backlog。

### Phase 6 - P2 Deferred Guard

1. React render/selector evidence 与 render count 保持 `LiveInspectArtifact(section="react-host")` structured gap。
2. `profile.runtimeSummary` 沿用 171/15 profile lane，保持 bounded structured gap，除非独立完成 profiler owner 与 overhead proof。
3. 更新 matrix deferred rows 的 future owner 与 reopen bar。

### Phase 7 - 文档、Skills 与验证

1. 回写 `docs/ssot/runtime/15-cli-agent-first-control-plane.md`。
2. 回写 `specs/171-agent-live-runtime-bridge/spec.md` 的 post-171 handoff。
3. 如 Workbench input 改变，回写 `specs/165-runtime-workbench-kernel/spec.md`。
4. 如 reflection binding 改变，回写 `specs/167-runtime-reflection-manifest/spec.md`。
5. 更新 `skills/logix-cli` 与 `skills/logix-best-practices`，覆盖 172 live inspect drilldown、evidence handoff 和 coverage harness。
6. 运行 typecheck、targeted tests、Playwright e2e、text sweep。
7. 写入 `notes/verification.md`。

## 验证矩阵

最小验证：

```text
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-react typecheck
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-cli test -- --run <172 targeted tests> --reporter=dot
rtk pnpm -C packages/logix-react test -- --run <172 live adapter tests> --reporter=dot
rtk pnpm -C packages/logix-core test -- --run <172 runtime inspect tests> --reporter=dot
rtk pnpm -C packages/logix-core test -- --run runtime-inspect-coverage.harness --reporter=dot
rtk pnpm -C examples/logix-react exec tsx <172 playwright e2e>
rtk rg -n "R172-|matrixRow|matrixRowForSection|runtime-inspect-coverage@172|Probe|Witness|Pressure" packages/logix-core/src packages/logix-cli/src packages/logix-react/src --glob '!**/node_modules/**' --glob '!**/dist/**'
rtk rg -n "logix live (state|actions|events|timeline|fields|field-graph|field-summary|summary)|runtime-inspect-coverage.harness|LiveInspectArtifact" skills/logix-cli skills/logix-best-practices
rtk rg -n "Runtime\\.inspect|runtime\\.inspect|Runtime\\.devtools|runtime\\.devtools|Logix\\.Reflection|\\blogix (state|actions|events|timeline|fields|field-graph|field-summary|summary)\\b" packages docs specs examples
```

Required proof families:

- disabled-overhead proof for live inspect hooks.
- serialization budget tests.
- redaction marker tests.
- degraded marker tests.
- multi-tab and same-tab concurrent request isolation tests.
- evidence export / Workbench projection tests.
- Runtime Inspect Coverage Harness proving zero unmapped current core fact families.
- skills sync proof for `skills/logix-cli` and `skills/logix-best-practices`.

文本 sweep 说明：

- 新 `logix live state/actions/events/...` 命中是允许的。
- 裸 root `logix state/actions/events/...` 禁止。
- public `Runtime.inspect` / `Runtime.devtools` / `Logix.Reflection` 禁止。
