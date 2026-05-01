# Shell Residue Ledger

## Purpose

记录 runtime shell、forwarding shell、legacy wrapper 与大文件拆解命中点。

## Allowed Final Dispositions

- `remove`
- `canonical-keep`
- `expert-only`
- `internal-backing-only`
- `allowlisted-temporary`

## Residue Classes

| Path / Surface | Kind | Current Role | Target Disposition | Owner | Exit Condition |
| --- | --- | --- | --- | --- | --- |
| `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts` | forwarding-shell | shell bridge | `remove` | `130` | 已删除；消费者已切到 `core/BoundApiRuntime.ts` |
| `packages/logix-core/src/internal/runtime/FlowRuntime.ts` | forwarding-shell | shell bridge | `remove` | `130` | 已删除；消费者已切到 `core/FlowRuntime.ts` |
| `packages/logix-core/src/internal/runtime/Lifecycle.ts` | forwarding-shell | shell bridge | `remove` | `130` | 已删除；零消费者 |
| `packages/logix-core/src/internal/runtime/ModuleRuntime*.ts` | forwarding-shell-group | shell bridge | `remove` | `130` | 已删除；消费者已切到 `core/ModuleRuntime*.ts` |
| `packages/logix-core/src/internal/runtime/ProgramRunner*.ts` | forwarding-shell-group | shell bridge | `remove` | `130` | 已删除；消费者已切到 `core/runner/*` |
| `packages/logix-core/src/internal/runtime/index.ts` | forwarding-shell | shell bridge | `remove` | `130` | 已删除；零消费者 |
| `packages/logix-core/src/internal/runtime/AppRuntime.ts` | runtime-shell-coordinator | shell bridge | `internal-backing-only` | `130` | role 明确后不得再外溢 |
| `packages/logix-core/src/internal/runtime/Runtime.ts` | runtime-shell-coordinator | shell bridge | `remove` | `130` | 已删除；`trialRunModule` 已改走 `AppRuntime` 组合层 |
| `packages/logix-core/src/internal/runtime/ModuleFactory.ts` | runtime-shell-coordinator | shell bridge | `internal-backing-only` | `130` | role 明确后不得再外溢 |
| `packages/logix-core/src/internal/evidence-api.ts` 中旧 trial/evidence facade | old-entry | control-plane bridge | `remove` | `130` | public trial helpers 已移出，文件只保留 evidence/export 协议 |
| `packages/logix-core/src/internal/reflection-api.ts` 中旧 verification facade | old-entry | control-plane bridge | `expert-only` | `130` | 一级入口统一后不再默认调用 |
| `packages/logix-core/src/Module.ts` 中 legacy carry-over wrapper | legacy-wrapper | migration bridge | `remove` | `130` | public & test consumers 清零 |
| `packages/logix-core/src/internal/runtime/ModuleFactory.ts` 中 `v3:` 叙事 | old-semantic-marker | stale semantic residue | `remove` | `130` | wording rewrite 完成 |
| `packages/logix-core/src/internal/runtime/core/module.ts` 中 `v3:` 叙事 | old-semantic-marker | stale semantic residue | `remove` | `130` | wording rewrite 完成 |
| `packages/logix-test/test/**` | direct-consumer residue | old default assembly path | `remove` | `130` | `.implement()` 默认路径清零 |
| `packages/logix-sandbox/test/browser/**` | direct-consumer residue | old default trial/assembly path | `remove` | `130` | default path 清零 |
| `packages/logix-core/test/observability/**` | direct-consumer residue | `Runtime.trial` + internal backing trial harness | `internal-backing-only` | `130` | root `Observability.trial*` 与 `.implement()` 默认路径清零 |
| `packages/logix-core/test/internal/Reflection/**` | direct-consumer residue | legacy manifest/export assembly path | `remove` | `130` | `.implement()` 默认路径清零 |
| `packages/logix-core/test/Reflection*.test.ts` | direct-consumer residue | old reflection-backed validation path | `expert-only` | `130` | default path 清零 |
| `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts` | oversized-core | runtime-core | `canonical-keep` | `130` | 拆解完成且壳层职责移除 |
| `packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts` | oversized-core | runtime-core | `canonical-keep` | `130` | 拆解完成且壳层职责移除 |
| `packages/logix-core/src/internal/runtime/core/StateTransaction.ts` | oversized-core | runtime-core | `canonical-keep` | `130` | 拆解完成且壳层职责移除 |

