# Implementation Plan: 092 E2E Latency Trace（端到端链路可解释）

**Branch**: `092-e2e-latency-trace` | **Date**: 2026-01-10 | **Spec**: `specs/092-e2e-latency-trace/spec.md`  
**Input**: Feature specification from `specs/092-e2e-latency-trace/spec.md`

## Summary

目标：把一次交互的端到端时间线（action → txn → notify → commit（可选 paint））做成 Devtools 可消费的结构化事实源：稳定标识贯穿、segment 可解释、采样可控、off 近零成本，并用 perf evidence 建立回归门禁。

## Deepening Notes

 - Decision: 最小 segment 集合固定（action pending、io wait、txn commit、notify scheduled/flush、react commit、action settle；paint 可选）（source: `specs/092-e2e-latency-trace/spec.md` Clarifications）
- Decision: segment 时间线基于单调时钟（performance.now 或等价）；不使用 epoch timestamp 计算 segment（source: `specs/092-e2e-latency-trace/spec.md` Clarifications）
- Decision: 采样默认关闭；开启支持 sampleRate + allowlist；关闭时近零成本（source: `specs/092-e2e-latency-trace/spec.md` Clarifications）
- Decision: StrictMode/并发下只记录 commit 事件，并按快照锚点变化去重（source: `specs/092-e2e-latency-trace/spec.md` Clarifications）
- Decision: commit 关联主 `linkId`，允许记录 `linkIds`（截断）与 `droppedLinkIdCount`（source: `specs/092-e2e-latency-trace/spec.md` Clarifications）
- Decision: trace 事件 schema 固化为 `trace:e2e` segment event（source: `specs/092-e2e-latency-trace/contracts/README.md`）

## Dependencies

- 依赖：`specs/088-async-action-coordinator/`（ActionRun 锚点）
- 依赖：`specs/089-optimistic-protocol/`、`specs/090-suspense-resource-query/`（关键链路事件挂载）
- 相关（只读）：`specs/073-logix-external-store-tick/`（tick/notify/无 tearing 语义）、`packages/logix-core/src/Runtime.ts`（devtools sampling 预留字段）

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: `@logixjs/core`、`@logixjs/react`、`@logixjs/devtools-react`、`effect` v3  
**Storage**: N/A（事件存储在有界 ring buffer；证据落盘到 `specs/092-e2e-latency-trace/perf/*`）  
**Testing**: Vitest + `@effect/vitest`；React 行为/Browser 用 Vitest browser  
**Target Platform**: Node.js + modern browsers（headless）  
**Project Type**: pnpm workspace  
**Performance Goals**: diagnostics off 近零成本；采样开启的开销可度量且在预算内；事件体积可控  
**Constraints**: Slim/JsonValue；稳定标识去随机化；ring buffer 有界；不破坏 React 无 tearing；forward-only  
**Scale/Scope**: 最小交付：action run timeline + notify/commit 关联；paint 采样为可选增强
**Defaults（需在实现中保持一致）**:
- `DevtoolsRuntimeOptions.bufferSize = 500`（默认值；ring buffer 容量）
- `e2eTraceSampling.enabled = false`（默认关闭）
- `e2eTraceSampling.sampleRate = 0.01`（开启时建议默认；可覆盖）
- `react:commit.linkIds.maxItems = 4`（Slim 截断；其余计入 `droppedLinkIdCount`）

## Constitution Check

_GATE: trace 本身必须可解释且可控成本；否则违宪。_

- 稳定标识：以 ActionRun 为锚点，关联 txn/op/notify/commit；不得依赖 random/time 默认。
- 事务边界：trace 采样不得诱导在事务窗口内做 IO/await。
- React 无 tearing：trace 的采集不得引入双真相源；采样点必须锚定到同一快照版本。
- Slim/序列化：事件 payload 必须 JsonValue；不可序列化内容必须 downgrade 并标注原因。
- ring buffer 有界：必须可配置容量；默认值与采样率写入 plan。
- perf evidence：必须同时覆盖 diagnostics off/on（采样关闭/开启）的对照证据。

### Gate Result (Pre-Implementation)

- PASS（spec/plan 固化门槛；实现必须补齐 perf evidence 与 devtools 视图）

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

