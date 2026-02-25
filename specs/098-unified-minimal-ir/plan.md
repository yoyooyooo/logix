# Implementation Plan: O-005 单一最小 IR 收敛（Static IR + Dynamic Trace）

**Branch**: `[098-unified-minimal-ir]` | **Date**: 2026-02-25 | **Spec**: `specs/098-unified-minimal-ir/spec.md`  
**Input**: Feature specification from `specs/098-unified-minimal-ir/spec.md`

## Summary

本特性的规划目标是将 Runtime 的多源 IR 收敛为单一最小 IR 事实链（Static IR + Dynamic Trace），并把 full cutover 从“可选门禁”升级为默认策略，消除 trial/fallback 常态化。验收口径是 Devtools / Evidence / Replay / Platform 对同一运行输出得到一致解释，同时满足 forward-only 策略：允许 breaking，但必须给出迁移说明，且不保留兼容层。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-1, NS-3, NS-5, NS-10
- **Kill Features (KF)**: 本特性不新增 KF，按 NS 约束落地

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: effect v3、`@logixjs/core`、`@logixjs/react`、`@logixjs/sandbox`、Vitest  
**Storage**: N/A（以规格文档与可序列化证据工件为主）  
**Testing**: `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`，必要时 `pnpm --filter @logixjs/core typecheck:test` + `vitest run`  
**Target Platform**: Node.js 20+ + 现代浏览器（含 Devtools/Sandbox 消费场景）  
**Project Type**: pnpm workspace monorepo  
**Performance Goals**:
- 默认策略下核心热路径（事务提交/收敛/导出）相对基线回归不超过 5%（p95）
- 默认策略下分配回归不超过 8%（以可复现 bench/profile 为准）
- diagnostics=off 额外开销目标不超过 2%
- 默认 full cutover 路径的隐式 fallback 次数必须为 0
  
**Constraints**:
- 必须遵守统一最小 IR：Static IR 与 Dynamic Trace 分层但同一事实链
- 稳定标识去随机化：`instanceId/txnSeq/opSeq` 可复现
- 事务窗口禁止 IO/await；业务不可写 SubscriptionRef
- 诊断事件必须 Slim 且可 JSON 序列化
- breaking 允许但必须提供迁移说明；无兼容层、无弃用期
  
**Scale/Scope**:
- 规划覆盖 Runtime IR/锚点/事件协议与四类消费者一致性验收
- 预期改动集中在 `packages/logix-core`（runtime/reflection/debug/replay）与对应 SSoT 文档

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Pre-Research Gate（本轮规划结论）

- `PASS` 北极星对齐：spec 已标注 NS-1/3/5/10，并在用户故事与 FR/SC 中回链。
- `PASS` Intent→Flow/Logix→Code→Runtime 映射：本特性属于 Runtime 执行与证据协议收敛，核心目标是同一 IR 事实链。
- `PASS` docs-first：实现前先以 SSoT 口径约束（平台原则、RunResult/Trace/Tape、Runtime 调试协议）。
- `PASS` Effect/Logix 契约：不会引入第二套执行语义，聚焦统一导出与消费契约。
- `PASS` 统一最小 IR（强制项）：Static IR 与 Dynamic Trace 必须同源、可对账、可回链；禁止并行真相源。
- `PASS` 稳定标识（强制项）：`instanceId/txnSeq/opSeq` 去随机化，禁止默认随机数或墙钟主锚点。
- `PASS` 事务边界（强制项）：事务窗口禁止 IO/await；写逃逸必须阻断并诊断。
- `PASS` React 一致性：不引入双真相源；如触及外部订阅，维持单快照锚点（`tickSeq`）。
- `PASS` External source 语义：保持 signal-dirty + pull-based，不引入 payload queue 风暴。
- `PASS` 内部契约与 trial run：内部协作协议需显式 Runtime Service 化，且可导出 slim serializable evidence。
- `PASS` Dual-kernel 约束：对 consumer 保持内核透明，验证矩阵中同时覆盖 core 与 core-ng 的契约一致性。
- `PASS` 性能预算（强制项）：已定义核心预算与 before/after 证据采集方案。
- `PASS` 诊断成本（强制项）：明确 diagnostics off/light/full 的成本口径与裁剪统计要求。
- `PASS` 用户性能心智模型：若边界变化，需同步“关键词 + 成本模型 + 优化梯子”。
- `PASS` breaking + 迁移说明（强制项）：采用 forward-only；迁移文档替代兼容层。
- `PASS` Public submodules：若触及对外模块，保持 `src/*.ts` 子模块铁律与 internal 单向拓扑。
- `PASS` 大文件拆解门槛：若触及 ≥1000 LOC 文件，先做无损拆解简报再做语义改动。
- `PASS` 质量门：交付前至少通过 typecheck/lint/test（非 watch）。

