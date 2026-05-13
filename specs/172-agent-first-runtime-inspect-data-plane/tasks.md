# 任务：Agent-first Runtime Inspect Data Plane

**输入**: `/specs/172-agent-first-runtime-inspect-data-plane/` 下的设计文档
**前置文档**: [spec.md](./spec.md), [parity-matrix.md](./parity-matrix.md), [plan.md](./plan.md), [implementation-details/](./implementation-details/), [implementation-details/core-implementation-slices.md](./implementation-details/core-implementation-slices.md), [implementation-details/runtime-inspect-coverage-harness.md](./implementation-details/runtime-inspect-coverage-harness.md), [implementation-details/owner-gap-closure-analysis.md](./implementation-details/owner-gap-closure-analysis.md)

## Work Packets

- [x] **WP-001 Planning Authority Freeze**
  覆盖 `R172-001` 到 `R172-026`。冻结 `parity-matrix.md`、facet contract、CLI grammar、priority closure，并排水 `discussion.md`。

- [x] **WP-002 P0 Target / State Inspect Core**
  覆盖 `R172-002`、`R172-003`、`R172-004`。按 [core-implementation-slices.md](./implementation-details/core-implementation-slices.md) Slice A/B 实现 target detail、latest state、state path owner-backed facets；包含 missing path、redaction、budget、disabled-overhead tests。

- [x] **WP-003 P0 Reflection / Dispatch Binding Core**
  覆盖 `R172-005`、`R172-006`、`R172-007`、`R172-008`。按 [core-implementation-slices.md](./implementation-details/core-implementation-slices.md) Slice C 实现 owner-side `LiveManifestBindingRef`、payload summary、owner-backed validation、static-live binding denial/completion detail；`missing-live-manifest-binding` 只能是 per-target transient gap，不能作为 P0 结构性关闭条件。

- [x] **WP-004 P0 CLI Product Routes**
  覆盖 `R172-002` 到 `R172-009`、`R172-022`。重新读取 `liveDaemonServer.ts` 与 `liveClient.ts` 后，升级 `inspect <target>`、`state`、`actions`、`dispatch`、`snapshot`、`export evidence`；同步 parser/schema/contract tests。

- [x] **WP-005 P1 Event / Timeline / Summary Core**
  覆盖 `R172-010` 到 `R172-015`、`R172-019`、`R172-020`。按 [core-implementation-slices.md](./implementation-details/core-implementation-slices.md) Slice D 实现 event kind filter、timeline `stateAfter` owner-side projection、fieldPath filter、operation summary；`stateAfter` 只允许 recorded post-event state、event artifact ref 或 watermark 精确匹配的 current head；缺 producer 时返回 structured gap。

- [x] **WP-006 P1 Field Inspect Core**
  覆盖 `R172-016`、`R172-017`、`R172-018`。按 [core-implementation-slices.md](./implementation-details/core-implementation-slices.md) Slice E 实现 field list、fieldPath-keyed field graph/plan semantic adjacency、latest field summary JSON-safe digest-guarded projection；禁止 raw node/edge/runtime object 与临时 graph node id。

- [x] **WP-007 P1 CLI Drilldown Routes**
  覆盖 `R172-010` 到 `R172-021`。新增 `events --kind`、`timeline`、`summary`、`fields`、`field-graph`、`field-summary`；同步 CLI parser/schema/public surface guard 和 command result tests。

- [x] **WP-008 Evidence / Workbench Bridge**
  覆盖 `R172-022`。按 [core-implementation-slices.md](./implementation-details/core-implementation-slices.md) Slice F 为每个 daemon-backed inspect artifact mint lineage ref；`export evidence` 将 `LiveInspectArtifact(section=...)` 映射到 canonical evidence package；Workbench 只消费 artifact refs/canonical evidence/gaps。