- Baseline 语义：代码前后（before/after）+ A/B（同一代码下 sampling off/on）
- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（before/after 的 `matrixId/matrixHash` 必须一致）
- PASS 判据（对应 `spec.md#SC-002`）：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`
- envId：darwin-arm64.node20.chrome-headless（以实际采集机为准；before/after 必须一致）
- profile：default（交付）
- collect（before）：`pnpm perf collect -- --profile default --out specs/092-e2e-latency-trace/perf/before.<sha>.<envId>.default.json`
- collect（after）：`pnpm perf collect -- --profile default --out specs/092-e2e-latency-trace/perf/after.<sha|worktree>.<envId>.default.json`
- diff：`pnpm perf diff -- --before specs/092-e2e-latency-trace/perf/before.<sha>.<envId>.default.json --after specs/092-e2e-latency-trace/perf/after.<sha|worktree>.<envId>.default.json --out specs/092-e2e-latency-trace/perf/diff.before.<sha>__after.<sha|worktree>.<envId>.default.json`
- Suites：至少覆盖 1 条 Browser（react commit 相关）+ 1 条 Node（diagnostics off/on 开销对照）；并覆盖“notify 延后/合并”路径
- Failure Policy：`comparable=false` 禁止下硬结论；复测必须同 envId/profile/matrixHash

## Project Structure

### Documentation (this feature)

```text
specs/092-e2e-latency-trace/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── README.md
│   └── schemas/
│       ├── e2e-trace-segment-event.schema.json
│       └── e2e-trace-segment-meta.schema.json
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/
└── internal/runtime/core/
   ├── TraceE2E.ts (new: `trace:e2e` sampling/projection/trim)
   ├── DebugSink.record.ts (thin wiring: delegate `trace:e2e` to TraceE2E)
   ├── DevtoolsHub.ts (extend: ring buffer + snapshot schema)
   └── ... (trace sampling control plane)

packages/logix-core/src/Runtime.ts
└── DevtoolsRuntimeOptions.sampling（复用/扩展：reactRenderSampleRate 等）

packages/logix-react/src/
└── internal/
   ├── store/RuntimeExternalStore.ts (extend: notify timing hooks)
   └── (可选) React instrumentation glue（commit/paint 采样；必须可关）

packages/logix-devtools-react/src/
└── internal/ui/
   └── E2ETraceView.tsx (new; 按 action run drill-down)

examples/logix/src/scenarios/
└── e2e-trace/ (new demo：注入不同瓶颈段)
```

**Structure Decision**:

- 以 088 ActionRun 为锚点聚合；不要新造并行 traceId。
- 采样控制面优先挂在 Runtime.devtools options（已预留 sampling 字段），并确保 off 近零成本。

## Complexity Tracking

### Decomposition Brief（宪章门槛）

> 本特性需要改动/接入 `DebugSink.record.ts`（≥1000 LOC）。按宪章要求，进入实现前必须先固化拆解方案，并将“结构拆分”与“语义改动”解耦为独立步骤。

**Targets（现状）**:

- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（~1759 LOC，已超阈值）

**Chosen Shape（最小无损分解）**:

- 新增互斥子模块：`packages/logix-core/src/internal/runtime/core/TraceE2E.ts`（仅承载 `trace:e2e` 的采样/投影/裁剪/理由码枚举）。
- `DebugSink.record.ts` 只允许做“薄接线”：
  - import `TraceE2E`
  - 增加一个 `event.type === 'trace:e2e'` 的分支并委派
  - 禁止把更多 trace 逻辑继续塞进该文件（避免继续膨胀）。

**Mutually Exclusive Submodules**:

- `TraceE2E`：只负责 `trace:e2e`（不碰 `trace:tick/trace:txn-lane/trace:react-*` 等既有分支）。

**Steps（必须按顺序）**:

1. **结构步骤（无损）**：新增 `TraceE2E.ts`（纯函数 + 类型/常量），不改变任何运行行为。
2. **语义步骤（增量）**：在 `DebugSink.record.ts` 增加 `trace:e2e` 分支，确保 light tier 也保留 Slim meta（不走 generic `{ data: undefined }`）。
3. **验证步骤**：补齐测试与 perf 证据门禁（off/on + JsonValue 可序列化硬门槛）。

**Verification**:

- 任何“结构步骤”必须可通过类型检查与最小单测证明无行为漂移。
- 任何“语义步骤”必须通过 off/on 对照用例与 schema/序列化断言。