## Applied Batches

注：本节保留 2026-04-07 执行时的旧测试文件名、旧命令和旧字段名，作为 removal witness。它们不代表当前活跃口径；当前活跃口径统一为 `Program`，内部蓝图名为 `ProgramRuntimeBlueprint`。

### 2026-04-07

- `packages/logix-core/test/Module/ProgramRuntimeBlueprint.test.ts`
  - 默认装配已从 `Module.implement(...).impl` 切到 `Program.make(...) plus internal ProgramRuntimeBlueprint helper`
- `packages/logix-core/test/Module/Module.use.test.ts`
  - host / import 场景已切到 `Program.make(...)`
- `packages/logix-core/test/Module/Module.common-consumption.test.ts`
  - host common-consumption 场景已切到 `Program.make(...)`
- `pnpm vitest run packages/logix-core/test/Module/ProgramRuntimeBlueprint.test.ts packages/logix-core/test/Module/Module.use.test.ts packages/logix-core/test/Module/Module.common-consumption.test.ts`
  - PASS
- `rg -n '\\.implement\\(' packages/logix-core/test/Module/ProgramRuntimeBlueprint.test.ts packages/logix-core/test/Module/Module.use.test.ts packages/logix-core/test/Module/Module.common-consumption.test.ts`
  - ZERO HIT
- `packages/logix-core/test/Module/Module.logicUnitId.override.diagnostic.test.ts`
  - 默认装配已从 `Module.implement(...)` 切到 `Program.make(...)`
- `packages/logix-core/test/Module/Module.Manage.extendDef.test.ts`
  - factory 返回值已从 `module.implement(...)` 切到 `Program.make(...)`
- `packages/logix-core/test/Bound/BoundApi.RootResolveSugar.test.ts`
  - root resolve 样例已切到 `Program.make(...) plus internal ProgramRuntimeBlueprint helper`
- `packages/logix-core/test/Link/Link.test.ts`
  - link 样例已切到 `Program.make(...) plus internal ProgramRuntimeBlueprint helper`
- `pnpm vitest run packages/logix-core/test/Module/Module.logicUnitId.override.diagnostic.test.ts packages/logix-core/test/Module/Module.Manage.extendDef.test.ts packages/logix-core/test/Bound/BoundApi.RootResolveSugar.test.ts packages/logix-core/test/Link/Link.test.ts`
  - PASS
- `rg -n '\\.implement\\(' packages/logix-core/test/Module packages/logix-core/test/Bound packages/logix-core/test/Link -g '*.ts'`
  - ZERO HIT
- `packages/logix-core/test/Logic/**`
  - `LogicFields.Setup.Declare/Freeze/Perf.off/RemoveLogic` 与 `LogicFields.Evidence.Stability/Conflict` 已切到 `Program.make(...)`
- `packages/logix-core/test/FieldKernel/**`
  - `ConfigErrors`、`Converge*`、`Degrade`、`ReplayEventBridge`、`RuntimeIntegration`、`Validate.Incremental` 一批单 root 场景已切到 `Program.make(...)`
- `packages/logix-core/test/Process/**`
  - `AppScope.*`、`Concurrency.*`、`Diagnostics.Chain`、`ErrorPolicy.Supervise`、`Events.*`、`ModuleInstance.*`、`Trigger.*`、`UiSubtree.Restart` 已切到 `Program.make(...)` 或 `Program.make(...) plus internal ProgramRuntimeBlueprint helper`
