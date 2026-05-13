# Allowlist Ledger

## Purpose

记录 final cutover 中少量允许暂时保留的例外项。

## Policy

- 默认删除
- 默认预算为 `0`
- 只有满足以下条件才允许保留：
  - 有当前不可替代价值
  - 不构成第二真相源
  - 有明确 owner
  - 有明确退出条件
  - 有必要性证明与人类可读风险说明
  - 有明确 replacement path
  - 有 consumer-zero proof
  - 有 migration record
- `packages/logix-core/test/observability/**`、`packages/logix-test/test/**`、`packages/logix-sandbox/test/browser/**` 不得因为“只是测试或宿主封装”自动进入 allowlist

## Approved Entries

当前计划阶段没有预批准 allowlist 项，默认目标是空 allowlist。若实施阶段确需保留，必须新增真实条目，禁止复用占位说明。

### 2026-04-07 Final State

- 仍为 `0` 项
- `packages/logix-core/test/{Module,Logic,FieldKernel,Process,Link,Bound,internal,observability,TrialRunArtifacts,Reflection*.test.ts}`、`packages/logix-test/**`、`packages/logix-sandbox/test/browser/**` 的默认 `.implement()` 路径已清零
- `packages/logix-core/src/internal/runtime/{ModuleRuntime*,ProgramRunner*,BoundApiRuntime.ts,FlowRuntime.ts,Lifecycle.ts,Runtime.ts,index.ts}` 已删除或完成消费者迁移
- 未出现需要用 allowlist 兜底的 direct consumer / root export / CLI 默认路径残留

## Verification Snapshot

- `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit`
  - PASS
- `pnpm vitest run packages/logix-core/test/Contracts/RuntimeHotPathPolicy.test.ts packages/logix-core/test/internal/Runtime/AppRuntime.test.ts packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts packages/logix-core/test/internal/Flow/FlowRuntime.test.ts packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.SourceRuntime.test.ts`
  - PASS
- `rg -n '\\.implement\\(' packages/logix-core/test/{Module,Logic,FieldKernel,Process,Link,Bound,internal,observability,TrialRunArtifacts,Reflection*.test.ts} packages/logix-test packages/logix-sandbox/test/browser -g '*.ts' -g '*.tsx'`
  - ZERO HIT
- `rg -n "internal/runtime/(ModuleRuntime|ProgramRunner|BoundApiRuntime|FlowRuntime|Lifecycle|Runtime|index)(\\.ts|\\.js|\\*|)" packages/logix-core/src packages/logix-core/test -g '*.ts'`
  - ZERO HIT

## Entry Schema

| Path / Surface | Reason | Owner | Exit Condition | Proof Of Necessity | Replacement Path | Consumer-Zero Proof | Migration Record |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Gate

- 不允许存在缺 owner、缺 exit condition、缺必要性证明、缺 replacement path、缺 consumer-zero proof 或缺 migration record 的 allowlist 项。
- 不允许在进入代码实施前再保留占位行或待定预算。
- allowlist 项不得出现在 canonical docs、canonical examples、root exports、默认测试路径或 CLI 默认路径中。
- 若本表之外仍存在未解释残留，则 final cutover 不通过。
