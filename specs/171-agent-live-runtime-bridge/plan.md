# 实施计划：Agent Live Runtime Bridge

**分支**: `171-agent-live-runtime-bridge` | **日期**: 2026-05-01 | **规格**: [spec.md](./spec.md)
**输入**: `/specs/171-agent-live-runtime-bridge/spec.md`

## 摘要

171 的执行方向已经由 Batch 1 到 Batch 7 冻结：

```text
public `logix live` transport
  -> core-owned RuntimeAttachment substrate
    -> LiveTarget / ControlledOperation / EvidenceWindow capabilities
      -> canonical live evidence event/artifact facets
        -> Runtime Workbench projection
          -> runtime.check / runtime.trial / runtime.compare closure
```

## 终局架构

终局链路固定为：

```text
host offer
  -> transport projection
    -> core-owned attachment
      -> normalized live topology
        -> canonical evidence facets
          -> Workbench projection
            -> verification closure
```

终局约束：

- `attachmentId` 是 offer / session 侧稳定身份。
- `hostCoordinate` 是 host locator，browser tab / Node process / Playground host / cloud session 只属于这一层。
- `runtimeCoordinate` 是 runtime/module/instance/txn/op 层身份。
- 多个 browser tabs 可以指向同一 runtime/module/instance，但它们必须表现为多个 attachment offer，而不是一个被 tab 文案糊在一起的 runtime truth。
- WebSocket、socket、stdio、IPC 与 daemon 只是 carrier 选择，不是语义边界。
- CLI 看到的是 attachment / host / runtime / target 的组合投影，不自己合成第二套 truth。
- `tabId` 只在 browser host metadata 可得时作为 locator 使用，不进入 public identity 心智。

本计划只承接执行约束。它新增 public `logix live ...` 命名空间，但不新增 flat live root commands，不冻结 `RuntimeAgentPort` 具体 DTO，不冻结浏览器 global hook 名称，不新增 `Logix.Reflection` 或 DevTools-owned truth。

当前状态：Batch 1 到 Batch 7、semantic MVP proof、真实 browser/daemon/CLI carrier、concurrent attachment isolation 与 launcher/operator snapshot hardening 均已完成。`logix live` 已从 in-process proof transport 收敛到真实 local daemon / browser WebSocket / CLI IPC carrier；执行记录见 [implementation-plan-real-carrier.md](./implementation-plan-real-carrier.md)、[implementation-plan-concurrency-isolation.md](./implementation-plan-concurrency-isolation.md)、[tasks.md](./tasks.md) 阶段 11 到 13 与 [notes/verification.md](./notes/verification.md)。

实施必须采用 [implementation-details/harness-path.md](./implementation-details/harness-path.md) 的 harness-first 路线。Playwright/browser dogfood proof 是可重复验收主路径；`agent-browser` 可作为实施中的探索式 browser QA、截图、accessibility snapshot、console/error/network 采集工具，但不能单独关闭最终 proof。

## 阶段角色

- 本文件记录 171 的执行约束、阶段边界、验证矩阵和回写目标。
- [implementation-plan.md](./implementation-plan.md) 记录已执行 semantic MVP worker 步骤；它不得替代本文件的 owner law、proof gates 或 SSoT 回写规则。
- [implementation-plan-real-carrier.md](./implementation-plan-real-carrier.md) 记录真实 local daemon / browser WebSocket / CLI IPC carrier 与双前端 dev entry 的 worker 执行步骤；它不得把 WebSocket、daemon、socket、tab id、Vite plugin、dev-only import 或 React DevTools protocol 升格为 runtime truth。该计划早期的第二 daemon bin 形态已被后续 launcher/operator snapshot hardening 收敛为 current CLI re-exec。
- [../../docs/proposals/live-daemon-lifecycle-architecture-memo.md](../../docs/proposals/live-daemon-lifecycle-architecture-memo.md) 记录 daemon lifecycle 的仓库级架构备忘；其目标是把 `launcher clean cut + carrier-local operational gates` 这条边界判断稳定下来，而不把它包装成新的需求或实施方案。
- 当前 daemon lifecycle 实现固定为 repo-internal launcher + carrier-local operator snapshot：无 supervisor，无 public lifecycle grammar，无第二 daemon bin build surface。
- [scenarios.md](./scenarios.md) 记录 171 完成后用户和 Agent 可执行的经典场景目录；实施时 required 场景必须能回链到 proof、task 或 owner SSoT。
- 本文件不得覆盖 [spec.md](./spec.md)、`09`、`14`、`15`、`165`、`167`、`168` 的 owner truth。
- 稳定结果必须回写到对应 SSoT、spec、plan/task、review ledger 或 proof note，不能只留在实现 diff。