- `pnpm vitest run packages/logix-core/test/Logic/LogicFields.Setup.Declare.test.ts packages/logix-core/test/Logic/LogicFields.Setup.Freeze.test.ts packages/logix-core/test/Logic/LogicFields.Evidence.Stability.test.ts packages/logix-core/test/Logic/LogicFields.Setup.Perf.off.test.ts`
  - PASS
- `pnpm vitest run packages/logix-core/test/Module.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergeDirtySet.test.ts packages/logix-core/test/FieldKernel/FieldKernel.RuntimeIntegration.test.ts packages/logix-core/test/Logic/LogicFields.Setup.RemoveLogic.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.EvidenceShape.test.ts packages/logix-core/test/FieldKernel/FieldKernel.Converge.ExecutionSemantics.test.ts`
  - PASS
- `pnpm vitest run packages/logix-core/test/FieldKernel/FieldKernel.ConfigErrors.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergeBudgetConfig.test.ts packages/logix-core/test/FieldKernel/FieldKernel.Degrade.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ReplayEventBridge.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.UnknownWriteCoverage.test.ts packages/logix-core/test/FieldKernel/FieldKernel.Validate.Incremental.test.ts`
  - PASS
- `pnpm vitest run packages/logix-core/test/Logic/LogicFields.Conflict.test.ts packages/logix-core/test/Process/Process.AppScope.Coordinate.test.ts packages/logix-core/test/Process/Process.Diagnostics.Chain.test.ts packages/logix-core/test/Process/Process.Events.History.Cap.test.ts`
  - PASS
- `pnpm vitest run packages/logix-core/test/Process/Process.Events.Budget.Enforcement.test.ts packages/logix-core/test/Process/Process.Trigger.PlatformEvent.test.ts packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.test.ts`
  - PASS
- `pnpm vitest run packages/logix-core/test/Process/Process.AppScope.DisposeStops.test.ts packages/logix-core/test/Process/Process.ModuleInstance.DisposeStops.test.ts packages/logix-core/test/Process/Process.ErrorPolicy.Supervise.test.ts`
  - PASS
- `pnpm vitest run packages/logix-core/test/Process/Process.AppScope.MissingDependency.test.ts packages/logix-core/test/Process/Process.ModuleInstance.MissingDependency.test.ts packages/logix-core/test/Process/Process.Trigger.Timer.test.ts`
  - PASS
- `pnpm vitest run packages/logix-core/test/Process/Process.ModuleInstance.Isolation.test.ts packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts`
  - PASS
- `pnpm vitest run packages/logix-core/test/Process/Process.Concurrency.DropVsParallel.test.ts packages/logix-core/test/Process/Process.Concurrency.LatestVsSerial.test.ts`
  - PASS
- `rg -n '\\.implement\\(' packages/logix-core/test/Process -g '*.ts'`
  - ZERO HIT
- `packages/logix-core/test/internal/Bound/Bound.test.ts`
  - imports / runtime 根装配已切到 `Program.make(...)` 与 `Program.make(...) plus internal ProgramRuntimeBlueprint helper`
- `pnpm vitest run packages/logix-core/test/internal/Bound/Bound.test.ts`
  - PASS
- `rg -n '\\.implement\\(' packages/logix-core/test/internal/Bound/Bound.test.ts -g '*.ts'`
  - ZERO HIT
- `packages/logix-core/test/internal/Runtime/Effects.DedupeAndDiagnostics.test.ts`
  - root program 装配已切到 `Program.make(...)`
- `packages/logix-core/test/internal/Runtime/Runtime.OperationSemantics.test.ts`
  - root program 装配已切到 `Program.make(...)`
