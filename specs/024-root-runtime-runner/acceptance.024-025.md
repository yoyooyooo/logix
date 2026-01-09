# Acceptance（上帝视角验收）：024 + 025

Date: 2025-12-25  
Update: 2025-12-25（已执行 `specs/025-ir-reflection-loader/tasks.md` 的 `T060`）
Targets:

- `specs/024-root-runtime-runner/spec.md`
- `specs/025-ir-reflection-loader/spec.md`

## 结论摘要

- 024（Root Runtime Runner）：PASS（FR-001..013 / NFR-001..007 / SC-001..010 全覆盖）
- 025（IR Reflection Loader）：PASS（FR-001..011 / NFR-001..005 / SC-001..006 全覆盖）

## 漂移 / 缺口矩阵（仅列非 PASS）

（无）

## 024 · Root Runtime Runner（逐条覆盖）

Evidence（实现/验证主入口）：

- 实现：`packages/logix-core/src/Runtime.ts`、`packages/logix-core/src/internal/runtime/runner/ProgramRunner.ts`
- 释放收束：`packages/logix-core/src/internal/runtime/runner/ProgramRunner.closeScope.ts`
- 错误分类：`packages/logix-core/src/internal/runtime/runner/ProgramRunner.errors.ts`
- 测试：`packages/logix-core/test/Runtime.runProgram.*.test.ts`、`packages/logix-core/test/Runtime.openProgram.*.test.ts`
- 文档：`apps/docs/content/docs/api/core/runtime.md`、`docs/ssot/runtime/logix-core/api/05-runtime-and-runner.md`
- 性能证据：`pnpm perf bench:024:boot`、`specs/024-root-runtime-runner/perf.md`

| Code | Type | Status | Evidence / Verification |
|---:|---|---|---|
| FR-001 | FR | PASS | `packages/logix-core/src/Runtime.ts`（`openProgram/runProgram`） |
| FR-002 | FR | PASS | `packages/logix-core/src/internal/runtime/runner/ProgramRunner.ts`（boot 触碰 root tag）+ `packages/logix-core/test/Runtime.runProgram.basic.test.ts` |
| FR-003 | FR | PASS | `packages/logix-core/src/internal/runtime/runner/ProgramRunner.closeScope.ts` + `packages/logix-core/test/Runtime.runProgram.dispose.test.ts` |
| FR-004 | FR | PASS | `packages/logix-core/src/Runtime.ts`（`runProgram(root, main, options?)`）+ `packages/logix-core/test/Runtime.runProgram.exitCondition.test.ts` |
| FR-005 | FR | PASS | `packages/logix-core/src/internal/runtime/runner/ProgramRunner.context.ts` + `packages/logix-core/test/Runtime.runProgram.handleExtend.test.ts` |
| FR-006 | FR | PASS | `packages/logix-core/test/Runtime.openProgram.multiRoot.isolated.test.ts` |
| FR-007 | FR | PASS | `apps/docs/content/docs/api/core/runtime.md`（显式退出条件说明） |
| FR-008 | FR | PASS | `packages/logix-test/src/api/TestProgram.ts`（复用 `Runtime.openProgram`）+ `specs/024-root-runtime-runner/tasks.md`（T022/T023/T035） |
| FR-009 | FR | PASS | `packages/logix-core/test/Runtime.runProgram.onError.test.ts` |
| FR-010 | FR | PASS | `packages/logix-core/test/Runtime.runProgram.disposeTimeout.test.ts` |
| FR-011 | FR | PASS | `packages/logix-core/test/Runtime.runProgram.signals.test.ts` |
| FR-012 | FR | PASS | `packages/logix-core/test/Runtime.runProgram.args.test.ts` |
| FR-013 | FR | PASS | `packages/logix-core/test/Runtime.runProgram.exitCode.test.ts`、`packages/logix-core/test/Runtime.runProgram.reportError.test.ts` |
| NFR-001 | NFR | PASS | `packages/logix-core/src/Runtime.ts`（strict by default 入口） |
| NFR-002 | NFR | PASS | `packages/logix-core/src/internal/runtime/runner/ProgramRunner.errors.ts`（Boot/Main/Dispose 分类） |
| NFR-003 | NFR | PASS | `packages/logix-core/src/internal/runtime/runner/ProgramRunner.errors.ts`（`moduleId/instanceId`） |
| NFR-004 | NFR | PASS | `packages/logix-core/src/internal/runtime/runner/ProgramRunner.ts`（`TaskRunner.isInSyncTransaction()` guard）+ `packages/logix-core/test/Runtime.runProgram.transactionGuard.test.ts` |
| NFR-005 | NFR | PASS | `apps/docs/content/docs/api/core/runtime.md` + `docs/ssot/runtime/logix-core/api/05-runtime-and-runner.md` |
| NFR-006 | NFR | PASS | `packages/logix-test/src/api/TestProgram.ts`（不复制 boot/释放） |
| NFR-007 | NFR | PASS | `specs/024-root-runtime-runner/perf.md` |
| SC-001 | SC | PASS | `specs/024-root-runtime-runner/quickstart.md` |
| SC-002 | SC | PASS | `packages/logix-core/test/Runtime.runProgram.dispose.test.ts` |
| SC-003 | SC | PASS | `packages/logix-test/src/api/TestProgram.ts` + `packages/logix-core/test/Runtime.runProgram.basic.test.ts` |
| SC-004 | SC | PASS | `packages/logix-test/src/*`（新模型）+ `examples/logix-react/*`（用例口径修复） |
| SC-005 | SC | PASS | `specs/024-root-runtime-runner/perf.md` |
| SC-006 | SC | PASS | `packages/logix-core/test/Runtime.runProgram.errorCategory.test.ts` |
| SC-007 | SC | PASS | `packages/logix-core/test/Runtime.openProgram.multiRoot.isolated.test.ts` |
| SC-008 | SC | PASS | `packages/logix-core/test/Runtime.runProgram.disposeTimeout.test.ts` |
| SC-009 | SC | PASS | `packages/logix-core/test/Runtime.runProgram.signals.test.ts` |
| SC-010 | SC | PASS | `packages/logix-core/test/Runtime.runProgram.exitCode.test.ts` |