## 北极星与裁剪特性

- **北极星编号**: NS-3, NS-4, NS-5, NS-7, NS-8, NS-10
- **裁剪特性编号**: KF-3, KF-4, KF-6, KF-8, KF-9, KF-10

## 技术上下文

**语言/版本**: TypeScript 5.9, Effect 4.0.0-beta.28
**主要依赖**: `@logixjs/core`, `@logixjs/react`, `@logixjs/cli`, `@logixjs/playground`, `@logixjs/devtools-react`, Effect, 既有 verification/reflection/workbench internals
**存储**: N/A。持久交接只允许 canonical evidence package 与 artifact refs，不新增数据库或 sidecar。
**测试**: Vitest；Layer/Effect-heavy 测试使用 `@effect/vitest`；examples/Playground dogfood 使用 browser proof。
**目标平台**: Node.js 20+ 与现代浏览器。
**项目类型**: pnpm workspace，多 package runtime/docs 规划切片。
**性能目标**: disabled path 为 structural no-op 或 static-empty；禁止 per-transaction adapter discovery、transport allocation、listener fanout、buffer allocation、serialization 或 IO。Enabled capture 必须 bounded、sampled、degradable。
**约束**: 事务窗口禁止 IO；live facts 只能作为 canonical evidence event/artifact facets 进入；Workbench 保持 projection-only；public CLI 为 `check / trial / compare + live`；cloud attachment 需要 explicit auth 且不能使用 `globalThis` authority。
**规模/范围**: 第一实施目标是 repo-internal dogfood path，贯穿 core attachment、Playground host、canonical evidence handoff 与 Workbench projection。

## 宪法检查

- **NS/KF traceability**: 已在 spec stories、FR/NFR/SC 中保留。
- **Docs-first & SSoT**: Batch 1 到 7 已回写 `spec.md`、`discussion.md`、`02`、`09`、`14`、`165`、`167`、`168`、`16` 和 review ledgers。
- **Intent -> Runtime chain**: Agent debugging intent 经 `logix live` attach/observe/act/capture/export 转成 canonical evidence，再回到 verification control plane。
- **Effect/Logix contract**: 不新增 public authoring surface。内部 Runtime Services、attachment substrate、canonical evidence facets 必须按 owner SSoT 定义。
- **IR / anchors**: 不扩张 static IR，不新增第二 manifest family。active runtime facts 属于 live evidence。
- **Deterministic identity**: runtime/module/instance/txn/op/session/artifact/evidence 坐标必须 owner-provided 或生成 evidence gap，禁止默认随机 id。
- **Transaction boundary**: active operation flow 固定为 admission -> runtime scheduling -> post-commit evidence drain -> adapter transport，事务窗口内无 IO。
- **React consistency**: React host 只作为 adapter offer 和 host evidence source，不成为第二 runtime truth。
- **External sources**: adapter 只能 submit attach offer 或 normalized evidence feed，不能 push 每个 transport payload 进入 core hot path。
- **Internal contracts**: exact `RuntimeAgentPort` name/DTO deferred；实施前应使用 core-owned internal service boundary，不依赖 process-global singleton。
- **Performance budget**: Batch 6 已冻结 disabled/enabled budget 和 proof commands；实施必须记录可比较证据。
- **Diagnosability**: evidence facets 必须 bounded、serializable、coordinate-backed、redaction-aware。
- **Breaking changes**: forward-only，无兼容层，无 deprecated live CLI family。
- **Single-track implementation**: 直接朝 `logix live` + core-owned attachment + canonical evidence path cutover，不设计 DevTools/CLI/Playground 并行 truth。
- **Public submodules**: `packages/logix-core/src/*.ts` 不新增空 re-export public root；内部实现落 `src/internal/**`。
- **Large modules**: 触及 ≥1000 LOC 文件前必须先写 decomposition brief 到 [implementation-details/decomposition-brief.md](./implementation-details/decomposition-brief.md)。
- **质量门**: 见本文件验证策略。

