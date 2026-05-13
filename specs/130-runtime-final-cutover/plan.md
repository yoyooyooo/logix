# Implementation Plan: Runtime Final Cutover

**Branch**: `130-runtime-final-cutover` | **Date**: 2026-04-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/130-runtime-final-cutover/spec.md`

## Summary

本计划把 final cutover 拆成四条必须同时收口的主线：

1. canonical runtime spine 最终压缩
2. runtime shell / legacy residue 清场
3. runtime control plane 一级入口最终收口
4. docs / examples / exports / direct consumers 单波次回写

### 2026-04-07 Execution Update

- direct consumer 默认 `.implement(...)` 路径已在 `core test + logix-test + sandbox browser` 范围内清零
- control plane 旧 trial facade 已退出 public surface
- `internal/runtime` 顶层 forwarding shell 已删到只剩 `AppRuntime.ts`、`ModuleFactory.ts`、`hotPathPolicy.ts`
- 现阶段剩余重点是最终全域 grep 门禁与 inventory 收口

已知必须点名的高风险 direct consumers：

- `packages/logix-core/test/observability/**`
- `packages/logix-test/test/**`
- `packages/logix-sandbox/src/Client.ts`
- `packages/logix-sandbox/src/Service.ts`
- `packages/logix-sandbox/test/browser/**`
- `examples/logix/src/scenarios/trial-run-evidence.ts`

这不是第三轮温和修补。实现策略采用 forward-only 总收口：默认删除过渡层，默认拒绝第二真相源，默认把未终局能力从 canonical surface 中赶出去；只有能证明自己必须存在的项，才进入显式 allowlist。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x, Effect v4, Markdown
**Primary Dependencies**: `packages/logix-core/**`, `packages/logix-core/src/index.ts`, `packages/logix-core/test/observability/**`, `packages/logix-core/test/Contracts/**`, `packages/logix-cli/src/internal/commands/*.ts`, `packages/logix-test/test/TestProgram/**`, `packages/logix-test/test/Vitest/**`, `packages/logix-sandbox/src/{Client.ts,Service.ts}`, `packages/logix-sandbox/test/browser/**`, `packages/logix-react/**`, `packages/logix-devtools-react/**`, `examples/logix/src/scenarios/trial-run-evidence.ts`, `examples/logix/src/verification/**`, `docs/ssot/runtime/**`, `docs/ssot/platform/**`, `docs/adr/**`, `docs/standards/**`
**Storage**: files / N/A
**Testing**: Vitest, `@effect/vitest`, targeted contract audits, `pnpm typecheck`, focused runtime/perf evidence commands
**Target Platform**: Node.js 20+ + modern browsers
**Project Type**: pnpm workspace monorepo
**Performance Goals**: 对本轮命中的 steady-state hot paths 保持无未解释回退；证据统一落在 `specs/130-runtime-final-cutover/perf/**` 或复用 `123/115` 的 comparable baseline
**Constraints**: forward-only；禁止兼容层；禁止第二套 runtime / control plane；禁止 limbo capability；allowlist 默认预算为 0；若触及 ≥1000 LOC 文件，先做互斥拆解方案
**Scale/Scope**: `core + docs + canonical examples + direct cli/test/sandbox consumers + affected host projection consumers`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **North Stars / Kill Features**: PASS
  `spec.md` 已记录 NS-4 / NS-8 / NS-10 与 KF-8 / KF-9，plan 保持同口径。
- **Intent → Flow/Logix → Code → Runtime 链路**: PASS
  本特性不新增业务意图模型；它收口的是 `docs → public spine → runtime core → control plane` 的最终映射。
- **Docs-first & SSoT**: PASS
  `122/123/124` 的 owner docs 已存在；本轮必须先更新 SSoT / ADR / standards，再同步代码与 examples。
- **Effect / Logix contracts**: PASS
  会触及 runtime spine、control plane facade、allowlist contract；对应 owner 文档为 `01 / 02 / 04 / 09 / platform/01`。
- **IR & anchors**: PASS
  本轮默认不改 unified minimal IR；若实现阶段触及 IR/anchor，必须连 parser/codegen + docs 一起回写。
- **Deterministic identity**: PASS
  本轮不得引入新的随机/time-based identity；若 shell 删除触及 identity 透传，必须保持稳定 `instanceId / txnSeq / opSeq` 语义。
- **Transaction boundary**: PASS
  final cutover 不得借壳层清理之名绕开同步事务边界或 writable ref 限制。
- **React consistency (no tearing)**: PASS
  本轮只允许调整 host projection 的入口归属，不允许破坏单快照锚点。
- **External sources (signal dirty)**: PASS
  不新增 payload queue / 第二调度面；若清理旧入口，必须保持 pull-based 规则不变。
- **Internal contracts & trial runs**: PASS
  control plane 收口必须继续经显式 Runtime Services / report contract，不能回到 magic field。
- **Stub / archived backend gate**: PASS WITH CUTOVER
  canonical 或 direct-consumer 路径中的 `check / trial / compare` 不能继续以 “not available yet” 或 archived backend bridge 形态存在；若当前仍存在，必须在 `130` 中收口或降级出默认路径。
- **Direct consumer migration**: PASS WITH GATE
  必须显式枚举 CLI、sandbox、core observability tests、canonical examples 中当前默认走旧 `trialRun*` / `Observability` / `Reflection` 路径的入口，并给出迁移目标；未枚举不得进入实施。
- **Root barrel role settlement**: PASS WITH GATE
  `packages/logix-core/src/index.ts` 中 `ControlPlane / Observability / Reflection / Kernel` 的最终公开角色必须先落到 ledger；角色未定不得进入实施。
- **Dual kernels (core + core-ng)**: PASS
  本轮若触及 `Kernel` 或 Runtime Services，只允许继续使用已有 support matrix / contract verification gate；禁止把消费者直接绑到 `core-ng`。
- **Performance budget**: PASS WITH EVIDENCE
  若命中 steady-state runtime core，必须补 `specs/130-runtime-final-cutover/perf/**` 或引用 `123/115` comparable evidence；若触及 `packages/logix-core/src/internal/runtime/**` 中从 `Runtime.ts`、`ProgramRunner*` 或 module assembly reachable 的路径，即便名义上只是 shell cleanup，也至少要做 targeted before/after probe。
- **Diagnosability & explainability**: PASS
  清理旧入口后，控制面机器报告与诊断事件仍必须可解释、可比较。
- **User-facing performance mental model**: PASS
  若 runtime surface / control plane surface 命名变化影响对外心智，必须同步更新 docs。
- **Breaking changes (forward-only evolution)**: PASS
  本轮允许 breaking cutover，但必须在 plan/tasks/PR 中写迁移说明，不保留兼容层。
- **Public submodules**: PASS
  最终导出面必须继续通过 `src/index.ts` + top-level submodules 表达，不允许内部路径泄露。
- **Large modules/files (decomposition)**: ATTENTION
  若触及 `ModuleRuntime.impl.ts`（2031 LOC）、`WorkflowRuntime.ts`（1130 LOC）、`StateTransaction.ts`（1190 LOC）等 ≥1000 LOC 文件，必须先拆解再改语义；未完成拆解记录与 before baseline，不得进入语义 cutover。
- **Quality gates**: PASS
  至少运行 `pnpm typecheck`、定向 vitest、必要时补 perf diff。

## Perf Evidence Plan（MUST）

- Baseline 语义：策略 A/B + 代码前后混合
- envId：沿用当前本机统一 env 标识
- profile：default；必要时升到 soak
- collect（before）：`pnpm perf collect -- --profile default --out specs/130-runtime-final-cutover/perf/before.<sha>.<envId>.default.json`
- collect（after）：`pnpm perf collect -- --profile default --out specs/130-runtime-final-cutover/perf/after.<sha>.<envId>.default.json`
- diff：`pnpm perf diff -- --before specs/130-runtime-final-cutover/perf/before...json --after specs/130-runtime-final-cutover/perf/after...json --out specs/130-runtime-final-cutover/perf/diff....json`
- Reuse Rule：若本轮只改 shell / control plane facade 且未命中 steady-state runtime core，可复用 `123` 的 zone 判定与 `115` 的 baseline，不强行做新 perf 结论
- Failure Policy：`comparable=false` 禁止下性能结论；若 evidence 仅覆盖 diagnostics=on，必须标记为无效基线

## Project Structure

### Documentation (this feature)

```text
specs/130-runtime-final-cutover/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
├── inventory/
│   ├── runtime-spine-ledger.md
│   ├── shell-residue-ledger.md
│   ├── control-plane-entry-ledger.md
│   ├── allowlist-ledger.md
│   ├── migration-ledger.md
│   └── docs-consumer-matrix.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/
├── src/
│   ├── *.ts
│   ├── internal/runtime/
│   ├── internal/runtime/core/
│   ├── internal/observability/
│   └── internal/platform/
└── test/
    ├── Contracts/
    ├── Runtime/
    └── observability/

packages/logix-cli/
packages/logix-test/
packages/logix-sandbox/
packages/logix-react/
packages/logix-devtools-react/

examples/logix/

docs/ssot/runtime/
docs/ssot/platform/
docs/adr/
docs/standards/
```

**Structure Decision**: 采用“总控规格 + ledger 驱动”的结构。`plan.md` 固定 cutover 原则与门禁；`research.md` 固定关键裁决；`data-model.md` 只描述 final cutover 中的稳定实体与状态；`contracts/README.md` 记录非 HTTP 的 runtime surface / control plane contract；`inventory/*` 用于后续 tasks 阶段逐项核对 surviving / remove / allowlist / migration / direct consumers / exports。

### Owner Docs Minimum Set

本轮最低 owner docs 集合固定为：

- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/02-hot-path-direction.md`
- `docs/ssot/runtime/03-canonical-authoring.md`
- `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/README.md`
- `docs/ssot/platform/01-layered-map.md`
- `docs/ssot/platform/02-anchor-profile-and-instantiation.md`
- `docs/adr/2026-04-04-logix-api-next-charter.md`
- `docs/adr/2026-04-05-ai-native-runtime-first-charter.md`
- `docs/standards/logix-api-next-guardrails.md`

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| 可能触及 `ModuleRuntime.impl.ts`、`WorkflowRuntime.ts`、`StateTransaction.ts` 等超大文件 | final cutover 可能需要直接切断旧壳与旧入口 | 只在外层 facade 修补无法真正完成最终收口，会把复杂度继续留给未来 |

### Decomposition Brief

- 若触及 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - 先拆职责：instance bootstrap、dispatch shell、transaction wiring、runtime registration
  - 落点优先：`ModuleRuntime.bootstrap.ts`、`ModuleRuntime.dispatchShell.ts`、`ModuleRuntime.txnWiring.ts`、`ModuleRuntime.registryWiring.ts`
- 若触及 `packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts`
  - 先拆职责：program compile bridge、trigger watch、run scheduling、service call execution
- 若触及 `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - 先拆职责：patch evidence、origin metadata、dirty evidence、serialization helpers
- 规则：拆分与语义改动解耦；先无损拆，再做 final cutover 语义切换
- 阻断门槛：命中上述任一文件时，未完成 decomposition-only patch 与验证前，不得进入任何语义 cutover 任务

## Final Gate Checklist

以下各项必须全部满足，才能写 final verdict：

1. required suites 全部通过
2. public exports audit 完成，且所有 root/subpath export 已分类
3. inventory 中不得再出现 `settle`、`or`、`TBD`、`默认空`
4. allowlist 项全部具备 replacement path、consumer-zero proof 与 migration record
5. migration ledger 覆盖全部 remove / rename / expert-only / internal-backing-only surface
6. 若命中 oversized-core，已附 decomposition proof
7. direct consumers matrix 中无未判定消费者
8. grep gate 对 legacy string / old facade / stale wording 的扫描结果满足零命中或全部落在 allowlist

## Phase 0: Research

产物：[`research.md`](./research.md)

目标：

1. 定死 final cutover 的默认策略是“删除优先，allowlist 例外”
2. 定死 control plane 的公开一级入口归属
3. 定死 canonical capability limbo 项的处理策略
4. 定死大文件命中时的拆解前置规则
5. 定死 test / sandbox / observability consumers 也属于 first-class cutover 面
6. 定死 owner docs 与 canonical examples 的同步回写清单
7. 定死 allowlist 默认预算为 0，所有例外项必须先批准再进入实现
8. 定死 root barrel runtime exports 的最终公开角色

## Phase 1: Design

产物：

- [`data-model.md`](./data-model.md)
- [`contracts/README.md`](./contracts/README.md)
- [`quickstart.md`](./quickstart.md)

设计动作：

1. 建 runtime spine / control plane / residue / allowlist 的稳定实体模型
2. 定义 final cutover 的 contract owner 与 allowed facade
3. 定义执行验证路径与 fallback / no-go 规则
4. 定义 direct consumer 的旧入口迁移表与严格 grep gate
5. 定义 root barrel export role map
6. 定义 root barrel / owner docs / verification subtree 的同步回写矩阵

## Phase 2: Implementation Planning

在 `tasks.md` 中必须拆成 5 个可独立验收的波次：

1. canonical spine + capability settlement
2. runtime shell residue collapse
3. control plane public entry cutover
4. docs / examples / exports / core-test / direct-consumer convergence
5. perf + diagnostics + allowlist final gate

## Verification Plan

```bash
pnpm vitest run packages/logix-core/test/Contracts packages/logix-core/test/Runtime
pnpm vitest run \
  packages/logix-core/test/observability \
  packages/logix-sandbox/test/browser \
  packages/logix-test/test/TestProgram \
  packages/logix-test/test/Vitest
pnpm typecheck
rg -n 'implement\\(|trialRun\\(|Observability\\.trialRun|Reflection\\.|runtime\\.(check|trial|compare)|v3:' \
  packages/logix-core packages/logix-cli packages/logix-test packages/logix-sandbox examples/logix docs
rg -n 'Observability\\.trialRun|Observability\\.trialRunModule|trialRunModule\\(|trialRun\\(|Reflection\\.(verify|export|extract)|TRIAL_BACKEND_PENDING' \
  packages/logix-cli packages/logix-test packages/logix-sandbox packages/logix-react examples/logix packages/logix-core/test
```

判定：

- 若 canonical surface 仍出现旧入口或 limbo capability，则 final cutover 失败
- 若 direct consumers 仍绕开统一 control plane，则 final cutover 失败
- 若 core 自身 observability / reflection tests 仍把旧 facade 当默认路径，则 final cutover 失败
- 若 `runtime/01`、`runtime/04`、`runtime/07`、`runtime/09`、`runtime/README`、`platform/01`、`platform/02` 的 owner 口径不一致，则 final cutover 失败
- 若 `packages/logix-core/src/index.ts` 中 runtime 相关 root exports 仍存在角色未定项，则 final cutover 失败
- 若 `packages/logix-cli/src/internal/commands/trial.ts` 仍以 “runtime.trial is not available yet” 或 archived backend bridge 形态存在于默认路径，则 final cutover 失败
- 若 grep 命中项未被归类到 `canonical facade / expert alias / internal-backing-only / remove / allowlist`，则 final cutover 失败
- 若新增 allowlist 无 owner / exit condition / proofOfNecessity，则 final cutover 失败
