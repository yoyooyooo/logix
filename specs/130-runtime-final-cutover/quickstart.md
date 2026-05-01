# Quickstart: Runtime Final Cutover

## 目标

用最短路径验证 `130` 的计划与后续实现是否仍然朝“单一 kernel + 最小公开面 + 单一 control plane”推进。

## Step 1: 读规格与计划

- 读 [spec.md](./spec.md)
- 读 [plan.md](./plan.md)
- 读 [research.md](./research.md)

## Step 2: 检查 current surface 是否仍有旧残留

```bash
rg -n 'implement\\(|trialRun\\(|Observability\\.trialRun|Reflection\\.|v3:|core-ng|PoC|Orchestrator|placeholder' \
  packages/logix-core packages/logix-cli packages/logix-test packages/logix-sandbox packages/logix-react packages/logix-devtools-react examples/logix docs
```

期望：

- canonical public surface 不再依赖旧入口
- residual hits 只能出现在明确的 expert / internal-backing-only / allowlist / history 位置

## Step 3: 检查 control plane 是否统一

```bash
rg -n 'runtime\\.(check|trial|compare)|ControlPlane|trialRunModule|trialRun\\(' \
  packages/logix-core packages/logix-cli packages/logix-test packages/logix-sandbox examples/logix
rg -n 'Observability\\.trialRunModule|Observability\\.trialRun|Logix\\.Reflection\\.|trialRunModule\\(|TRIAL_BACKEND_PENDING' \
  packages/logix-cli packages/logix-test packages/logix-sandbox packages/logix-react examples/logix packages/logix-core/test
rg -n "internal/runtime/(ModuleRuntime|ProgramRunner|BoundApiRuntime|FlowRuntime|Lifecycle|Runtime|index)(\\.ts|\\.js|\\*|)" \
  packages/logix-core/src packages/logix-core/test
pnpm vitest run \
  packages/logix-core/test/observability \
  packages/logix-sandbox/test/browser \
  packages/logix-test/test/TestProgram \
  packages/logix-test/test/Vitest
```

期望：

- `check / trial / compare` 成为唯一一级心智
- 旧路径最多只出现在 internal backing / history / allowlist 位置
- 每个命中项都已被归类到 `canonical facade / internal-backing-only / remove / allowlist`
- 顶层 forwarding shell 路径命中数为 0

## Step 4: 跑基础验证

```bash
pnpm vitest run packages/logix-core/test/Contracts packages/logix-core/test/Runtime
pnpm typecheck
```

## Step 5: 若命中 steady-state runtime core，补 perf evidence

```bash
pnpm perf collect -- --profile default --out specs/130-runtime-final-cutover/perf/before.<id>.json
pnpm perf collect -- --profile default --out specs/130-runtime-final-cutover/perf/after.<id>.json
pnpm perf diff -- --before specs/130-runtime-final-cutover/perf/before.<id>.json --after specs/130-runtime-final-cutover/perf/after.<id>.json --out specs/130-runtime-final-cutover/perf/diff.<id>.json
```

## Step 6: 人工 gate

以下任一成立，则不能宣称 final cutover 完成：

- canonical docs 与代码口径仍不一致
- 仍存在未解释的 forwarding shell / legacy wrapper
- 仍存在 limbo capability
- 仍存在并列 control plane 一级入口
- 仍存在未迁移或未判定的 direct consumer
- allowlist 非空但缺 owner / exit condition / proofOfNecessity
- migration ledger 未覆盖全部 breaking surface
- perf 证据不可比或有未解释回退