## 入口门

### Gate A：规划准入

已满足：

- Batch 1 冻结 core live bridge first, conditional CLI live。
- Batch 2 历史上冻结 zero public live commands；后续 CLI owner rewrite 已重开并采纳受限 `logix live` public namespace。
- Batch 3 冻结 core attachment authority, adapter offer only。
- Batch 4 冻结 static reflection contract, canonical live evidence facets。

### Gate B：实施准入

实施前必须全部满足：

- Batch 5 已关闭 DevTools / Playground / Workbench convergence。
- Batch 6 已关闭 debug operation allowlist、permission、安全、redaction、budget 和 proof commands。
- Batch 7 已关闭 researchability header 字段边界和 deferred AutoResearch list。
- [tasks.md](./tasks.md) 的阶段 0 文档同步项全部完成。
- 性能证据计划使用当前 workspace 的 `pnpm perf collect / diff / validate` 命令，并记录到 [notes/perf-evidence.md](./notes/perf-evidence.md)。

## 性能证据计划

171 触及 runtime attachment、diagnostics producer feed、evidence capture 和 adapter transport，必须提供性能证据。

- Baseline 语义：代码前后，且必须 comparable。
- envId：实施时记录 `<os-arch.cpu.node.browser-version.headless>`。
- profile：`default` 作为交付基线；`quick` 只允许探路；若噪声大升级到 `soak`。
- disabled-path proof：
  - 验证 no bridge / bridge disabled / adapter present but inactive 三种状态。
  - 指标至少包含 txn commit 时间、分配量或事件数量中的两类。
  - 禁止出现 transaction 内 serialization、buffer allocation、transport IO。
  - p95 regression gate: max 1 percent or 0.05 ms over comparable baseline。
- enabled-path proof：
  - event window capture、snapshot、profile、evidence export 分开计量。
  - 必须记录 budget、sampling、dropped、degraded、redaction markers。
  - profile 只覆盖 local-only bounded runtime summary；browser CPU/heap profile 不属于 P1 closure。
- 初始命令模板：

```bash
rtk pnpm check:effect-v4-matrix
rtk pnpm perf collect -- --profile default --out specs/171-agent-live-runtime-bridge/perf/before.<sha>.<envId>.default.json
rtk pnpm perf collect -- --profile default --out specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json
rtk pnpm perf diff -- --before specs/171-agent-live-runtime-bridge/perf/before.<sha>.<envId>.default.json --after specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json --out specs/171-agent-live-runtime-bridge/perf/diff.before__after.json
rtk pnpm perf validate -- --report specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json
```

失败策略：

- `stabilityWarning / timeout / missing suite` 触发复测。
- `comparable=false` 禁止下硬结论。
- disabled-path 回归未解释前不得关闭 SC-005。

## 项目结构

### 文档