- `pnpm vitest run packages/logix-core/test/internal/Runtime/Effects.DedupeAndDiagnostics.test.ts packages/logix-core/test/internal/Runtime/Runtime.OperationSemantics.test.ts`
  - PASS
- `packages/logix-core/test/internal/Runtime/DeclarativeLinkIR.boundary.test.ts`
  - declarative / blackbox link imports 图已切到 `Program.make(...) plus internal ProgramRuntimeBlueprint helper`
- `packages/logix-core/test/internal/Runtime/ModuleAsSource.tick.test.ts`
  - module-as-source imports 图已切到 `Program.make(...) plus internal ProgramRuntimeBlueprint helper`
- `pnpm vitest run packages/logix-core/test/internal/Runtime/DeclarativeLinkIR.boundary.test.ts packages/logix-core/test/internal/Runtime/ModuleAsSource.tick.test.ts`
  - PASS
- `packages/logix-core/test/internal/Runtime/AppRuntime.test.ts`
  - root / imported module 装配已切到 `Program.make(...)`
- `packages/logix-core/test/internal/Runtime/ModuleAsSource.recognizability.test.ts`
  - dynamic selector gate 场景已切到 `Program.make(...) plus internal ProgramRuntimeBlueprint helper`
- `packages/logix-core/test/Logic/LogicFields.DeterministicMerge.test.ts`
  - 双 mount-order 比较已切到 `Program.make(...)`
- `pnpm vitest run packages/logix-core/test/internal/Runtime/AppRuntime.test.ts packages/logix-core/test/internal/Runtime/ModuleAsSource.recognizability.test.ts packages/logix-core/test/Logic/LogicFields.DeterministicMerge.test.ts`
  - PASS
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.fixtures.ts`
  - shared fixture 已切到 `Program.make(...)`
- `packages/logix-core/test/FieldKernel/FieldKernel.Converge.TimeSlicing*.test.ts`
  - time-slicing root program 已切到 `Program.make(...)`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.{DecisionBudget,DecisionBudget.SmallSteps,AdmissionPolicy.boundary,CorrectnessInvariants,DiagnosticsLevels,DeterministicIds}.test.ts`
  - diagnostics / admission / decision-budget root program 已切到 `Program.make(...)`
- `packages/logix-core/test/FieldKernel/FieldKernel.Converge.Degrade{BudgetRollback,RuntimeErrorRollback}.test.ts`
  - degrade rollback root program 已切到 `Program.make(...)`
- `pnpm vitest run packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.fixtures.ts packages/logix-core/test/FieldKernel/FieldKernel.Converge.TimeSlicing.DefaultOff.test.ts packages/logix-core/test/FieldKernel/FieldKernel.Converge.TimeSlicing.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.DecisionBudget.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.DecisionBudget.SmallSteps.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.AdmissionPolicy.boundary.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.CorrectnessInvariants.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.DiagnosticsLevels.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.DeterministicIds.test.ts packages/logix-core/test/FieldKernel/FieldKernel.Converge.DegradeBudgetRollback.test.ts packages/logix-core/test/FieldKernel/FieldKernel.Converge.DegradeRuntimeErrorRollback.test.ts`
  - PASS
- `packages/logix-core/test/internal/Runtime/Action.UnknownFallback.test.ts`
  - root program 已切到 `Program.make(...)`
- `packages/logix-core/test/internal/Runtime/WorkflowProcess.SchedulingAlignment.test.ts`
  - host process graph 已切到 `Program.make(...)`
- `packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetDispatchBatchFusion.test.ts`
  - same-target dispatch imports 图已切到 `Program.make(...) plus internal ProgramRuntimeBlueprint helper`
- `packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetFanoutFusion.contract.test.ts`
  - same-target fanout imports 图已切到 `Program.make(...) plus internal ProgramRuntimeBlueprint helper`
