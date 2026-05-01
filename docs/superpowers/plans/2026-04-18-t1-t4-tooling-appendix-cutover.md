# T1 T2 T3 T4 Tooling Appendix Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已冻结的 `T1 + T2 + T3 + T4` 结论真正消费到 `@logixjs/cli`、`@logixjs/test`、`@logixjs/sandbox`、`@logixjs/devtools-react` 的 package exports、root barrel、bin、repo consumers、authority docs 与总提案进度中。

**Architecture:** 这一批只消费已冻结的 exact surface contract，不重开 freeze。顺序固定为：先把 Batch 4 planning 状态写进总提案，再按 `T1 -> T2 -> T3 -> T4` 依次把现有长期 witness 改成红灯，随后收口 package exports / root barrel / repo imports / docs promise，最后做分包 focused verification 与仓库级 `pnpm typecheck`。迁移期不新增最终残留的 migration-only 测试文件，断言优先折回现有长期测试文件。

**Tech Stack:** TypeScript, pnpm, Vitest, Effect V4, package exports, tsup, Markdown docs

**Batch Scope:** 只消费 [cli-control-plane-surface-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/cli-control-plane-surface-contract.md)、[test-harness-surface-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/test-harness-surface-contract.md)、[sandbox-surface-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/sandbox-surface-contract.md)、[devtools-appendix-surface-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/devtools-appendix-surface-contract.md) 与对应 review ledgers 的冻结结果。本批不进入 `F1`、`C2A*`、`C2B` 实现，也不自动执行 `git commit`。

---

## Chunk 1: Batch Frame

### Task 1: 把 Batch 4 planning 状态写进总提案

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 回写 Batch 4 条目**

要求：
- 新增 `Batch 4`
- 名称固定为 `T1 + T2 + T3 + T4 Tooling Appendix Cutover`
- `status=planning`
- 范围写清：
  - 消费已冻结的 `T1`
  - 消费已冻结的 `T2`
  - 消费已冻结的 `T3`
  - 消费已冻结的 `T4`
- 不包含：
  - `F1`
  - `C2A1`
  - `C2A2`
  - `C2A3`
  - `C2B`
  - 深层 runtime 重构

- [ ] **Step 2: 运行最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 2: T1 CLI

### Task 2: 先把 CLI 长期 witness 改成红灯

**Files:**
- Modify: `packages/logix-cli/test/Integration/check.command.test.ts`
- Modify: `packages/logix-cli/test/Integration/trial.command.test.ts`
- Modify: `packages/logix-cli/test/Integration/compare.command.test.ts`
- Modify: `packages/logix-cli/test/Integration/output-contract.test.ts`
- Modify: `packages/logix-cli/test/Integration/cli.describe-json.test.ts`
- Modify: `packages/logix-cli/test/Integration/cli.ir-validate.fields.test.ts`
- Modify: `packages/logix-cli/test/Integration/cli.ir-diff.fields.test.ts`
- Modify: `packages/logix-cli/test/Args/Args.cli-config-prefix.test.ts`

- [ ] **Step 1: 改 canonical route witness**

要求：
- `check.command`、`trial.command`、`compare.command`、`output-contract` 继续证明 `check / trial / compare` 是唯一 public route
- `Args.cli-config-prefix` 继续证明 `trial` 的 config-prefix 行为
- `trialrun` alias 继续保持拒绝

- [ ] **Step 2: 改 archived residue witness**

要求：
- `cli.describe-json` 不再证明 `describe` 仍在 public route
- `cli.ir-validate.fields` 与 `cli.ir-diff.fields` 不再证明 `ir.*` 仍是 public route
- 若底层命令暂存为 internal residue，测试应改成 internal owner proof；若只剩 public-surface witness，直接删除或改成 negative witness

- [ ] **Step 3: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-cli exec vitest run test/Args/Args.cli-config-prefix.test.ts test/Integration/check.command.test.ts test/Integration/trial.command.test.ts test/Integration/compare.command.test.ts test/Integration/output-contract.test.ts test/Integration/cli.describe-json.test.ts test/Integration/cli.ir-validate.fields.test.ts test/Integration/cli.ir-diff.fields.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 `Commands / ./Commands / logix-devserver / describe / ir.*` 仍挂在公开 CLI surface

### Task 3: 消费 T1 合同到 cli package