```text
specs/171-agent-live-runtime-bridge/
├── spec.md
├── discussion.md
├── plan.md
├── implementation-plan.md
├── implementation-plan-real-carrier.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
├── contracts/
│   └── README.md
├── implementation-details/
│   ├── attachment-substrate.md
│   ├── transport-topology.md
│   ├── evidence-facets.md
│   ├── security-budget.md
│   ├── harness-path.md
│   └── decomposition-brief.md
└── notes/
    ├── verification.md
    └── perf-evidence.md
```

### 源码落点

具体文件名仍需实施前按现有模块拆分确认。当前允许落点：

```text
packages/logix-core/src/internal/runtime/core/**
packages/logix-core/src/internal/observability/**
packages/logix-core/src/internal/workbench/**
packages/logix-core/src/internal/reflection/**
packages/logix-core/src/internal/repoBridge/**
packages/logix-react/src/internal/**
packages/logix-cli/src/**
packages/logix-playground/src/internal/**
packages/logix-devtools-react/src/internal/**
packages/logix-sandbox/src/**
examples/logix/src/verification/**
examples/logix-react/src/playground/**
examples/logix-react/test/browser/**
```

禁止落点：

```text
packages/logix-core/src/Runtime.devtools.ts
packages/logix-core/src/Reflection.ts
packages/logix-core/src/Runtime.inspect.ts
flat root live commands such as logix status/capture/snapshot/wait/export
unbounded or CLI-owned logix live command truth
DevTools-owned report/evidence/session protocol
```

## 必需证据集

- W171-001: repo-internal attach -> list target -> bind manifest -> admit/deny operation -> capture window -> export canonical evidence -> Workbench projection -> compare handoff dogfood proof.
- W171-002: disabled-path overhead proof with no transaction-window IO.
- W171-003: stale manifest / digest mismatch / unavailable action contract / unauthorized target / missing validator for non-void dispatch all produce pre-mutation `operation.denied`.
- W171-004: observation-only missing data produces evidence gap or degradation marker.
- W171-005: selector/host/profile/snapshot facets carry `stageClass` and cannot mint check/startup verdicts.
- W171-006: DVTools and Playground consume the same evidence package/projection as the Agent route.
- W171-007: researchability header proof shows comparable header only, with no metric-family authority, decision-trace family, adoption verdict, loop authority, merge, publish, release or SSoT rewrite authority.
- W171-008: text sweep proves no public `Runtime.devtools`, `Runtime.inspect`, `Logix.Reflection`, flat root `logix status/capture/snapshot/wait/export`, `logix trigger`, live sidecar, second manifest, live-owned validator, `CommandResult` live envelope, CLI-owned live truth, or Workbench-owned fact.
- W171-009: run -> evidence -> repair proof shows live-derived canonical evidence can produce `VerificationControlPlaneReport.repairHints` through `trial` or `compare`, while `LiveCommandResult` itself only emits repair clues and artifact refs.
- W171-010: terminal topology alignment shows daemon/WebSocket/CLI socket is only transport projection and multi-tab identity remains attachment-first.
- W171-011: real carrier proof shows `logix live start -> browser tab connects -> logix live targets --tree` returns daemon-backed browser attachments through both Vite dev plugin injection and `@logixjs/react/dev/live` dev-only import.
- W171-012: multi-tab proof shows two browser tabs connecting to the same route produce two attachment rows with distinct attachment/transport locators.
- W171-013: daemon-backed capture/snapshot/export evidence replaces in-process proof gaps for local browser dev hosts.
- W171-014: browser disconnect/reload/daemon stop produces terminal/degraded attachment states and later requests return denied/gap/degraded only.
- W171-015: daemon-backed `LiveCommandResult` still excludes repair hints, scheduling hints and verification verdicts.
- W171-016: real carrier disabled/no-daemon path keeps runtime hot path structural no-op and records perf proof.
- W171-017: concurrent isolation proof shows ambiguous targets do not route, explicit attachment routing does not cross tab data, forged responses are ignored, and daemon lineage refs disambiguate evidence export.

## 阶段计划

### 阶段 0：实施前收敛

