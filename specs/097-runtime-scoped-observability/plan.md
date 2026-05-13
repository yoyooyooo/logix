# Implementation Plan: Runtime-Scoped Observability for Diagnostics Hot Path

**Branch**: `[097-runtime-scoped-observability]` | **Date**: 2026-02-25 | **Spec**: `specs/097-runtime-scoped-observability/spec.md`
**Input**: Feature specification from `specs/097-runtime-scoped-observability/spec.md`

## Summary

O-004 将观测链路从进程级全局单例迁移为 runtime-scoped 模型：每个 runtime 独立事件总线与 ring/buffer，事务热路径仅写 slim envelope，重投影与大对象裁剪转为异步按需执行。目标是在 diagnostics 开启时显著降低事务主链附加耗时，同时保持可解释、可序列化、可回放的证据链路。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-10
- **Kill Features (KF)**: KF-8

## Technical Context

**Language/Version**: TypeScript 5.9.x (ESM)
**Primary Dependencies**: effect v3.19.13、`@logixjs/core`、`@logixjs/react`、Vitest / `@effect/vitest`
**Storage**: N/A（运行期内存 ring/buffer + 可序列化证据导出）
**Testing**: Vitest、`@effect/vitest`、`pnpm perf collect` + `pnpm perf diff`
**Target Platform**: Node.js 20+ 与现代浏览器
**Project Type**: pnpm workspace（runtime 核心路径改造）
**Performance Goals**: diagnostics=light 时事务主链附加 p95 耗时下降 ≥40%，附加分配下降 ≥50%；diagnostics=off 附加开销 ≤5%
**Constraints**: 事务窗口禁止 IO；事件必须 Slim 且可序列化；稳定 instanceId/txnSeq/opSeq；forward-only（无兼容层）
**Scale/Scope**: 单进程并发 ≥10 runtime；每 runtime 独立 ring/buffer；支持高频 action/state 事件压测

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Gate 结果（规划阶段）

| Gate | 结论 | 说明 |
| --- | --- | --- |
| Intent → Flow/Logix → Code → Runtime 链路 | PASS | 需求聚焦 Runtime 观测内核；Flow/业务 DSL 不变；实现与证据链路在 Runtime 层闭环。 |
| Docs-first / SSoT 对齐 | PASS | 计划更新 `docs/ssot/runtime/logix-core/observability/09-debugging*.md` 与 `impl/README.09-statetransaction-devtools.md`。 |
| Effect/Logix 合约变化登记 | PASS | 仅调整 observability 内部契约与事件聚合语义，不新增业务公开 DSL。 |
| IR 与锚点漂移控制 | PASS | 保留 `RuntimeDebugEventRef` 最小锚点（moduleId/instanceId/txnSeq/opSeq/eventId）并补 schema 校验与文档回写。 |
| 稳定标识（去随机） | PASS | 明确禁止 random/time 默认 ID；采用 runtime-scoped 单调序列可重建 ID。 |
| 事务边界（禁止 IO） | PASS | 热路径仅 envelope append；重投影异步化且不在事务窗口执行。 |
| React no-tearing / 外部源信号化 | PASS (N/A) | 本特性不改 React snapshot 协议；仅保留现有锚点兼容。 |
| Internal contracts / trial run 无全局依赖 | PASS | 观测聚合改为 runtime-scoped，导出不依赖进程级全局单例。 |
| Dual kernel support matrix | PASS | `core=supported`；`core-ng=not-yet`（需后续契约对齐验证）。 |
| 质量门 | PASS | 规划完成后执行 `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo` 作为实现阶段门禁。 |

### Constitution 必覆盖项（本特性硬约束）

#### 1. 性能预算（Performance Budget）

- 热路径定义：`runWithStateTransaction` → `StateTransaction.commit` → `Debug.record` → runtime-scoped ring append。
- 预算目标：
  - diagnostics=light：事务主链附加 p95 耗时相对 before 降低 ≥40%。
  - diagnostics=light：事务主链附加分配相对 before 降低 ≥50%。
  - diagnostics=off：附加耗时/分配均 ≤5%。
- 证据方式：同环境、同 profile、同采样参数下执行 before/after collect 与 diff，`comparable=false` 时禁止下结论。

#### 2. 诊断成本（Diagnostic Cost）

- `off`：不触发重投影任务，不维护额外大对象缓存，仅保留近零成本分支检查。
- `light`：只写 slim envelope + O(1) ring append，禁止主链深拷贝/重编码。
- `full`：允许 richer 投影，但必须异步按需；并记录 `oversized/non_serializable/dropped` 成本计数。
- 成本可解释性：Devtools/Evidence 必须暴露降级计数与原因码。