**Files:**
- Create: `packages/logix-cli/src/internal/entry.ts`
- Modify: `packages/logix-cli/package.json`
- Modify: `packages/logix-cli/src/index.ts`
- Modify: `packages/logix-cli/src/Commands.ts`
- Modify: `packages/logix-cli/src/bin/logix.ts`
- Modify: `packages/logix-cli/src/bin/logix-devserver.ts`
- Modify: `packages/logix-cli/tsup.config.ts`
- Modify: `examples/logix-cli-playground/package.json`
- Modify: `examples/logix-cli-playground/tutorials/05-baseline-and-diff/README.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 内部化 CLI entry**

要求：
- 把 `runCli / main / printHelp / formatCommandResult` 迁到 `src/internal/entry.ts`
- `src/bin/logix.ts` 与需要保留的 internal tests 只从 internal entry 消费
- `src/Commands.ts` 不再承担公开 subpath 身份

- [ ] **Step 2: 收口 package exports 与 bin**

要求：
- `package.json` 与 `publishConfig.exports` 删除 `.` 与 `./Commands`
- `package.json` 与 `publishConfig.bin` 删除 `logix-devserver`
- `tsup.config.ts` 去掉 `src/index.ts`、`src/Commands.ts`、`src/bin/logix-devserver.ts` 的打包入口
- `src/index.ts` 与 `src/Commands.ts` 若保留，只能作为包内残留文件，不再对外承诺 public contract

- [ ] **Step 3: 清理 repo fallout**

要求：
- `examples/logix-cli-playground/package.json` 删除所有依赖 `describe / ir.* / contract-suite.run / transform.module / logix-devserver / trialrun` 的脚本
- `examples/logix-cli-playground/tutorials/05-baseline-and-diff/README.md` 从当前用户路径里移除 `ir export / ir diff / trialrun` 教程
- 若 playground 还需要保留维护级脚本，明确回收到仓内脚本或文档注记，不继续作为对外 canonical 教程

- [ ] **Step 4: 回写 authority 与总提案**

要求：
- `runtime/09` 只保留 `@logixjs/cli` 的 `check / trial / compare` 一级命令面口径
- 总提案里把 `T1` 的“未完全落实”描述改成已消费或更窄的剩余项

- [ ] **Step 5: 再跑 CLI focused tests**

Run:
```bash
pnpm -C packages/logix-cli exec vitest run test/Args/Args.cli-config-prefix.test.ts test/Integration/check.command.test.ts test/Integration/trial.command.test.ts test/Integration/compare.command.test.ts test/Integration/output-contract.test.ts test/Integration/cli.describe-json.test.ts test/Integration/cli.ir-validate.fields.test.ts test/Integration/cli.ir-diff.fields.test.ts
```

Expected:
PASS

## Chunk 3: T2 Test Harness

### Task 4: 先把 test harness 长期 witness 改成红灯

**Files:**
- Modify: `packages/logix-test/test/TestProgram/TestProgram.test.ts`
- Modify: `packages/logix-test/test/TestProgram/Scenarios.test.ts`
- Modify: `packages/logix-test/test/TestRuntime/TestRuntime.ControlPlaneContract.test.ts`
- Modify: `packages/logix-test/test/TestRuntime/runtime_service_pattern.test.ts`
- Modify: `packages/logix-test/test/Execution/ExecutionResult.test.ts`
- Modify: `packages/logix-test/test/Vitest/vitest_program.test.ts`
- Modify: `examples/logix-react/test/module-flows.integration.test.ts`
- Modify: `packages/logix-react/test/integration/runtime-yield-to-host.integration.test.tsx`

- [ ] **Step 1: 改 root survivor witness**

要求：
- root 只承认 `TestProgram`
- `TestRuntime / Execution / Assertions / Vitest / Act` 不再被 root witness 接受
- `examples/logix-react/test/module-flows.integration.test.ts` 不再依赖 root `Execution`

- [ ] **Step 2: 改 internal leak witness**

要求：
- `runtime-yield-to-host.integration.test.tsx` 不再通过 `@logixjs/test` root 的 `Act` 访问 host scheduler
- `ExecutionResult.test.ts` 与 `vitest_program.test.ts` 若功能继续存在，应改成 `TestProgram` owner 或 internal proof

- [ ] **Step 3: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-test exec vitest run test/TestProgram/TestProgram.test.ts test/TestProgram/Scenarios.test.ts test/TestRuntime/TestRuntime.ControlPlaneContract.test.ts test/TestRuntime/runtime_service_pattern.test.ts test/Execution/ExecutionResult.test.ts test/Vitest/vitest_program.test.ts
pnpm -C examples/logix-react exec vitest run test/module-flows.integration.test.ts
pnpm -C packages/logix-react exec vitest run test/integration/runtime-yield-to-host.integration.test.tsx
```