目标：同步 Batch 5/6/7 的已采纳裁决，并确认 `discussion.md` 中 Must Close 项归零。

产物：

- Batch 5 ledger 与回写。
- Batch 6 ledger 与回写。
- Batch 7 ledger 与回写。
- `implementation-details/security-budget.md`
- `implementation-details/attachment-substrate.md`
- `implementation-details/evidence-facets.md`

退出条件：

- `discussion.md` 的 Must Close Before Implementation 全部已关闭。
- `tasks.md` 阶段 0 的 planning closure 任务全部完成。

### 阶段 11：真实 Local Carrier 补实现

目标：把当前 in-process proof transport 替换为真实 local daemon / browser WebSocket / CLI IPC carrier，同时保持 171 attachment-first owner law。

工作：

- Core live DTO 增加 host coordinate 与 transport projection locator。
- CLI 增加 local daemon server、IPC client、state dir / socket / metadata path、daemon process entry。
- React dev host 增加 browser live adapter，并复用现有 dev lifecycle carrier 获取 runtime binding snapshot。
- React dev host 必须同时提供 Vite dev plugin injection 与 `@logixjs/react/dev/live` dev-only import；两者安装同一个 browser adapter，不形成第二套 protocol。
- examples/logix-react 增加双 tab Playwright proof 与一行 dev-only import 轻页面 proof，覆盖 attach、targets、disconnect、evidence export 和 browser -> daemon -> CLI/IPC 最小链路。
- 重新记录 W171-011 到 W171-016。

证明：

- daemon-backed targets 中包含 attachmentId、hostCoordinate、runtimeCoordinate 和 transport locator。
- Vite plugin entry 与 dev-only import entry 均能产生同一 `host.offer` wire contract。
- 两个 browser tabs 指向同一 runtime 时不被合并。
- no daemon / bridge disabled 仍为结构化 gap 或 stopped status，不触发 runtime hot path IO。
- repair closure 继续由 `trial / compare` 产生，`LiveCommandResult` 只携带 live clues。

### 阶段 12：Concurrent attachment isolation hardening

工作：

- daemon operation routing 改为 attachment-first：显式 `attachmentId` 优先，target-only 必须唯一，否则返回 `ambiguous-live-target`。
- pending operation 记录 `requestId + attachmentId + WebSocket connection`，browser response 必须三者同时匹配。
- CLI live operation 增加 `--attachment <attachmentId>`，用于多 tab / 多 process 显式选路。
- browser adapter 只能按完整 `runtimeId + moduleId + instanceId` 解析 binding，不按 runtimeId 猜测。
- artifact cache 以 daemon lineage ref 为主键；裸 `captureId` 只作为非歧义别名。

证明：

- 两个 tabs 提交相同 target 时，target-only operation 不发送到任何 tab。
- 两个显式 attachment 并发 snapshot 各自返回对应 tab artifact。
- 错误 WebSocket 发送同一 `requestId` 响应不会 resolve selected request。
- 两个 attachments 返回相同裸 `captureId` 时，lineage ref 可精确 export，裸 ref 返回 ambiguity gap。

执行计划：

- [implementation-plan-concurrency-isolation.md](./implementation-plan-concurrency-isolation.md)

### 阶段 13：Launcher / Operator Snapshot Hardening

目标：把 daemon 启动策略、metadata validity、stale cleanup evidence 与 build surface hygiene 收回 repo-internal launcher/operator snapshot 边界。

工作：

- `liveDaemonLauncher` 是唯一 daemon process launch authority。
- 默认 daemon 启动路径是 current CLI re-exec + hidden `__internal_live_daemon` selector。
- `liveDaemonOperatorSnapshot` 负责 metadata validation、stale cleanup evidence 与 stopped/ready/degraded projection。
- `liveDaemonServer` 只写 carrier-local operator metadata，不写 targets、attachments、runtime、evidence 或 report truth。
- `liveClient` 不再拼 divergent status shape，不拥有 stale cleanup 策略。
- `tsup.config.ts` 只构建 `src/bin/logix.ts`，不保留第二 daemon bin source/build entry。

