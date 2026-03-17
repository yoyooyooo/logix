# 2026-03-19 · R-2 · Policy Surface Design 收口（R2-A / R2-B）

> worktree: `agent/v4-perf-r2-policy-surface-design`
>
> 范围：实现前设计收口，形成可直接开实施线的设计包。
>
> 约束：不回到旧 `txn-lanes` queue-side 微调；在设计闭环前不直接 churn public API 实现；当前默认仅 docs/spec 落盘。

## 0. 结论（硬裁决）

1. 当前建议：不开 `R-2` 实施线。
2. 触发后优先级：`R2-A` 优先于 `R2-B`。
3. 本文交付：`R2-A` 与 `R2-B` 的 implementation-ready 方案与落点清单，触发成立后可直接按本文开线。

不开线的理由（与现有 perf 口径一致）：
- `txnLanes` 当前已从默认 blocker probe 队列移出，缺少新的产品级 SLA 或新的 native-anchor 证据时，策略层收敛的收益不足以覆盖 churn 风险。
- `R-2` 的价值建立在“对外需要可解释的策略语义”这一前提上。前提不成立时，推进只会固化过早命名并制造二次改口。

本文仍然给出 implementation-ready 方案，目的为触发成立时降低启动成本。

## 1. 背景与问题定义

### 1.1 当前事实（代码与诊断口径）

当前 `TxnLanePolicy` 解析发生在 `makeResolveTxnLanePolicy`，并在 `trace:txn-lane` 证据事件中对外暴露以下字段集合：
- `policy.enabled`
- `policy.overrideMode`（`forced_off | forced_sync`）
- `policy.configScope`（`provider | runtime_module | runtime_default | builtin`）
- `policy.budgetMs/debounceMs/maxLagMs/allowCoalesce/yieldStrategy/queueMode`

覆盖优先级当前写死为：`provider > runtime_module > runtime_default > builtin`。

### 1.2 当前痛点

痛点 A：对外配置还是“旋钮集合”语义，容易误配，讨论 SLA 时缺少稳定术语。

痛点 B：诊断口径只给出一个 `configScope`，无法解释：
- “到底是谁覆盖了谁”
- “哪一层覆盖了哪些字段”
- “overrideMode 生效时是否还要看 enabled”

痛点 C：当前 scope 语义存在歧义风险：`moduleRuntimeDefaultPatch` 与 `runtimeConfig` 都标记为 `runtime_default`，排障时不利于定位来源。

## 2. 目标与非目标

### 2.1 目标

`R2-A`（Policy Surface）：
- 把 TxnLanes 从旋钮集合提升到“策略档位 + 可解释来源”的语义层。
- 把“推荐默认策略”写成可演进的 contract，避免业务侧在无上下文前提下拼装旋钮组合。
- 保持 runtime 核心执行路径与队列算法不动，仅新增映射层与校验层。

`R2-B`（Diagnostics Contract）：
- 收敛覆盖优先级与诊断事件口径，提供稳定且可序列化的解释字段。
- 让 Devtools/证据包在无需读代码的情况下回答“当前策略为什么是这样”。
- 为 `R2-A` 的后续 API 改动提供可解释基础，降低迁移期排障成本。

### 2.2 非目标

- 不回到 `txn-lanes` 的 queue-side 微调，不做非必要的 time slicing 调参。
- 不引入第二套并行真相源，诊断解释以统一最小 IR 与 Debug 事件为准。
- 不在本轮直接改动 React controlplane 与 external-store 相关文件。

## 3. `R2-A` 高层 Policy Surface（implementation-ready）

### 3.1 API 设计裁决

结论：`R2-A` 需要 public API 变动，属于必选项。

原因：现有 `TxnLanesPatch` 表达力集中在“旋钮”，缺少“策略语义”这一稳定层。仅靠文档约定无法达成统一口径与可解释性目标。

### 3.2 提议的 public surface（vNext）

目标设计：业务侧优先使用策略档位，必要时再显式进入 tuning。

提议新增类型（落点：`packages/logix-core/src/Runtime.ts` 对外导出类型，实际定义放 `internal/runtime/core/env.ts`）：