- `pnpm vitest run packages/logix-core/test/internal/Runtime/Action.UnknownFallback.test.ts packages/logix-core/test/internal/Runtime/WorkflowProcess.SchedulingAlignment.test.ts packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetDispatchBatchFusion.test.ts packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetFanoutFusion.contract.test.ts`
  - PASS
- `packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetDispatchBatchFusion.Perf.case.ts`
  - perf imports 图已切到 `Program.make(...) plus internal ProgramRuntimeBlueprint helper`
- `packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetFanoutFusion.Perf.case.ts`
  - perf imports 图已切到 `Program.make(...) plus internal ProgramRuntimeBlueprint helper`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.{TimeSlicing.Lanes,TxnLanes.DefaultOn,TxnLanes.Overrides}.test.ts`
  - helper / root program 装配已切到 `Program.make(...)`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.ScopedValidate.test.ts`
  - scoped validate root program 已切到 `Program.make(...)`
- `packages/logix-core/test/internal/observability/TxnLaneEvidence.Schema.test.ts`
  - schema evidence helper 已切到 `Program.make(...)`
- `pnpm vitest run packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts packages/logix-core/test/internal/observability/TxnLaneEvidence.Schema.test.ts`
  - PASS
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.{DirtySetFromMutate,GenerationInvalidation,PlanCacheProtection,TransactionBoundary}.test.ts`
  - root program / fixture 装配已切到 `Program.make(...)`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStoreTrait.Runtime.test.ts`
  - external store runtime imports 图已切到 `Program.make(...) plus internal ProgramRuntimeBlueprint helper`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.{dispatchShell.Phases.Perf.light,dispatchOuterShell.PerfBoundary,transaction.AsyncEscapeGuard.Perf.off}.test.ts`
  - perf/probe root program 已切到 `Program.make(...)`
- `pnpm vitest run packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.DirtySetFromMutate.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.GenerationInvalidation.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.PlanCacheProtection.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.TransactionBoundary.test.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStoreTrait.Runtime.test.ts packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.AsyncEscapeGuard.Perf.off.test.ts`
  - PASS
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
  - `Program.stateTransaction` 覆盖测试已替换原 `ProgramRuntimeBlueprint.stateTransaction` 默认装配写法
- `pnpm vitest run packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
  - PASS
- `rg -c '\\.implement\\(' packages/logix-core/test/{Module,Logic,FieldKernel,Process,Link,Bound,internal} -g '*.ts' | awk -F: '{sum+=$2} END {print sum}'`
  - 当前剩余 `0`
- `rg -c '\\.implement\\(' packages/logix-core/test/{Module,Logic,FieldKernel,Process,Link,Bound,internal} -g '*.ts' | sort -t: -k2,2nr | sed -n '1,10p'`
  - `ZERO HIT`
- `rg -n '\\.implement\\(' packages/logix-core/test/{Module,Logic,FieldKernel,Process,Link,Bound,internal,observability,TrialRunArtifacts,Reflection*.test.ts} packages/logix-test packages/logix-sandbox/test/browser -g '*.ts' -g '*.tsx'`
  - `ZERO HIT`
- `packages/logix-core/src/internal/runtime/{Lifecycle.ts,index.ts,Runtime.ts}`
  - 零消费者 wrapper 已删除；`trialRunModule` 已改直接走 `AppRuntime` 组合层
- `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit`
  - PASS
- `rg -n "internal/runtime/(Lifecycle|Runtime|index)\\.js|internal/runtime/(Lifecycle|Runtime|index)$" packages/logix-core packages examples -g '*.ts' -g '*.tsx'`
  - ZERO HIT
- `packages/logix-core/src/internal/runtime/{BoundApiRuntime.ts,FlowRuntime.ts}`
  - wrapper 消费方已改到 `internal/runtime/core/*`，壳层文件已删除
- `packages/logix-core/src/internal/runtime/ProgramRunner*.ts`
  - 公开 `Runtime.ts` 已改到 `internal/runtime/core/runner/*`，wrapper 文件已删除