证明：

- invalid metadata 投影为 degraded operator snapshot。
- stale pid metadata 不被 launcher 复用，启动前会清理 stale metadata/socket。
- `live status` 报告 degraded/stopped/ready operator projection。
- public surface guard 证明只暴露 `logix` binary。
- 未新增 supervisor、`ensure/restart/logs/doctor` public lifecycle grammar 或 public pid/log/state file schema。

执行计划：

- [../../docs/superpowers/plans/2026-05-03-live-daemon-launcher-operator-snapshot.md](../../docs/superpowers/plans/2026-05-03-live-daemon-launcher-operator-snapshot.md)

### 阶段 1：Core Attachment Substrate

目标：在 core 内部建立 attachment authority，而不是 adapter-owned runtime identity。

工作：

- 定义 internal attachment service boundary。
- 定义 adapter attach offer 输入。
- 定义 lifecycle、capability gate、cleanup invariant。
- 禁用态返回 static-empty capability。
- 事务窗口内不做 IO。

证明：

- 多 adapter offer 不产生第二 runtime identity。
- disabled path 不分配 capture buffer。
- cleanup 后没有 dangling session/evidence producer。
- revoked、disconnected 或 target-unavailable attachment 只能进入 terminal state，后续请求不得恢复写入能力。

### 阶段 2：Canonical Live Evidence Facets

目标：把 live operation、capture、budget、redaction 和 gap facts 归一到 canonical evidence event/artifact facets。

工作：

- 实现 operation accepted/completed/failed/denied facet。
- 实现 capture event/artifact facet。
- 实现 binding header 引用 167 static facts。
- 实现 budget/dropped/degraded/redaction markers。

证明：

- live facts 不进入 reflection manifest。
- Workbench 只消费 canonical evidence 或 owner-approved artifact refs。
- denied/failed 分层正确。

### 阶段 3：Public `logix live` Transport 与 Dogfood Harness

目标：提供 Agent 可用的 public `logix live` handoff，同时避免 flat root commands 和第二 truth。

工作：

- 定义 `LiveCommandResult` live transport envelope。
- 实现 `logix live start/stop/status/targets/inspect/capture/snapshot/wait/dispatch/profile/export evidence` 路由。
- 实现 target coordinate and selection handoff。
- 实现 canonical evidence export handoff。
- 接入 examples dogfood path。

证明：

- `CommandResult` 仍只服务 `check / trial / compare`。
- `LiveCommandResult` 不拥有 report/session/verdict/evidence/runtime identity truth。
- flat root `status/capture/snapshot/wait/export` 不存在。
- live-derived evidence 进入 repair closure 时，repair hints 只能由 `VerificationControlPlaneReport` 产生；live output 只保留 denial/gap/degraded、target coordinate、binding header 和 artifact refs。

### 阶段 4：Adapter Offers

目标：让 browser、Node、Playground、cloud 共享 core attachment substrate。

工作：

- browser dev-only opt-in discovery/attach offer，不冻结 global hook 名称。
- Node local daemon registration 只作为 adapter projection。
- Playground wiring 只作为 dogfood host。
- cloud registration 只落安全约束，不做产品协议。

证明：

- 无 `globalThis` cloud authority。
- adapter 无权定义 runtime identity、operation authority、evidence envelope、Workbench projection 或 verification verdict。

### 阶段 5：Controlled Debug Operations

目标：按 Batch 6 allowlist 实现受控 debug operation。

候选能力：

- target discovery。
- event-window capture。
- read-only snapshot。
- wait condition。
- evidence export。
- declared action dispatch。
- local-only bounded runtime profile summary。

明确排除：