```ts
export type TxnLanePolicyTier =
  | 'off'          // 强制关闭 lanes，等价于 FIFO
  | 'sync'         // 强制同步提交（诊断/止血）
  | 'interactive'  // 偏交互，控制 lag 与 budget，默认允许 coalesce
  | 'throughput'   // 偏吞吐，允许更长 slice，牺牲交互延迟

export type TxnLanePolicyTuning = {
  readonly budgetMs?: number
  readonly debounceMs?: number
  readonly maxLagMs?: number
  readonly allowCoalesce?: boolean
  readonly yieldStrategy?: 'baseline' | 'inputPending'
}

export type TxnLanePolicyInput =
  | { readonly tier: TxnLanePolicyTier }
  | { readonly tier: TxnLanePolicyTier; readonly tuning: TxnLanePolicyTuning }

export type TxnLanePolicyByModuleId = Readonly<Record<string, TxnLanePolicyInput>>

export interface RuntimeStateTransactionOptionsVNext {
  readonly txnLanePolicy?: TxnLanePolicyInput
  readonly txnLanePolicyOverridesByModuleId?: TxnLanePolicyByModuleId
}
```

命名说明：
- `tier` 为主语义，必须稳定，面向 SLA 讨论与文档。
- `tuning` 为可选补丁层，用于极少数需要显式覆盖参数的场景。

迁移说明策略：
- forward-only 模式下允许破坏性变更。
- 不写兼容层，不提供弃用期。
- 必须提供迁移说明与可机械替换的 mapping 表。

### 3.3 tier 到现有内部旋钮的映射（contract）

落点：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts` 的 normalize 映射层，保持现有核心消费字段不变。

映射建议（可在实施线按证据微调，但字段含义与 tier 语义必须保持一致）：

```ts
// builtin defaults remain the same as today when tier=interactive without tuning

off:
  overrideMode = 'forced_off'
  enabled = false

sync:
  overrideMode = 'forced_sync'
  enabled = false

interactive:
  enabled = true
  budgetMs = 1
  maxLagMs = 50
  debounceMs = 0
  allowCoalesce = true
  yieldStrategy = 'baseline' | 'inputPending' (建议默认 baseline，tuning 才切 inputPending)

throughput:
  enabled = true
  budgetMs = 4
  maxLagMs = 100
  debounceMs = 0
  allowCoalesce = true
  yieldStrategy = 'baseline'