### Post-Design Re-check（Phase 1 后复核项）

- 核验四类消费者一致性指标是否可自动对账（锚点覆盖/顺序/降级原因）。
- 核验 full cutover 默认化后的失败语义是否都以 reason codes 暴露。
- 核验迁移说明是否可直接驱动旧消费者升级且不依赖兼容层。

### Kernel Support Matrix（计划口径）

| 维度 | core | core-ng | 门禁口径 |
| --- | --- | --- | --- |
| 统一最小 IR 导出 | 必须一致 | 必须一致 | IR schema + anchors 对账 |
| full cutover 默认策略 | 必须满足 | 必须满足 | 隐式 fallback=0 |
| 诊断 Slim/可序列化 | 必须满足 | 必须满足 | RuntimeDebugEventRef 约束 |
| 稳定标识 | 必须满足 | 必须满足 | `instanceId/txnSeq/opSeq` 可复现 |

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后（before=收敛前；after=收敛后默认 full cutover）
- envId：`macos-arm64.node20.chrome-headless`
- profile：`default`（交付）+ 必要时 `soak`（复测稳定性）
- collect（before）：
  - `pnpm perf collect -- --profile default --out specs/098-unified-minimal-ir/perf/before.<sha>.macos-arm64.node20.chrome-headless.default.json`
- collect（after）：
  - `pnpm perf collect -- --profile default --out specs/098-unified-minimal-ir/perf/after.<sha>.macos-arm64.node20.chrome-headless.default.json`
- diff：
  - `pnpm perf diff -- --before specs/098-unified-minimal-ir/perf/before.<sha>....json --after specs/098-unified-minimal-ir/perf/after.<sha>....json --out specs/098-unified-minimal-ir/perf/diff.before__after.json`
- Failure Policy：
  - 出现 `stabilityWarning/timeout/missing suite` 必须复测（必要时升级到 `soak`）
  - `comparable=false` 时禁止下性能结论
  - 关键预算超阈值（p95/alloc/off-overhead）视为 gate fail

## Project Structure

### Documentation (this feature)

```text
specs/098-unified-minimal-ir/
├── spec.md
├── plan.md
├── tasks.md
├── checklists/
│   └── requirements.md
├── research.md              # Phase 0 规划输出（待补）
├── data-model.md            # Phase 1 设计输出（待补）
├── quickstart.md            # Phase 1 验收脚本（待补）
└── contracts/               # Phase 1 协议草案（待补）
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/
├── reflection/
│   ├── staticIr.ts
│   └── controlSurface.ts
├── state-trait/
│   └── converge-ir.ts
├── workflow/
│   └── model.ts
└── runtime/core/
    ├── RuntimeKernel.ts
    ├── FullCutoverGate.ts
    ├── DevtoolsHub.ts
    └── DebugSink.ts

packages/logix-core/src/
└── Debug.ts

packages/logix-core/test/
├── internal/...
└── Process/...

# docs-first 同步落点（按需）
docs/ssot/platform/contracts/
├── 01-runresult-trace-tape.md
└── 03-control-surface-manifest.md

docs/ssot/runtime/logix-core/observability/
└── 09-debugging.*.md
```

**Structure Decision**: 本特性采用“先规格与协议、后实现”的路径；本轮仅在 `specs/098-unified-minimal-ir/` 产出规划文档，不落实现代码。

## Complexity Tracking

本轮为纯规划阶段，无需为复杂度违规申请豁免。若后续实现触及 ≥1000 LOC 文件，将在对应实现计划中补“无损拆解简报”并单独验收。