Expected:
- 至少一项失败
- 失败原因指向 root roster 仍过宽，或 `Act / Execution / Vitest` 仍依赖公开 surface

### Task 5: 消费 T2 合同到 test package

**Files:**
- Modify: `packages/logix-test/package.json`
- Modify: `packages/logix-test/src/index.ts`
- Modify: `packages/logix-test/src/TestProgram.ts`
- Modify: `packages/logix-test/src/TestRuntime.ts`
- Modify: `packages/logix-test/src/Execution.ts`
- Modify: `packages/logix-test/src/Assertions.ts`
- Modify: `packages/logix-test/src/Vitest.ts`
- Modify: `packages/logix-test/src/Act.ts`
- Modify: `examples/logix-react/test/module-flows.integration.test.ts`
- Modify: `packages/logix-react/test/integration/runtime-yield-to-host.integration.test.tsx`
- Modify: `apps/docs/content/docs/guide/recipes/public-submodules.md`
- Modify: `apps/docs/content/docs/guide/recipes/public-submodules.cn.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 收口 package exports**

要求：
- `package.json` 与 `publishConfig.exports` 只保留 `.`
- 删除 `./TestRuntime`、`./TestProgram`、`./Execution`、`./Assertions`、`./Vitest`
- `src/index.ts` 只暴露 root `TestProgram`

- [ ] **Step 2: 把剩余 helper 回收到 `TestProgram` 或 internal**

要求：
- `Execution` 与 `Vitest` 若对长期 consumer 仍必要，收编到 `TestProgram` owner law 或 internal helper
- `Act` 完全退出 public surface
- `TestRuntime` 退出 public surface，只保留 package 内部或 internal 测试消费

- [ ] **Step 3: 迁移 repo consumers**

要求：
- `examples/logix-react/test/module-flows.integration.test.ts` 改到 root `TestProgram` 下的最小用法
- `packages/logix-react/test/integration/runtime-yield-to-host.integration.test.tsx` 改为直接消费 core/internal 的调度测试能力或包内局部 helper，不再走 `@logixjs/test.Act`
- `public-submodules` 文档移除 `@logixjs/test/Vitest` 示例

- [ ] **Step 4: 回写总提案**

要求：
- `T2` 的“未完全落实”描述改到当前实际剩余项

- [ ] **Step 5: 再跑 T2 focused tests**

Run:
```bash
pnpm -C packages/logix-test exec vitest run test/TestProgram/TestProgram.test.ts test/TestProgram/Scenarios.test.ts test/TestRuntime/TestRuntime.ControlPlaneContract.test.ts test/TestRuntime/runtime_service_pattern.test.ts test/Execution/ExecutionResult.test.ts test/Vitest/vitest_program.test.ts
pnpm -C examples/logix-react exec vitest run test/module-flows.integration.test.ts
pnpm -C packages/logix-react exec vitest run test/integration/runtime-yield-to-host.integration.test.tsx
```

Expected:
PASS

## Chunk 4: T3 Sandbox

### Task 6: 先把 sandbox 长期 witness 改成红灯

**Files:**
- Modify: `packages/logix-sandbox/test/Client/SandboxClientLayer.test.ts`
- Modify: `packages/logix-sandbox/test/Client/Client.TrialBoundary.test.ts`
- Modify: `packages/logix-sandbox/test/Client/SandboxClient.listKernels.test.ts`
- Modify: `packages/logix-sandbox/test/browser/sandbox-worker-smoke.test.ts`
- Modify: `packages/logix-sandbox/test/browser/debug.sandbox-blob-import.test.ts`
- Modify: `packages/logix-sandbox/test/browser/sandbox-worker-multi-kernel.test.ts`
- Modify: `packages/logix-sandbox/test/browser/sandbox-worker-process-events.compat.test.ts`
- Modify: `packages/logix-sandbox/test/browser/sandbox-worker-observable.test.ts`

- [ ] **Step 1: 改 root survivor witness**

要求：
- root 只承认 `SandboxClientTag` 与 `SandboxClientLayer`
- `Client.TrialBoundary` 改成新的 root witness
- `SandboxClientLayer.test.ts` 若需要类型辅助，改成 `Service.ts / Types.ts` 的 internal witness，不再通过 root 拿宽类型

- [ ] **Step 2: 改 client/browser witness**

要求：
- `createSandboxClient` 不再通过 `@logixjs/sandbox` root 公开
- `SandboxClient.listKernels` 与 browser tests 改成 internal owner witness
- 不新增 migration-only 测试文件

- [ ] **Step 3: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-sandbox exec vitest run test/Client/SandboxClientLayer.test.ts test/Client/Client.TrialBoundary.test.ts test/Client/SandboxClient.listKernels.test.ts test/browser/sandbox-worker-smoke.test.ts test/browser/debug.sandbox-blob-import.test.ts test/browser/sandbox-worker-multi-kernel.test.ts test/browser/sandbox-worker-process-events.compat.test.ts test/browser/sandbox-worker-observable.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 root/subpath survivor set 仍过宽，或 `createSandboxClient / Types / Protocol / Service / Vite` 仍通过公开面可达

### Task 7: 消费 T3 合同到 sandbox package

**Files:**
- Modify: `packages/logix-sandbox/package.json`
- Modify: `packages/logix-sandbox/src/index.ts`
- Modify: `packages/logix-sandbox/src/Client.ts`
- Modify: `packages/logix-sandbox/src/Protocol.ts`
- Modify: `packages/logix-sandbox/src/Service.ts`
- Modify: `packages/logix-sandbox/src/Types.ts`
- Modify: `packages/logix-sandbox/src/Vite.ts`
- Modify: `packages/logix-sandbox/tsup.config.ts`
- Modify: `packages/logix-sandbox/test/Client/SandboxClientLayer.test.ts`
- Modify: `packages/logix-sandbox/test/Client/SandboxClient.listKernels.test.ts`
- Modify: `packages/logix-sandbox/test/browser/sandbox-worker-smoke.test.ts`
- Modify: `packages/logix-sandbox/test/browser/debug.sandbox-blob-import.test.ts`
- Modify: `packages/logix-sandbox/test/browser/sandbox-worker-multi-kernel.test.ts`
- Modify: `packages/logix-sandbox/test/browser/sandbox-worker-process-events.compat.test.ts`
- Modify: `packages/logix-sandbox/test/browser/sandbox-worker-observable.test.ts`
- Modify: `examples/logix-sandbox-mvp/src/RuntimeProvider.tsx`
- Modify: `examples/logix-sandbox-mvp/src/sandboxClientConfig.ts`
- Modify: `examples/logix-sandbox-mvp/src/modules/SandboxLogic.ts`
- Modify: `examples/logix-sandbox-mvp/src/modules/SandboxModule.ts`
- Modify: `examples/logix-sandbox-mvp/src/ir/IrLogic.ts`
- Modify: `examples/logix-sandbox-mvp/src/pages/_shared/SandboxShell.tsx`
- Modify: `examples/logix-sandbox-mvp/src/pages/runtime-alignment-lab/UiIntentView.tsx`
- Modify: `apps/logix-galaxy-fe/src/RuntimeProvider.tsx`
- Modify: `apps/docs/content/docs/guide/recipes/public-submodules.md`
- Modify: `apps/docs/content/docs/guide/recipes/public-submodules.cn.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 收口 package exports**