```

校验规则（dev-only warn，prod 走 normalize）：
- `tier=off/sync` 时禁止同时指定 `tuning` 字段。
- `tuning` 只允许覆盖一小组字段，避免再次暴露完整旋钮面导致误配回潮。

### 3.4 覆盖层级与优先级（contract）

层级维持现有策略，并补齐字段命名，消除歧义：

- `builtin`：runtime 内置默认。
- `runtime_default`：`Runtime.make({ stateTransaction: { txnLanePolicy } })`。
- `runtime_module`：`Runtime.make({ stateTransaction: { txnLanePolicyOverridesByModuleId } })`。
- `provider_default`：Provider 层的 overrides default。
- `provider_module`：Provider 层的 overrides by moduleId。

优先级：`provider_module > provider_default > runtime_module > runtime_default > builtin`。

说明：此处把 provider 拆成 default 与 module，属于 `R2-B` 诊断口径的前置要求，`R2-A` 直接沿用。

### 3.5 实施落点与改动面（可执行清单）

实现文件落点（建议）：
- `packages/logix-core/src/internal/runtime/core/env.ts`
  - 新增 `TxnLanePolicyTier/TxnLanePolicyInput` 类型与 overrides 结构
  - 新增用于解析的 Tag 配置字段
- `packages/logix-core/src/Runtime.ts`
  - public options 替换为 `txnLanePolicy*` 字段
  - configValidation 增补校验与 dev-only warn
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
  - 新增 `tier -> patch` 映射
  - 解析时保留 cache，fingerprint 以“规范化后的结构”计算
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
  - 见 `R2-B`，补齐可解释字段，保持可序列化

最小验证命令（实施线门禁）：
```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts
```

成功门：
- `tier` 可在 runtime_default 与 runtime_module 两层稳定生效。
- `trace:txn-lane` 事件在相同输入下可复现，字段稳定且可序列化。
- 现有 lane 相关测试更新后全绿，新增 presets 覆盖测试通过。

失败门：
- 出现“同一 tier 在不同环境下含义变化”的漂移。
- 诊断事件无法回答“谁覆盖了谁”，排障成本未下降。

### 3.6 迁移说明（草案）

旧写法示例：

```ts
Runtime.make(root, {
  stateTransaction: {
    txnLanes: { enabled: true, budgetMs: 1, maxLagMs: 50 },
    txnLanesOverridesByModuleId: {
      UserList: { overrideMode: 'forced_off' },
    },
  },
})
```

新写法示例：

```ts
Runtime.make(root, {
  stateTransaction: {
    txnLanePolicy: { tier: 'interactive' },
    txnLanePolicyOverridesByModuleId: {
      UserList: { tier: 'off' },
    },
  },
})
```

机械替换 mapping：
- `txnLanes.overrideMode=forced_off` -> `{ tier: 'off' }`
- `txnLanes.overrideMode=forced_sync` -> `{ tier: 'sync' }`
- `txnLanes.enabled=true` 且无显式 overrideMode -> `{ tier: 'interactive', tuning: { budgetMs, maxLagMs, debounceMs, allowCoalesce, yieldStrategy } }`

## 4. `R2-B` 诊断口径收敛（implementation-ready）

字段级 contract 与实施门禁以 `docs/perf/archive/2026-03/2026-03-20-r2b-diagnostics-contract.md` 为准。本节保留为 R2 总包内的摘要与路由信息。

### 4.1 诊断契约目标

目标：在 `trace:txn-lane` 事件中提供稳定解释字段，满足以下问答：
- 当前有效策略来自哪一层覆盖。
- 覆盖优先级链路上有哪些候选，最后一次生效来自哪一项。
- 哪一层覆盖了哪些字段，最终每个字段由哪一层决定。

### 4.2 提议的稳定字段集合（Slim 可序列化）

字段集合、Slim 约束与语义裁决见 `docs/perf/archive/2026-03/2026-03-20-r2b-diagnostics-contract.md`，其中包含：
- `scope`（五层覆盖来源）
- `candidates`（固定顺序的候选链路）
- `writes/resolvedBy`（字段级归因）
- `fingerprint`（跨运行可对比）

### 4.3 覆盖链路的解释策略

覆盖解释以 `policy.explain` 与 `policy.fingerprint` 为中心，事件内不携带原始 patch，避免泄漏与体积膨胀。

### 4.4 实施落点与改动面（可执行清单）

实现文件落点（建议）：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
  - 把 `TxnLanePolicyScope` 拆分为 5 层，新增 provider_default 与 provider_module
  - 输出 explain 结构，供 ModuleRuntime 在需要时记录
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
  - 更新 `TxnLaneEvidence.policy` 字段，替换 `configScope`，引入 `effective/explain/fingerprint`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - 证据事件写入新的 explain 字段

最小验证命令（实施线门禁）：
```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.TransactionOverrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts
```

成功门：
- 相同输入配置下 `trace:txn-lane` 事件的 explain 字段可复现。
- 对任何 override 组合，事件可以明确回答最终生效 scope。

失败门：
- explain 字段引入非序列化 payload，触发 Debug downgrade。
- explain 字段体积膨胀导致 trace 事件显著增重。

## 5. 开线条件与路由建议

### 5.1 触发门（满足后可开线）

`R2-A` 的 trigger：
- 明确新增产品级 SLA，且该 SLA 需要对外 policy surface（业务侧需要可配置策略层）。
- 或新的 native-anchor 证据要求长期维护多档策略，并且需要文档与诊断使用同一套 tier 术语。

`R2-B` 的 trigger：
- clean/comparable 证据显示 lane 行为解释成本过高，排障效率下降。
- 或 devtools/diagnostics 链路出现无法判定覆盖来源的失真问题。

### 5.2 开线顺序建议

- SLA 明确且需要对外策略：直接开 `R2-A`，同时带上 `R2-B` 的诊断字段收敛，避免迁移期失真。
- 只出现诊断痛点，无对外策略诉求：只开 `R2-B`，为后续 `R2-A` 降风险。

## 6. 附录：现有实现与证据锚点

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`TxnLaneEvidence`）
- `docs/perf/2026-03-19-identify-txnlane-api.md`
- `docs/perf/06-current-head-triage.md`（仅引用，本文不改动）