- [x] **WP-009 Browser E2E And Concurrency Proof**
  覆盖 `R172-001` 到 `R172-022`。添加 Playwright 页面 + dev-only import + simulated CLI E2E，验证 state/actions/events/fields 查询链路、多 tab、同 tab 并发、forged response ignore 和 ambiguous target。

- [x] **WP-010 Runtime Inspect Coverage Harness**
  覆盖 `R172-001` 到 `R172-026` 和当前 core inspectable fact families。按 [runtime-inspect-coverage-harness.md](./implementation-details/runtime-inspect-coverage-harness.md) 实现四层证明：core inventory contract、core facet contract、CLI/schema contract、browser E2E + evidence handoff；未映射数量必须为 0。

- [x] **WP-011 Docs / Skills / SSoT Sync**
  覆盖所有 rows。回写 `docs/ssot/runtime/15-cli-agent-first-control-plane.md`、`specs/171-agent-live-runtime-bridge/spec.md`、必要的 `165/167` specs、`skills/logix-cli`、`skills/logix-best-practices`、`notes/verification.md`。两个 skill 必须描述 172 live inspect drilldown、evidence handoff 和 coverage harness；不能停留在 171 live command surface。

- [x] **WP-012 P2 Deferred Guard**
  覆盖 `R172-023`、`R172-024`。React host selector/render evidence 和 runtime profile summary 只输出 structured gap，除非 future owner 与 disabled-overhead proof 同时落地。

- [x] **WP-013 Final Verification And Sweep**
  覆盖全部 rows。运行 typecheck、targeted core/react/cli tests、Runtime Inspect Coverage Harness、Playwright E2E、forbidden text sweep、`git diff --check`，并把证据写入 `notes/verification.md`。

- [x] **WP-014 Owner Gap Closure Analysis**
  覆盖当前 structured-gap 和 deferred owner rows。新增 [implementation-details/owner-gap-closure-analysis.md](./implementation-details/owner-gap-closure-analysis.md)，逐项展开 reflection live binding、runtime-live operation ledger、field-runtime inspect model、timeline、diagnostics、process events、React host 和 profile summary 的终局形态、现有实现让道点、内核重构前置条件、优先级和后续需求拆分；不改变 172 的 `Owner-backed or gap` 关闭语义。

## Required Verification Commands

```text
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-react typecheck
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-core test -- --run <172 runtime inspect tests> --reporter=dot
rtk pnpm -C packages/logix-react test -- --run <172 live adapter tests> --reporter=dot
rtk pnpm -C packages/logix-cli test -- --run <172 CLI tests> --reporter=dot
rtk pnpm -C packages/logix-core test -- --run runtime-inspect-coverage.harness --reporter=dot
rtk pnpm -C examples/logix-react exec tsx <172 playwright e2e>
rtk rg -n "R172-|matrixRow|matrixRowForSection|runtime-inspect-coverage@172|Probe|Witness|Pressure" packages/logix-core/src packages/logix-cli/src packages/logix-react/src --glob '!**/node_modules/**' --glob '!**/dist/**'
rtk rg -n "logix live (state|actions|events|timeline|fields|field-graph|field-summary|summary)|runtime-inspect-coverage.harness|LiveInspectArtifact" skills/logix-cli skills/logix-best-practices
rtk rg -n "Runtime\\.inspect|runtime\\.inspect|Runtime\\.devtools|runtime\\.devtools|Logix\\.Reflection|\\blogix (state|actions|events|timeline|fields|field-graph|field-summary|summary)\\b" packages docs specs examples
rtk git diff --check -- specs/172-agent-first-runtime-inspect-data-plane specs/171-agent-live-runtime-bridge docs/ssot/runtime/15-cli-agent-first-control-plane.md skills/logix-cli skills/logix-best-practices packages/logix-core packages/logix-react packages/logix-cli examples/logix-react
```

## Read-before-edit Guard

Before editing these files, reread their current contents because another session may have changed them:

- `packages/logix-cli/src/internal/liveDaemonServer.ts`
- `packages/logix-cli/src/internal/liveClient.ts`