要求：
- `package.json` 与 `publishConfig.exports` 只保留 `.`、`./vite`、`./package.json`
- 删除 `./Client`、`./Protocol`、`./Service`、`./Types`、`./Vite`
- `src/index.ts` 只保留 `SandboxClientTag` 与 `SandboxClientLayer`

- [ ] **Step 2: internalize browser client residue**

要求：
- `createSandboxClient`、`Protocol`、`Types`、`RunResult`、`MockManifest`、`KernelRegistry` 等退出公开面
- 包内 tests 直接改到 internal owner 或相对源码入口
- `./vite` 继续作为唯一公开子路径

- [ ] **Step 3: 迁移 repo consumers**

要求：
- `examples/logix-sandbox-mvp` 与 `apps/logix-galaxy-fe` 继续只从 root 消费 `SandboxClientLayer / SandboxClientTag`
- 其余旧公开类型改成本地 owner types 或局部 schema，不再从 `@logixjs/sandbox` root 拿
- `public-submodules` 文档删除 `sandbox/client` 与 `sandbox/service` 的迁移示例

- [ ] **Step 4: 回写 authority 与总提案**

要求：
- `runtime/09` 保持“sandbox 只消费统一 control plane”的口径，并把 exact survivor set 收窄到 host wiring + vite
- 总提案里把 `T3` 的“未完全落实”描述改到当前实际剩余项

