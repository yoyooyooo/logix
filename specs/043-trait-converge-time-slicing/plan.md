# Implementation Plan: 043 Trait 收敛 Dirty Checks 的 Time-slicing（显式 Opt-in）

**Branch**: `043-trait-converge-time-slicing` | **Date**: 2025-12-29 | **Spec**: `specs/043-trait-converge-time-slicing/spec.md`  
**Input**: Feature specification from `specs/043-trait-converge-time-slicing/spec.md`

## Summary

在不改变默认行为（每个操作窗口内完成收敛、对外 0/1 commit、事务窗口禁止 IO/async）的前提下，为 StateTrait 的 converge/dirty-check 引入显式 opt-in 的 time-slicing：

- traits 显式分为 `immediate`（每 txn 仍收敛）与 `deferred`（可延迟到后续窗口合并执行）；
- 运行时提供模块/实例维度开关与 overrides（用于止血/灰度/回退）；
- 诊断开启时输出可解释证据：本窗口跳过摘要、下一次补算摘要、饥饿保护/降级摘要；
- 为 “大 N + 高频输入” 场景提供可复现的 Browser 基线与回归防线。

## Technical Context

**Language/Version**: TypeScript 5.8.x（ESM）  
**Primary Dependencies**: `effect` v3、`@logixjs/core`、`@logixjs/react`（browser perf boundary）  
**Storage**: N/A（纯内存态；无持久化引入）  
**Testing**: Vitest（workspace）、`@effect/vitest`（Effect-heavy 单测）、Vitest browser（perf-boundaries）  
**Target Platform**: Node.js 20+ + modern browsers（headless）  
**Project Type**: pnpm workspace（packages/* + apps/* + examples/*）  
**Performance Goals**: 在 1000+ traits、90% deferred 的高频输入场景下，操作窗口内 converge/dirty-check 的 p95 显著下降（目标 ≥2×）；默认关闭时无回归  
**Constraints**: 统一最小 IR（Static IR + Dynamic Trace）、稳定标识（instanceId/txnSeq/opSeq）、事务窗口禁 IO/async、`diagnostics=off` 近零成本、错误不吞（cycle/multiple writers 等必须仍硬失败）  
**Scale/Scope**: 单模块单实例；重点覆盖「连续输入」与「空闲后补算」两类时序

## Constitution Check

_GATE: Must pass before implementation. Re-check after code + docs._

- **Intent → Flow/Logix → Code → Runtime**：本特性属于 Runtime 执行面（StateTransaction → TraitConverge）调度策略扩展；不改业务侧 Intent/Flow 表达，仅提供可选策略与证据链路。
- **Docs-first & SSoT**：契约与诊断字段以 `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md` 与 `specs/013-auto-converge-planner/contracts/schemas/*` 为锚；新增字段与口径必须同步更新。
- **Contracts**：新增/扩展 Runtime 的 stateTransaction 旋钮（time-slicing 相关）；对外 API 为新增字段/新 DSL 参数（加法），默认行为不变。
- **IR & anchors**：不改变统一最小 IR，仅在 Dynamic Trace（`trace:trait:converge`）增加可序列化摘要字段；稳定锚点继续使用 `moduleId/instanceId/txnSeq/opSeq`。
- **Deterministic identity**：不引入随机/时间 id；延迟窗口的事务仍使用既有 `txnSeq/txnId` 规则；必要时使用 RunSession 的本地序号（opSeq）作为补算事件锚点。
- **Transaction boundary**：事务窗口内仍只做同步计算与写回；延迟执行通过 txnQueue 在后续独立事务窗口运行（可含 sleep/debounce，但必须在事务外）。
- **Internal contracts & trial runs**：不新增 magic fields；time-slicing 的状态（pending/backlog/scheduled）封装在 ModuleRuntime 内部 state（Ref/Deferred）中，可按实例隔离。
- **Dual kernels（core + core-ng）**：该特性位于 StateTrait/ModuleRuntime 内，预期 core/core-ng 都支持；不引入 consumer 对 `@logixjs/core-ng` 直依赖。
- **Performance budget**：触及核心路径（每 txn 的 converge/dirty-check 决策）；必须提供 Browser 基线与回归用例。
- **Diagnosability & explainability**：新增 time-slicing 摘要字段；`diagnostics=off` 下不做额外字符串/数组构造。
- **User-facing mental model**：对外文档补充关键词与优化梯子（immediate/deferred、maxLag、forceFlush、overrides）。
- **Breaking changes**：默认关闭，不改变现有语义；若新增 public API，则提供迁移/启用说明（不做兼容层）。
- **Public submodules**：改动集中在 `packages/logix-core/src/internal/**` 与 `packages/logix-core/src/Runtime.ts`（公共类型扩展）；不暴露 internal。
- **Quality gates**：`pnpm typecheck:test` + `pnpm test:turbo`；新增/修改 browser perf-boundary 用例需跑对应 project。

**Gate Result**: PASS（默认行为不变；变更为 opt-in；事务边界与稳定锚点保持）

## Perf Evidence Plan（MUST）

Baseline 语义：**策略 A/B**（time-slicing 关闭 vs 开启）  

- envId：`macos-arm64.chrome-headless`（以实际采集时为准）  
- profile：`default`  
- collect（before）：`pnpm perf collect -- --profile default --out specs/043-trait-converge-time-slicing/perf/before.<worktree>.<envId>.default.json --files packages/logix-react/test/browser/perf-boundaries/*time-slicing*`  
- collect（after）：`pnpm perf collect -- --profile default --out specs/043-trait-converge-time-slicing/perf/after.<worktree>.<envId>.default.json --files packages/logix-react/test/browser/perf-boundaries/*time-slicing*`  
- diff：`pnpm perf diff -- --before specs/043-trait-converge-time-slicing/perf/before...json --after specs/043-trait-converge-time-slicing/perf/after...json --out specs/043-trait-converge-time-slicing/perf/diff.before...__after...json`  
- 指标：单次 txn 的 `runtime.txnCommitMs`（off 档位基线）+ time-slicing enabled 的 p95/ratio（必须 ≥2× 才算达标）  
- Failure Policy：出现 `comparable=false` / `stabilityWarning` → 复测或缩小子集后再下结论

## Project Structure

### Documentation (this feature)

```text
specs/043-trait-converge-time-slicing/
├── spec.md
├── plan.md
├── tasks.md
└── perf/                  # perf collect/diff 输出（本特性落点）
```

### Source Code (repository root)

```text
packages/logix-core/src/
├── Runtime.ts
└── internal/
    ├── runtime/core/
    │   ├── env.ts
    │   ├── configValidation.ts
    │   ├── ModuleRuntime.ts
    │   ├── ModuleRuntime.traitConvergeConfig.ts
    │   └── ModuleRuntime.transaction.ts
    └── state-trait/
        ├── model.ts
        ├── converge-ir.ts
        ├── converge-exec-ir.ts
        └── converge.ts

packages/logix-react/test/browser/perf-boundaries/
└── *time-slicing*.test.tsx / *.ts

apps/docs/content/docs/guide/advanced/
└── converge-control-plane.md

specs/013-auto-converge-planner/contracts/schemas/
└── trait-converge-data.*.schema.json
```

**Structure Decision**:

- 语义扩展（immediate/deferred + scheduler）在 `packages/logix-core/src/internal/state-trait/*` 与 ModuleRuntime transaction 层闭合；
- 配置入口统一收敛到既有 StateTransaction 控制面（runtime_default / runtime_module / provider），避免新增并行旋钮；
- 可解释证据继续复用 `trace:trait:converge` 事件（在 data 字段内追加 time-slicing 摘要），保持 Devtools/Sandbox 消费面稳定。

## Complexity Tracking

无（本特性为 opt-in 策略扩展；不引入宪章违例）