## 025 · IR Reflection Loader（逐条覆盖）

Evidence（实现/验证主入口）：

- Reflection：`packages/logix-core/src/Reflection.ts`、`packages/logix-core/src/internal/reflection/*`
- Trial run：`packages/logix-core/src/internal/observability/trialRunModule.ts`
- 测试：`packages/logix-core/test/Reflection.*.test.ts`、`packages/logix-core/test/Observability.trialRunModule.*.test.ts`
- 性能证据：`pnpm perf bench:025:trialRunModule`、`specs/025-ir-reflection-loader/perf.md`

| Code | Type | Status | Evidence / Verification |
|---:|---|---|---|
| FR-001 | FR | PASS | `packages/logix-core/src/Reflection.ts` + `packages/logix-core/test/Reflection.extractManifest.deterministic.test.ts` |
| FR-002 | FR | PASS | `packages/logix-core/src/internal/reflection/manifest.ts`（ModuleDescriptor 投影） |
| FR-003 | FR | PASS | `packages/logix-core/test/Reflection.extractManifest.deterministic.test.ts` + `packages/logix-core/src/internal/reflection/digest.ts` |
| FR-004 | FR | PASS | `packages/logix-core/test/Reflection.extractManifest.composedModule.test.ts` |
| FR-005 | FR | PASS | `packages/logix-core/src/internal/runtime/runner/ProgramRunner.kernel.ts` + `packages/logix-core/src/internal/observability/trialRunModule.ts`（trial run 复用共享 boot/Scope/identity 内核） |
| FR-006 | FR | PASS | `packages/logix-core/test/Observability.trialRunModule.missingService.test.ts` / `...missingConfig.test.ts` |
| FR-007 | FR | PASS | `packages/logix-core/src/internal/observability/trialRunModule.ts`（MissingDependency 归因） |
| FR-008 | FR | PASS | Reflection 逻辑不接入热路径：`packages/logix-core/src/internal/reflection/*`（按需调用） |
| FR-009 | FR | PASS | `packages/logix-core/src/internal/reflection/diff.ts` + `packages/logix-core/test/Reflection.diffManifest.test.ts` |
| FR-010 | FR | PASS | `packages/logix-core/test/Reflection.exportStaticIr.basic.test.ts` |
| FR-011 | FR | PASS | `packages/logix-core/src/internal/observability/trialRunModule.ts`（失败尽量携带 environment/manifest） |
| NFR-001 | NFR | PASS | `specs/025-ir-reflection-loader/perf.md`（trialRun 基线；非热路径） |
| NFR-002 | NFR | PASS | `packages/logix-core/test/Observability.trialRunModule.runId.test.ts` + `packages/logix-core/src/internal/observability/runSession.ts` |
| NFR-003 | NFR | PASS | `packages/logix-core/test/Observability.trialRunModule.trialRunTimeout.test.ts` / `...disposeTimeout.test.ts` |
| NFR-004 | NFR | PASS | `packages/logix-core/test/Observability.trialRunModule.scopeDispose.test.ts` |
| NFR-005 | NFR | PASS | `packages/logix-core/test/Observability.trialRunModule.runtimeServicesEvidence.test.ts` |
| SC-001 | SC | PASS | `packages/logix-core/test/Reflection.extractManifest.deterministic.test.ts` |
| SC-002 | SC | PASS | `packages/logix-core/test/Reflection.diffManifest.test.ts` |
| SC-003 | SC | PASS | `packages/logix-core/test/Observability.trialRunModule.missingConfig.test.ts` / `...missingService.test.ts` |
| SC-004 | SC | PASS | `packages/logix-core/test/Observability.trialRunModule.missingService.test.ts`（构建态缺失依赖归因） |
| SC-005 | SC | PASS | `specs/025-ir-reflection-loader/perf.md` |
| SC-006 | SC | PASS | `packages/logix-core/test/Reflection.exportStaticIr.basic.test.ts` |