- [ ] **Step 5: 再跑 T3 focused tests**

Run:
```bash
pnpm -C packages/logix-sandbox exec vitest run test/Client/SandboxClientLayer.test.ts test/Client/Client.TrialBoundary.test.ts test/Client/SandboxClient.listKernels.test.ts test/browser/sandbox-worker-smoke.test.ts test/browser/debug.sandbox-blob-import.test.ts test/browser/sandbox-worker-multi-kernel.test.ts test/browser/sandbox-worker-process-events.compat.test.ts test/browser/sandbox-worker-observable.test.ts
```

Expected:
PASS

## Chunk 5: T4 Devtools

### Task 8: 先把 devtools 公开 wrapper witness 改成红灯

**Files:**
- Modify: `packages/logix-devtools-react/test/FieldGraphView/FieldGraphView.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/devtools-react.integration.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/devtools-fractal-runtime.integration.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/OverviewStrip.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/devtools-toggle.integration.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/EffectOpTimelineView.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/ProcessEvents.integration.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/TimeTravel.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/ConvergeTimelinePane.test.tsx`

- [ ] **Step 1: 改 public-wrapper witness**

要求：
- 不再通过 `src/LogixDevtools.tsx`、`src/DevtoolsLayer.tsx`、`src/FieldGraphView.tsx` 证明 public surface 存在
- `FieldGraphView.test.tsx` 改成 internal graph owner proof
- integration tests 改成 internal shell / snapshot owner proof

- [ ] **Step 2: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-devtools-react exec vitest run test/FieldGraphView/FieldGraphView.test.tsx test/internal/devtools-react.integration.test.tsx test/internal/devtools-fractal-runtime.integration.test.tsx test/internal/OverviewStrip.test.tsx test/internal/devtools-toggle.integration.test.tsx test/internal/EffectOpTimelineView.test.tsx test/internal/ProcessEvents.integration.test.tsx test/internal/TimeTravel.test.tsx test/internal/ConvergeTimelinePane.test.tsx
```

Expected:
- 至少一项失败
- 失败原因指向 `index.tsx`、`LogixDevtools.tsx`、`DevtoolsLayer.tsx`、`FieldGraphView.tsx` 仍承担 public wrapper / root side effect

### Task 9: 消费 T4 合同到 devtools package

**Files:**
- Modify: `packages/logix-devtools-react/package.json`
- Modify: `packages/logix-devtools-react/src/index.tsx`
- Modify: `packages/logix-devtools-react/src/LogixDevtools.tsx`
- Modify: `packages/logix-devtools-react/src/DevtoolsLayer.tsx`
- Modify: `packages/logix-devtools-react/src/FieldGraphView.tsx`
- Modify: `packages/logix-devtools-react/tsup.config.ts`
- Modify: `packages/logix-devtools-react/test/FieldGraphView/FieldGraphView.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/devtools-react.integration.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/devtools-fractal-runtime.integration.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/OverviewStrip.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/devtools-toggle.integration.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/EffectOpTimelineView.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/ProcessEvents.integration.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/TimeTravel.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/ConvergeTimelinePane.test.tsx`
- Modify: `examples/logix-react/src/App.tsx`
- Modify: `examples/logix-react/package.json`
- Modify: `examples/logix-react/vite.config.ts`
- Modify: `examples/logix-react/src/style.css`
- Modify: `apps/logix-galaxy-fe/src/App.tsx`
- Modify: `apps/logix-galaxy-fe/package.json`
- Modify: `apps/docs/content/docs/guide/advanced/debugging-and-devtools.md`
- Modify: `apps/docs/content/docs/guide/advanced/debugging-and-devtools.cn.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 归零 package public surface**

要求：
- `package.json` 与 `publishConfig.exports` 删除 `.`
- 删除 `./*` wildcard
- `index.tsx` 退出 public surface，不再承担 root side effect

- [ ] **Step 2: internalize wrapper files**