#### 3. 稳定标识（Stable Identity）

- instance 级：`instanceId` 由宿主注入，禁止默认 `Math.random()/Date.now()`。
- 事务/操作级：`txnSeq/opSeq/eventSeq` 为 runtime-scoped 单调序列。
- 派生 ID：`txnId/eventId` 由稳定锚点确定性派生，可回放重建。

#### 4. IR / 锚点漂移风险（Drift Risk）

- 风险点：事件编码分层后，可能出现 `RuntimeDebugEventRef` 字段漂移或 `diagnosticsLevel` 裁剪口径不一致。
- 控制措施：
  - 对齐 SSoT：更新 `docs/ssot/runtime/logix-core/observability/09-debugging.01-debugsink.md` 与 `09-debugging.02-eventref.md`。
  - 添加契约校验：为 slim envelope / async projection 输出增加 schema 断言与回归测试。
  - 变更门禁：无文档回写与契约测试不得宣告完成。

#### 5. 迁移说明（Forward-Only）

- 破坏性点：去除“进程级全局观测单例”作为默认聚合语义；切换为 runtime-scoped 观测上下文。
- 迁移产物：`specs/097-runtime-scoped-observability/quickstart.md` + 相关 SSoT 文档中的“旧接口/旧语义替代方式”。
- 策略：不保留兼容层、不设弃用期；以迁移说明替代向后兼容。

## Kernel Support Matrix

| Kernel | Status | 说明 |
| --- | --- | --- |
| `@logixjs/core` | supported | 本次改造主落点。 |
| `@logixjs/core-ng` | not-yet | 需后续按同一 Runtime Services/事件协议补齐；本轮不实现。 |

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后（before/after）
- envId：`macos-arm64.node20`（浏览器补充 `chromium-headless`）
- profile：`default`（交付）；疑难回归时升级 `soak`
- collect（before）：
  - `pnpm perf collect -- --profile default --out specs/097-runtime-scoped-observability/perf/before.<sha>.macos-arm64.node20.default.json --files packages/logix-core`
- collect（after）：
  - `pnpm perf collect -- --profile default --out specs/097-runtime-scoped-observability/perf/after.<worktree>.macos-arm64.node20.default.json --files packages/logix-core`
- diff：
  - `pnpm perf diff -- --before specs/097-runtime-scoped-observability/perf/before.<sha>.macos-arm64.node20.default.json --after specs/097-runtime-scoped-observability/perf/after.<worktree>.macos-arm64.node20.default.json --out specs/097-runtime-scoped-observability/perf/diff.before__after.macos-arm64.node20.default.json`
- Failure Policy：出现 `stabilityWarning/timeout/missing suite` 时复测；`comparable=false` 则阻断性能结论。

## Project Structure

### Documentation (this feature)

```text
specs/097-runtime-scoped-observability/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
├── perf/
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/core/
├── DebugSink.ts
├── DevtoolsHub.ts
├── ModuleRuntime.ts
└── (new) RuntimeScopedObservability.ts

packages/logix-core/src/internal/observability/
└── (new) projection/

packages/logix-core/test/internal/
├── Runtime/
└── Observability/

docs/ssot/runtime/logix-core/observability/
├── 09-debugging.01-debugsink.md
├── 09-debugging.02-eventref.md
└── 09-debugging.03-effectop-bridge.md
```

**Structure Decision**: 以 `packages/logix-core` 为唯一实现主战场；先拆分观测职责（热路径 envelope / 异步投影 / runtime 缓冲）再接回现有 Debug/Devtools 接口，避免在单文件内叠加复杂度。

## Phase Deliverables

### Phase 0: Research

- 明确现有全局单例链路与 runtime-scoped 切分点。
- 完成性能基线采样方案与事件口径差异清单。
- 产物：`research.md`。

### Phase 1: Design

- 设计 runtime-scoped 事件总线、slim envelope、异步投影作业模型。
- 定义容量预算、降级策略、生命周期回收语义。
- 产物：`data-model.md`、`contracts/*`、`quickstart.md`。

### Phase 2: Tasking

- 将实现拆成按用户故事可独立验收的任务，标注依赖与并行机会。
- 产物：`tasks.md`。

## Quality Gates

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:turbo`
- 性能证据：`pnpm perf collect`（before/after）+ `pnpm perf diff`
- 通过标准：类型/静态检查/测试全绿；性能 diff 满足预算或有可解释例外并记录。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| 无 | N/A | N/A |
