# 安全与预算规划说明

本页承接 Batch 6 的已冻结内容。它是 171 实施前的安全与预算规划合同，不是公开 API。

## Operation Allowlist

P1:

| operation kind | mutation | 范围 |
| --- | --- | --- |
| `target.discover` | no | local/browser/Node/Playground/cloud observation，受 auth 约束 |
| `capture.eventWindow` | no | bounded window，带 sampling 与 drop markers |
| `snapshot.read` | no | read-only、budgeted、redacted |
| `wait.condition` | no runtime mutation | 基于 owner-approved condition 的 timeout-bound wait |
| `evidence.export` | no runtime mutation | 只输出 canonical evidence package 与 artifact refs |
| `dispatch.declaredAction` | yes | 仅 declared action，必须完整 admission |
| `profile.runtimeSummary` | observation only | local-only bounded summary，explicit opt-in |

P2 或后续：

- browser CPU profile integration。
- heap snapshot。
- remote/cloud mutation。
- long-running stream。
- cross-process aggregation。

已拒绝：

- arbitrary state patch。
- time travel mutation。
- hidden internal mutation。
- undeclared action dispatch。
- dynamic code eval。
- host DOM mutation through bridge。
- transaction-window IO。
- unbounded raw trace stream。

## 准入请求最小字段

- actor id。
- adapter kind。
- session、tenant 或 process boundary，存在时必填。
- target coordinate。
- operation kind。
- permission scope。
- 使用 capability lease 时，必须包含 lease id、过期时间和撤销状态。
- origin 或 process id，存在时必填。
- mutation-capable 时必须包含 static-live binding header。
- budget profile。
- redaction policy ref。

Mutation-capable operation 必须在 runtime scheduling 前通过 admission。任何 precondition failure 都返回 `operation.denied`，且 no mutation。

## Attachment 与远程边界

- Mutation-capable operation 必须通过 admission。
- Unauthorized operation 返回 `operation.denied` 且 no mutation。
- Sensitive host/runtime data 必须 redacted 或 omitted，并带 marker。
- Cloud attachment 不能使用 `globalThis` 作为 authority。
- Transaction window 不能执行 IO。
- Browser attachment 必须 dev-only opt-in；exact global hook name 不冻结。
- Node attachment 必须受 process/session boundary 约束。
- Playground attachment 只作为 dogfood host，不拥有 product truth。
- Remote/cloud P1 默认为 observation-only。Remote/cloud mutation 必须等待 future cloud product protocol。

## 脱敏类别

- secret、token、cookie、header、env、config values。
- tenant、user、session、origin、process identifiers。
- user payload values 与 action payload values。
- host DOM text、path、URL、browser storage、source snippets。
- stack traces、raw error causes、network metadata、filesystem paths。
- large、cyclic、non-serializable、high-cardinality values。

被省略数据必须产出 redaction marker、degradation marker 或 evidence gap。

## 预算阈值

| 类别 | 阈值 |
| --- | --- |
| disabled path | structural no-op；无 capture buffer、serialization、transport IO 或 transaction 内 listener fanout |
| disabled p95 regression | 相对可比较 baseline 不超过 1 percent 或 0.05 ms |
| event window default | 256 events per target/window |
| event window hard proof cap | 2048 events |
| event payload inline summary | 4 KiB |
| snapshot inline preview | 64 KiB |
| local runtime profile summary | 最长 5 秒，只允许 sampled summary |
| evidence export inline budget | 2 MiB |

更大内容必须转为 artifact ref、degradation marker、budget marker 或 redaction marker。

## 证明命令

```bash
rtk pnpm perf collect -- --profile default --out specs/171-agent-live-runtime-bridge/perf/before.<sha>.<envId>.default.json
rtk pnpm perf collect -- --profile default --out specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json
rtk pnpm perf diff -- --before specs/171-agent-live-runtime-bridge/perf/before.<sha>.<envId>.default.json --after specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json --out specs/171-agent-live-runtime-bridge/perf/diff.before__after.json
rtk pnpm perf validate -- --report specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json
```

`comparable=false` 或 missing suite 禁止关闭 disabled overhead proof。

## 失败策略

- Budget overflow 必须带 marker 降级。
- Missing sensitive field 必须变成 redaction marker 或 evidence gap。
- Incomparable perf evidence 不能关闭 SC-005。
- Mutation precondition failure 必须是 `operation.denied`，不能退化成 `operation.failed`。
