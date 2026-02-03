# Implementation Plan: 084 Loader Spy 依赖采集（加载态自描述证据：不作权威）

**Branch**: `084-loader-spy-dep-capture` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/084-loader-spy-dep-capture/spec.md`

## Summary

交付一个 **report-only** 的“加载态依赖证据采集（Loader Spy）”能力：

- 在受控加载/构造窗口中捕获 `$.use(Tag)` 的实际调用证据（best-effort），输出 `SpyEvidenceReport@v1`；
- 支持把证据与“显式声明（services/servicePorts/manifest）”做对照，产出结构化偏离信息；
- 明确定位：证据只用于建议/解释/校验输入，**不成为长期权威事实源**；任何写回都必须走 `079/082` 的保守闭环（宁可漏不乱补）。

## Questions Digest（plan-from-questions）

来源：外部问题清单（Q026–Q029）。

- **Q026（零 IO 的硬保证）**：契约层依然要求“事务窗口禁 IO”，但 JS/Node 侧无法对任意代码硬性证明“绝对无 IO”；MVP 以 **best-effort 的隔离/缺服务/预算与超时收束 + violations 结构化输出 + coverage 限制声明** 为准。
- **Q027（Coverage Marker）**：仅提供 best-effort 覆盖标记（limitation 列表），不做行级覆盖率/真实覆盖统计。
- **Q028（Browser 环境）**：MVP 的采集 Harness 为 Node-only（平台/CI/CLI）；浏览器侧只消费报告，不在浏览器端执行采集。
- **Q029（occurrences 语义）**：`usedServices[]` 去重但保留计数：以 `(serviceId, moduleId?, logicKey?)` 聚合累加 `occurrences`，不记录逐次调用明细以避免证据膨胀。

## Deepening Notes（关键裁决）

- Decision: 采集 Harness 为 Node-only；浏览器侧只消费报告，不执行采集（source: spec Clarifications AUTO + Q028）。
- Decision: “事务窗口禁 IO”是契约要求，但无法对任意 JS 代码硬性证明；MVP 以 best-effort 隔离/缺服务/预算与超时收束为主，并必须输出 `coverage.limitations` + violations（source: spec Clarifications AUTO + Q026）。
- Decision: 默认零成本：不注入 SpyCollector 时不得记录、不得改变错误语义（热路径保护；source: 084 Summary/Constraints）。
- Decision: `usedServices[]` 去重但保留 `occurrences` 聚合计数（source: spec Clarifications AUTO + Q029）。

## Technical Context

**Language/Version**: TypeScript（ESM；以仓库配置为准）  
**Primary Dependencies**: `effect` v3、`@logixjs/core`（`BoundApiRuntime.$.use`、`Observability.trialRun*`、`BuildEnv/ConstructionGuard`）  
**Storage**: JSON 输出（stdout/落盘；由 `085` CLI 暴露）  
**Testing**: Vitest（用例聚焦：确定性、预算/超时、覆盖标记、对照 diff、report-only）  
**Target Platform**: Node.js 20+（平台侧/CI/CLI），浏览器侧只消费报告  
**Constraints**: 单一真相源；证据不作权威；Slim/可序列化/可 diff；受控执行（预算/超时）；禁 IO 以 best-effort 隔离/检测为主（必须在报告中声明局限）

## Constitution Check

- **单一真相源**：Loader Spy 输出只作为 evidence；不得在任何路径上把它当成写回依据或 sidecar SSoT。
- **统一最小 IR**：输出 `SpyEvidenceReport@v1`（Slim JSON），并可被 Devtools/CI/CLI 消费；不引入第二套不可序列化对象图。
- **Deterministic identity**：报告不包含时间戳/随机；`runId` 必须显式传入；集合稳定排序。
- **Transaction boundary / 禁 IO**：采集运行在受控窗口；默认不提供业务 Service；对外 IO 为契约禁止项，但无法对任意 JS 代码做“绝对无 IO”的硬性证明；MVP 以缺服务/BuildEnv/ConstructionGuard 的 best-effort 治理 + violations 输出 + coverage 限制声明为准；长驻/阻塞必须超时收束。
- **Diagnosability**：所有失败/跳过/降级都用 reason codes 输出；必须包含覆盖局限标记（Coverage Marker）。

## Perf Evidence Plan

本特性会在 `BoundApiRuntime.$.use` 处插桩，属于 runtime 核心路径；必须出具可对比的 perf 证据，证明：

- 默认档（未注入 SpyCollector）零成本或接近零成本（不引入可观测回归）；
- 启用 SpyCollector 时的额外开销可解释且在预算内（dev/诊断场景可接受）。

证据闭环（MUST）：

1. 新增一个最小 perf suite（聚焦 `$.use` 热路径与 disabled/enabled 两种模式），并纳入 perf collect 子集执行。
2. 固化矩阵口径（同 `matrixId/matrixHash`）：`specs/084-loader-spy-dep-capture/perf/matrix.spy-use.node.v1.json`
3. disabled（默认未注入）回归证据：采集 before/after（同 profile/同参数/同 envId）并落盘到 `specs/084-loader-spy-dep-capture/perf/`：
   - before（改动前代码）：`LOGIX_SPY_COLLECTOR=off pnpm perf collect -- --profile default --matrix specs/084-loader-spy-dep-capture/perf/matrix.spy-use.node.v1.json --out specs/084-loader-spy-dep-capture/perf/before.node.spyUse.off.<baselineSha>.<envId>.default.json --files packages/logix-core/test/perf/BoundApiRuntime.use.spy.perf.test.ts`
   - after（改动后代码）：`LOGIX_SPY_COLLECTOR=off pnpm perf collect -- --profile default --matrix specs/084-loader-spy-dep-capture/perf/matrix.spy-use.node.v1.json --out specs/084-loader-spy-dep-capture/perf/after.node.spyUse.off.<sha|worktree>.<envId>.default.json --files packages/logix-core/test/perf/BoundApiRuntime.use.spy.perf.test.ts`
   - diff（disabled 回归门）：`pnpm perf diff -- --matrix specs/084-loader-spy-dep-capture/perf/matrix.spy-use.node.v1.json --before <before.off.json> --after <after.off.json> --out specs/084-loader-spy-dep-capture/perf/diff.disabled.<before>__<after>.json`
4. enabled（注入 SpyCollector）开销证据：在同一份代码下对比 off/on（策略 A/B）：
   - on：`LOGIX_SPY_COLLECTOR=on pnpm perf collect -- --profile default --matrix specs/084-loader-spy-dep-capture/perf/matrix.spy-use.node.v1.json --out specs/084-loader-spy-dep-capture/perf/after.node.spyUse.on.<sha|worktree>.<envId>.default.json --files packages/logix-core/test/perf/BoundApiRuntime.use.spy.perf.test.ts`
   - diff（enabled 开销曲线）：`pnpm perf diff -- --matrix specs/084-loader-spy-dep-capture/perf/matrix.spy-use.node.v1.json --before <after.off.json> --after <after.on.json> --out specs/084-loader-spy-dep-capture/perf/diff.enabled.<afterOff>__<afterOn>.json`
5. 结论以 diff 的 `meta.comparability` 为准；`comparable=false` 时不得下硬结论。

资源上界（MUST）：采集 Harness 必须支持 timeout/最大记录数/最大字节数；超限时可解释截断或失败。

## Project Structure

### Documentation (this feature)

```text
specs/084-loader-spy-dep-capture/
├── spec.md
├── plan.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── schemas/
│       └── spy-evidence-report.schema.json
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts   # $.use 插桩：记录 use 证据（按需）
packages/logix-core/src/internal/observability/                   # 组装/导出 SpyEvidenceReport（按需）
packages/logix-core/src/Observability.ts                          # 对外导出入口（可选）
packages/logix-cli/                                               # 085：通过子命令暴露（可选）
```

**Structure Decision**:

- 插桩点尽量靠近 `$.use`（单点收敛）；默认无成本（仅在注入 SpyCollector 时启用）。
- 报告导出放在 `observability`：保持“证据/解释链路”的语义边界清晰。

## Design

### 1) SpyCollector（可注入、默认缺席）

引入一个仅用于采集的 Service（Tag + Layer）：

- 运行时默认不提供该服务（零成本）
- 在 Loader Spy 模式下注入该服务，用于记录：
  - `moduleId`（若可得）
  - `logicKey/logicUnit`（若可得）
  - `serviceId`（若可解析出稳定 id）
  - `occurrences` 计数

### 2) 插桩：在 `$.use(Tag)` 调用处记录证据

在 `BoundApiRuntime` 的 `$.use` 实现处：

- 在真正解析服务/模块前先“尝试记录”（best-effort）；
- 记录逻辑必须 **不影响业务语义**（记录失败不得改变原错误语义，只能作为额外 evidence）。

### 3) 受控执行窗口（Loader Spy Harness）

提供一个“只为采集服务使用证据”的运行入口（可由 085 CLI 暴露）：

- 输入：program/module 入口、显式 `runId`、预算/超时参数、（可选）声明快照（Manifest/servicePorts）。
- 环境：优先复用 `BuildEnv.run(...)` + `ConstructionGuard.guardBuildTime`，默认不提供业务 Service，任何缺服务以结构化错误呈现（MVP 仅 Node-only 采集；浏览器只消费报告）。
- 收束：超时必须终止并输出 `truncated`/`violations`（不允许常驻阻塞）。

### 4) 报告组装：SpyEvidenceReport@v1（Slim、可 diff）

- `usedServices[]`：稳定可解析的 `serviceId` 清单（稳定排序、去重；保留 `occurrences` 聚合计数）
- `rawMode[]`：无法解析/歧义/子集外形态的显式降级项（reason codes）
- `diff?`：与声明快照对照（used-but-not-declared / declared-but-not-used）
- `coverage`：覆盖局限标记（best-effort；不穷尽分支；不提供行级覆盖率）
- `violations[]`：超时/超预算/缺服务/违规行为的结构化记录

## Deliverables by Phase

- **Phase 0（design）**：固化 `SpyEvidenceReport@v1` schema 与 data-model。
- **Phase 1（integration）**：完成 `$.use` 插桩 + Harness 输出（report-only）+ 最小回归用例。
- **Phase 2（tooling）**：在 `085` CLI 增加可选子命令/选项暴露（不强制纳入 MVP）。

## Complexity Tracking

| Risk / Hard Part                 | Why It’s Hard                                     | Mitigation |
| -------------------------------- | ------------------------------------------------- | ---------- |
| 受控收束（超时/常驻逻辑）       | 逻辑可能 fork 长驻 fiber 或等待外部条件            | 强制超时；只采集窗口内证据；输出 coverage/violations |
| IO/副作用治理                    | 业务可能绕开 Tag 服务直接触发 IO                   | 默认不提供业务 Service；依赖 ConstructionGuard 捕获缺服务；对绕开路径标注“不可保证” |
| 证据与权威的边界                 | 容易被误用为写回依据（并行真相源风险）             | 报告中强制 coverage marker；计划层明确“不得写回”；写回只走 079/082 |