- `packages/logix-core/src/internal/runtime/ModuleRuntime*.ts`
  - 所有消费者已改到 `internal/runtime/core/ModuleRuntime*.ts`，wrapper 文件已删除
- `find packages/logix-core/src/internal/runtime -maxdepth 1 -type f | sort`
  - 当前仅剩 `AppRuntime.ts`、`ModuleFactory.ts`、`hotPathPolicy.ts`
- `pnpm vitest run packages/logix-core/test/internal/Flow/FlowRuntime.test.ts packages/logix-core/test/internal/Runtime/FlowRuntime.DiagnosticsBudgetEnvelope.test.ts packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.SourceRuntime.test.ts packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts packages/logix-core/test/internal/Module/Module.NoAsyncGuard.test.ts`
  - PASS
- `pnpm vitest run packages/logix-core/test/ReadQuery/ReadQuery.strictGate.test.ts packages/logix-core/test/internal/ExternalStore/ExternalStore.Sugars.test.ts packages/logix-core/test/internal/Runtime/TaskRunner.test.ts packages/logix-core/test/internal/Runtime/RuntimeKernel/RuntimeKernel.ServicesEvidence.test.ts packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.SourceRuntime.test.ts`
  - PASS
- `rg -n "internal/runtime/(BoundApiRuntime|FlowRuntime|Lifecycle|Runtime|index|ProgramRunner)\\.ts|internal/runtime/(BoundApiRuntime|FlowRuntime|Lifecycle|Runtime|index|ProgramRunner)" packages/logix-core/src packages/logix-core/test -g '*.ts'`
  - ZERO HIT
- `rg -n "internal/runtime/(ModuleRuntime|ProgramRunner|BoundApiRuntime|FlowRuntime|Lifecycle|Runtime|index)(\\.ts|\\.js|\\*|)" packages/logix-core/src packages/logix-core/test -g '*.ts'`
  - ZERO HIT
- `packages/logix-core/src/internal/runtime/ModuleFactory.ts`
  - `Link (formerly Orchestrator)` 等旧叙事已清理
- `packages/logix-core/src/internal/runtime/core/module.ts`
  - `v3 / PoC` 注释已改成当前语义
- `examples/logix/**`
  - 已清理一批 `PoC / v3` 注释残影
- `rg -n '\\bv3\\b|PoC|Orchestrator|placeholder' packages/logix-core/src/internal/runtime/ModuleFactory.ts packages/logix-core/src/internal/runtime/core/module.ts examples/logix -g '*.ts'`
  - ZERO HIT
- `pnpm vitest run packages/logix-core/test/Contracts/RuntimeHotPathPolicy.test.ts packages/logix-core/test/internal/Module/Module.NoAsyncGuard.test.ts packages/logix-core/test/internal/Runtime/AppRuntime.test.ts`
  - PASS
- `specs/130-runtime-final-cutover/quickstart.md`
  - 已补 forwarding shell 零命中 grep，作为 T037 的执行入口
- `packages/logix-core/test/Contracts/RuntimeHotPathPolicy.test.ts`
  - 已改为当前 shell / kernel / runner 分层断言，不再引用已删除 wrapper 路径

## Decomposition Notes

- `packages/logix-core/src/internal/runtime/core/{ModuleRuntime.impl.ts,WorkflowRuntime.ts,StateTransaction.ts}`
  - 本轮未触发；未进入 decomposition-only patch
- 命中超大文件时，必须先在本 ledger 下补互斥子模块清单、拆分顺序、验证命令。
- 同一任务不得同时做 decomposition-only 与语义 cutover。

## Gate

- `Target Disposition` 不得留空。
- 命中 `oversized-core` 时，不得直接在原大文件里堆叠新语义分支。
- pattern 级 residue 行必须在实施前展开为具体文件或测试套件行；泛 wildcard 不能充当最终 gate 证据。