- arbitrary state patch。
- time travel mutation。
- hidden internal mutation。
- undeclared operation。
- dynamic code eval。
- host DOM mutation through bridge。
- transaction-window IO。
- unbounded raw trace stream。

证明：

- 每个 mutation-capable operation 走 admission taxonomy。
- unauthorized / unsafe / stale target / binding failure 全部 no mutation。
- P1 profile proof 只覆盖 local-only bounded summary。

### 阶段 6：DVTools 与 Playground Consumers

目标：DVTools 与 Playground 消费同一 evidence/projection，不定义产品 truth。

工作：

- DVTools live/imported mode 使用同一 projection law。
- Playground dogfood scenario 引用相同 runtime/session/evidence coordinates。
- unsupported panel-only fact 降为 viewer-local gap 或 discussion item。
- repo-internal debug drilldown feed 进入 Workbench truth 前必须归一成 canonical evidence facet、artifact ref、degradation notice 或 evidence gap。

证明：

- 同一 evidence package 在 Agent route、DVTools、Playground 得到等价 session/finding/artifact/gap ids。

### 阶段 7：验证、回写、清理

目标：关闭实现证据并更新事实源。

工作：

- 运行验证命令。
- 写 [notes/verification.md](./notes/verification.md)。
- 写 [notes/perf-evidence.md](./notes/perf-evidence.md)。
- 更新 SSoT 和相关 specs。
- 执行 forbidden text sweep。

## 验证策略

聚焦命令：

```bash
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-core test -- --run --cache --silent=passed-only --reporter=dot
rtk pnpm -C packages/logix-react typecheck
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-devtools-react typecheck
rtk pnpm -C examples/logix-react typecheck
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

adapter 与 Playground 路径存在后执行 browser/dogfood proof：

```bash
rtk pnpm -C examples/logix-react test:browser -- --run --silent=passed-only --reporter=dot
```

实施过程可用 `agent-browser` 辅助定位 browser/Playground failure：

```bash
rtk agent-browser open <local-url>
rtk agent-browser snapshot
rtk agent-browser console
rtk agent-browser errors
rtk agent-browser network requests
rtk agent-browser screenshot specs/171-agent-live-runtime-bridge/artifacts/browser-smoke.png
```

`agent-browser` 产物只能作为 failure inspection 或 exploratory QA artifact；最终 closure 仍需要 Playwright/Vitest/CLI/perf/text-sweep 这类可重复命令。

负向文本扫查：

```bash
rtk rg -n "Runtime\\.devtools|runtime\\.devtools|Runtime\\.inspect|runtime\\.inspect|Logix\\.Reflection|RuntimeAgentPort|LiveEvidenceSidecar|RuntimeOperationEvent|CommandResult.*live|globalThis\\.__LOGIX|\\blogix (status|capture|snapshot|trigger|wait|export)\\b" packages docs specs examples
```

剩余命中必须逐项分类为 forbidden-shape、history-only、discussion-only、deferred-only、negative-only 或 internal-only。

## 结果回写

权威页面：

- [../../docs/ssot/runtime/02-hot-path-direction.md](../../docs/ssot/runtime/02-hot-path-direction.md)
- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md)
- [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md)
- [../165-runtime-workbench-kernel/spec.md](../165-runtime-workbench-kernel/spec.md)
- [../167-runtime-reflection-manifest/spec.md](../167-runtime-reflection-manifest/spec.md)
- [../168-kernel-to-playground-verification-parity/spec.md](../168-kernel-to-playground-verification-parity/spec.md)

Spec 状态同步：

- 只有阶段 0 阻塞项全部关闭后，`spec.md` 才能移出 Draft。
- `tasks.md` checkbox 必须反映真实实施进度。

Discussion 清理：

- Closed Batch 5/6/7 decisions 已移动到 `spec.md`、`plan.md`、`tasks.md` 或 owner SSoT。
- Deferred AutoResearch、cloud、browser extension、product DevTools items 保留在 Deferred / Non-Blocking。
