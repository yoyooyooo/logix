# Data Model: 079 保守自动补全 Platform-Grade 锚点声明（单一真相源）

> 本文件描述 `AutofillReport@v1` 的“概念数据模型”（人读），权威 schema 见：
>
> - `specs/079-platform-anchor-autofill/contracts/schemas/autofill-report.schema.json`

## Entities

### AnchorKind

锚点的种类（本特性覆盖的子集）：

- `services`：模块输入服务依赖锚点声明（`ModuleDef.services`）
- `dev.source`：定位锚点元数据（`module.dev.source` / `actionToken.source` 等）
- `imports`：装配依赖锚点声明（`ModuleImpl.implement({ imports })` 等；默认先 report-only）

### AnchorAutofillDecision

单个对象（如一个 Module 定义点）的补全决策：

```ts
type AnchorAutofillDecision =
  | { readonly kind: AnchorKind; readonly status: 'written'; readonly changes: unknown }
  | { readonly kind: AnchorKind; readonly status: 'skipped'; readonly reason: SkipReason }
```

### SkipReason

跳过原因必须可枚举（reason code 可用于门禁与解释）：

```ts
type SkipReason = {
  readonly code:
    | 'already_declared'
    | 'no_confident_usage'
    | 'dynamic_or_ambiguous_usage'
    | 'unresolvable_service_id'
    | 'unsafe_to_patch'
    | 'unsupported_shape'
    | 'missing_location'
  readonly message: string
  readonly details?: Record<string, unknown>
}
```

### AutofillReport

补全报告是唯一对外输出（机器可解析，Slim/JSON）：

```ts
type AutofillReport = {
  readonly schemaVersion: 1
  readonly kind: 'AutofillReport'
  readonly mode: 'report' | 'write'
  readonly runId: string
  readonly ok: boolean
  readonly summary: {
    readonly filesTouched: number
    readonly modulesWritten: number
    readonly modulesSkipped: number
    readonly reasons: ReadonlyArray<{ readonly code: SkipReason['code']; readonly count: number }>
  }
  readonly changes: ReadonlyArray<{
    readonly file: string
    readonly moduleId?: string
    readonly decisions: ReadonlyArray<AnchorAutofillDecision>
  }>
}
```

约束：

- 所有字段必须 JSON 可序列化。
- `summary.reasons` 必须稳定排序（按 code）。

## Invariants（确定性与幂等）

- 稳定排序：补全写入的集合（如 `services` 映射）必须稳定排序，保证可 diff。
- 去重：同一锚点候选在同一对象内必须去重。
- 幂等：同一输入重复运行，第二次应无新增差异；报告应稳定。
