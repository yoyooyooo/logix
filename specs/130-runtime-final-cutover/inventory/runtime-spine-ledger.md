# Runtime Spine Ledger

## Purpose

记录 final cutover 后哪些入口仍属于 canonical runtime spine，哪些只能降到 expert / control plane / UI projection。

## Allowed Final States

- `canonical-keep`
- `expert-only`
- `control-plane-only`
- `internal-backing-only`
- `allowlisted-temporary`
- `remove`

## Canonical Public Spine

| Surface | Current Role | Target Role | Owner | Notes |
| --- | --- | --- | --- | --- |
| `Module` | canonical | `canonical-keep` | `docs/ssot/runtime/01` | 定义期对象 |
| `Logic` | canonical | `canonical-keep` | `docs/ssot/runtime/01` | 可复用行为片段 |
| `Program` | canonical | `canonical-keep` | `docs/ssot/runtime/01` | 唯一公开装配期对象 |
| `Runtime` | canonical | `canonical-keep` | `docs/ssot/runtime/01` | 唯一公开运行入口 |

## Expert / Non-Canonical

| Surface | Current Role | Target Role | Owner | Notes |
| --- | --- | --- | --- | --- |
| `Kernel` root export | expert | `expert-only` | `docs/ssot/runtime/01` | 保留 expert 升级层，不回 canonical authoring 主链 |
| `Process` root export | expert | `expert-only` | `docs/ssot/runtime/03/05` | orchestration family |
| `Workflow` root export | expert | `expert-only` | `docs/ssot/runtime/03/05` | 装配统一回 `Program.make(..., { workflows })` |
| `ControlPlane` root export | control-plane contract | `control-plane-only` | `docs/ssot/runtime/04/09` | direct consumer 边界必须写实 |
| `Observability` root export | evidence/export protocol | `expert-only` | `130` | root export 允许保留，但 public trial helpers 已退出 |
| `Reflection` root export | platform/export helpers + old verification facade | `expert-only` | `130` | root export 允许保留，但 direct consumer 默认路径必须退出 |
| `packages/logix-test` default runtime helpers | consumer helper surface | `internal-backing-only` | `130` | 不得继续默认推广 `Module.implement(...)` |

## Canonical Capability Settlement

| Capability | Current State | Target State | Owner | Notes |
| --- | --- | --- | --- | --- |
| `services` | implemented | `implemented` | `docs/ssot/runtime/04` | canonical capability |
| `imports` | implemented | `implemented` | `docs/ssot/runtime/04` | canonical capability |
| `roots` | limbo | `removed` | `docs/ssot/runtime/04` | 当前 core 没有稳定语义，final cutover 默认退出 canonical surface |

## Public Export Classification

| Package | Current Export Roots | Required Final Classification |
| --- | --- | --- |
| `packages/logix-core` | `.` + 27 个 subpath，含 `ControlPlane / Observability / Reflection / Kernel` | 每项都必须落成 `canonical-keep | expert-only | control-plane-only | internal-only` 之一 |
| `packages/logix-cli` | `.` + `./Commands` | 不得再暴露 `trialrun` / `spy.evidence` 类默认命令面 |
| `packages/logix-test` | `.` + `TestRuntime/TestProgram/Execution/Assertions/Vitest` | 不得继续通过 package default surface 推广 `.implement()` 心智 |
| `packages/logix-sandbox` | `.` + `Client/Protocol/Service/Types/Vite/vite` | `Client/Service` 必须和 final control plane route 对齐 |

## Direct Consumer Default Route Settlement

| Consumer Scope | Default Route Today | Target Route | Notes |
| --- | --- | --- | --- |
| `packages/logix-cli/**` | final `runtime.check / runtime.trial / runtime.compare` facade | final `runtime.check / runtime.trial / runtime.compare` facade | 已收口 |
| `packages/logix-test/**` | `.implement()` heavy | `Program.make(...)` by default | internal-only residue 才能 allowlist |
| `packages/logix-sandbox/**` | `Runtime.trial` canonical wrapper | final control plane facade | browser worker/tests 已随 wrapper 收口 |
| `packages/logix-react/**` | package-local host projection | package-local host projection only | 不得变成第二装配面 |
| `packages/logix-devtools-react/**` | package-local diagnostics consumer | package-local diagnostics consumer only | 不得变成第二控制面 |
| `examples/logix/**` | canonical runtime spine only | canonical runtime spine only | verification subtree 也算 first-class consumer |

## Perf Evidence Routing

- 若后续命中 `packages/logix-core/src/internal/runtime/core/**` steady-state 路径，优先复用 `specs/123-runtime-kernel-hotpath-convergence/**` 的 zone 规则与 `specs/115-core-kernel-extraction/perf/*.json` baseline。
- 若只改 root exports、docs、direct consumer route、placeholder backend，不得宣称性能改善，只允许宣称结构收口。
- 若命中 `internal/runtime/**` 中从 `Runtime.ts`、`ProgramRunner*`、module assembly 可达的协调路径，至少补 targeted before/after probe。

## Gate

- 若任何 root export / subpath export 未分类，或 legacy / allowlist 项仍泄露到 canonical root export，则 final cutover 不通过。
- 若 direct consumer 仍把 `.implement()` 或旧 trial/evidence facade 作为默认路径，则 final cutover 不通过。
- 若 `Kernel`、`ControlPlane`、`Observability`、`Reflection` 的 root export 角色未明确，则 final cutover 不通过。

## Verification Snapshot

### 2026-04-07

- `pnpm vitest run packages/logix-core/test/Contracts/KernelBoundary.test.ts`
  - PASS
- `pnpm vitest run packages/logix-core/test/Runtime/Runtime.make.Program.test.ts packages/logix-test/test/TestProgram/TestProgram.test.ts packages/logix-test/test/TestProgram/Scenarios.test.ts packages/logix-test/test/TestRuntime/runtime_service_pattern.test.ts packages/logix-test/test/Vitest/vitest_program.test.ts`
  - PASS
- `pnpm vitest run packages/logix-core/test/internal/Reflection/Manifest.Determinism.test.ts packages/logix-core/test/internal/Reflection/Manifest.Truncation.test.ts packages/logix-core/test/internal/Reflection/Manifest.Actions.test.ts`
  - PASS
- `pnpm -C packages/logix-sandbox exec vitest run test/browser/sandbox-worker-smoke.test.ts test/browser/sandbox-worker-process-events.compat.test.ts`
  - PASS
- `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit && pnpm -C packages/logix-test exec tsc -p tsconfig.test.json --noEmit`
  - PASS
- `pnpm -C packages/logix-core exec tsc -p tsconfig.test.json --noEmit`
  - PASS
- `rg -n '\\.implement\\(' packages/logix-core/test/internal/Reflection packages/logix-core/test/observability examples/logix-sandbox-mvp/test packages/logix-sandbox/test/browser packages/logix-test/test -g '*.ts' -g '*.tsx'`
  - ZERO HIT