要求：
- `LogixDevtools.tsx`、`DevtoolsLayer.tsx`、`FieldGraphView.tsx` 若保留，只能服务包内测试或后续 internal owner
- internal tests 改到 internal ui / snapshot / graph 落点
- 样式注入改成内部显式接线，不再由 root import 自动触发

- [ ] **Step 3: 清理 repo/docs fallout**

要求：
- `examples/logix-react` 与 `apps/logix-galaxy-fe` 移除 `@logixjs/devtools-react` 依赖与动态导入
- `debugging-and-devtools` 中关于官方公开包 `<LogixDevtools />` 的内容移除或改成 internal / future-toolkit 说明
- `examples/logix-react/src/style.css` 删除“包自带样式”这类公开承诺

- [ ] **Step 4: 回写总提案**

要求：
- `T4` 的“未完全落实”描述改到当前实际剩余项

- [ ] **Step 5: 再跑 T4 focused tests**

Run:
```bash
pnpm -C packages/logix-devtools-react exec vitest run test/FieldGraphView/FieldGraphView.test.tsx test/internal/devtools-react.integration.test.tsx test/internal/devtools-fractal-runtime.integration.test.tsx test/internal/OverviewStrip.test.tsx test/internal/devtools-toggle.integration.test.tsx test/internal/EffectOpTimelineView.test.tsx test/internal/ProcessEvents.integration.test.tsx test/internal/TimeTravel.test.tsx test/internal/ConvergeTimelinePane.test.tsx
```

Expected:
PASS

## Chunk 6: Final Verification

### Task 10: 做批次收口验证

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 运行批次 focused tests**

Run:
```bash
pnpm -C packages/logix-cli exec vitest run test/Args/Args.cli-config-prefix.test.ts test/Integration/check.command.test.ts test/Integration/trial.command.test.ts test/Integration/compare.command.test.ts test/Integration/output-contract.test.ts test/Integration/cli.describe-json.test.ts test/Integration/cli.ir-validate.fields.test.ts test/Integration/cli.ir-diff.fields.test.ts
pnpm -C packages/logix-test exec vitest run test/TestProgram/TestProgram.test.ts test/TestProgram/Scenarios.test.ts test/TestRuntime/TestRuntime.ControlPlaneContract.test.ts test/TestRuntime/runtime_service_pattern.test.ts test/Execution/ExecutionResult.test.ts test/Vitest/vitest_program.test.ts
pnpm -C examples/logix-react exec vitest run test/module-flows.integration.test.ts
pnpm -C packages/logix-react exec vitest run test/integration/runtime-yield-to-host.integration.test.tsx
pnpm -C packages/logix-sandbox exec vitest run test/Client/SandboxClientLayer.test.ts test/Client/Client.TrialBoundary.test.ts test/Client/SandboxClient.listKernels.test.ts test/browser/sandbox-worker-smoke.test.ts test/browser/debug.sandbox-blob-import.test.ts test/browser/sandbox-worker-multi-kernel.test.ts test/browser/sandbox-worker-process-events.compat.test.ts test/browser/sandbox-worker-observable.test.ts
pnpm -C packages/logix-devtools-react exec vitest run test/FieldGraphView/FieldGraphView.test.tsx test/internal/devtools-react.integration.test.tsx test/internal/devtools-fractal-runtime.integration.test.tsx test/internal/OverviewStrip.test.tsx test/internal/devtools-toggle.integration.test.tsx test/internal/EffectOpTimelineView.test.tsx test/internal/ProcessEvents.integration.test.tsx test/internal/TimeTravel.test.tsx test/internal/ConvergeTimelinePane.test.tsx
pnpm typecheck
```

Expected:
- 全部 PASS

- [ ] **Step 2: 回写 Batch 4 实施结果**

要求：
- 总提案里把 `Batch 4` 状态改成 `implemented`
- `T1 / T2 / T3 / T4` 从“已冻结但未完全落实”移出，或缩到确实未做的最小剩余项
- “已实施”部分补上本批实际完成项

- [ ] **Step 3: 运行最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md docs/ssot/runtime/09-verification-control-plane.md apps/docs/content/docs/guide/recipes/public-submodules.md apps/docs/content/docs/guide/recipes/public-submodules.cn.md apps/docs/content/docs/guide/advanced/debugging-and-devtools.md apps/docs/content/docs/guide/advanced/debugging-and-devtools.cn.md
```

Expected:
`无输出`
