# 2026-03-20 · R2-B · Diagnostics Contract 收敛（implementation-ready）

> worktree: `agent/v4-perf-r2b-diagnostics-contract`
>
> 唯一目标：把 `trace:txn-lane` 的诊断口径收成可直接开实施线的 contract。
>
> 约束：不 churn public API，不回到 `txn-lanes` queue-side 微调，只做诊断字段与可解释链路收敛，字段必须 Slim 且可序列化。

## 0. 结论（硬裁决）

本文件定义 `R2-B diagnostics contract` 的唯一口径，交付物是 `trace:txn-lane` 事件的字段级契约与实施门禁。实施线必须按本文件落地，不再允许从代码推断口径。

目标问答集，Devtools 与离线证据包必须可以用事件本体直接回答：
1. 最终生效策略来自哪一层覆盖。
2. 覆盖优先级链路上有哪些候选层参与比较，各层是否 present。
3. 哪一层覆盖了哪些字段，最终每个字段由哪一层决定。
4. 两次运行之间策略是否发生漂移，漂移来自哪一层。

关联基线：
- `docs/perf/archive/2026-03/2026-03-19-r2-policy-surface-design.md`：R2 总包，其中 R2-B 部分只保留摘要与路由。
- `docs/perf/2026-03-19-identify-txnlane-api.md`：R2 的 trigger 与开线顺序。

## 1. 当前事实（作为迁移基线）

当前 `trace:txn-lane` 的 evidence 类型为 `TxnLaneEvidence`，其中 `policy` 字段包含：
- `enabled`
- `overrideMode`（`forced_off | forced_sync`）
- `configScope`（`provider | runtime_module | runtime_default | builtin`）
- `budgetMs/debounceMs/maxLagMs/allowCoalesce/yieldStrategy/queueMode`

当前痛点集中在 `configScope` 粒度不足与覆盖解释缺失，导致无法回答“谁覆盖了谁”和“哪些字段来自哪一层”。

## 2. Contract 总览

`R2-B` 的落点是把 `TxnLaneEvidence.policy` 从“单一对象 + 粗粒度 scope”收敛为三段：
1. `effective`：最终生效策略的 Slim 可对比视图。
2. `explain`：覆盖解释，包含最终 scope 与候选链路。
3. `fingerprint`：稳定短字符串，用于跨运行对比与离线 diff。

约束：
- `trace:txn-lane` 仍走 `projectJsonValue` 投影，字段必须可序列化，避免 downgrade。
- `explain` 不能携带原始 patch 或大对象，只允许稳定枚举与短字符串。

## 3. 字段级契约

### 3.1 覆盖来源 `scope`

`configScope` 将被替换为 `scope`，并拆分 provider 为两层，避免歧义。

```ts
export type TxnLanePolicyScope =
  | 'provider_module'
  | 'provider_default'
  | 'runtime_module'
  | 'runtime_default'
  | 'builtin'
```

覆盖优先级必须固定为：
`provider_module > provider_default > runtime_module > runtime_default > builtin`

### 3.2 字段键集合 `TxnLanePolicyFieldKey`

为了稳定回答“哪些字段由哪一层决定”，每个候选层需要暴露写集合 `writes`，其元素只能来自固定枚举：

```ts
export type TxnLanePolicyFieldKey =
  | 'enabled'
  | 'overrideMode'
  | 'budgetMs'
  | 'debounceMs'
  | 'maxLagMs'
  | 'allowCoalesce'
  | 'yieldStrategy'
  | 'queueMode'
```

说明：
- `writes` 表示该层输入里显式提供了哪些字段。
- `writes` 不携带数值，数值对比依赖 fingerprint。

### 3.3 `TxnLaneEvidence.policy` 新形状

实施线需要把 `TxnLaneEvidence.policy` 收敛为以下结构。字段必须可序列化，禁止携带函数、Error、Context 等运行期对象。

```ts
export type TxnLanePolicyEffective = {
  readonly enabled: boolean
  readonly overrideMode?: 'forced_off' | 'forced_sync'
  readonly budgetMs: number
  readonly debounceMs: number
  readonly maxLagMs: number
  readonly allowCoalesce: boolean
  readonly yieldStrategy?: 'baseline' | 'inputPending'
  readonly queueMode?: 'fifo' | 'lanes'
}

export type TxnLanePolicyCandidate = {
  readonly scope: TxnLanePolicyScope
  readonly present: boolean
  readonly writes?: ReadonlyArray<TxnLanePolicyFieldKey>
  readonly fingerprint?: string
}

export type TxnLanePolicyExplain = {
  /**
   * 最终生效来源。
   * 约束：必须与 candidates 内的某个 scope 对应。
   */
  readonly scope: TxnLanePolicyScope

  /**
   * 候选链路。
   * 约束：固定长度 5，固定顺序按覆盖优先级从高到低，五层 scope 必须全部出现一次。
   */
  readonly candidates: ReadonlyArray<TxnLanePolicyCandidate>

  /**
   * 可选：字段级归因。
   * 若实现成本过高可以暂缺，但 candidates.writes 与 fingerprint 必须存在。
   */
  readonly resolvedBy?: Partial<Record<TxnLanePolicyFieldKey, TxnLanePolicyScope>>
}

export type TxnLaneEvidencePolicyV2 = {
  readonly effective: TxnLanePolicyEffective
  readonly explain: TxnLanePolicyExplain
  readonly fingerprint: string
}
```

覆盖解释的最低实现门：
- `explain.scope` 必须存在。
- `candidates` 必须固定五层，顺序稳定，`present=false` 用空对象表达。
- `present=true` 的候选必须带 `fingerprint`。

字段级归因的最低实现门：
- 若提供 `resolvedBy`，每个键必须引用五层之一，且必须与 resolver 的最终选择一致。

### 3.4 `effective` 的 override 语义裁决

为避免 Devtools 做二次推理引发口径漂移，`effective` 必须满足以下不变量：
- `overrideMode='forced_off'` 时，`effective.enabled` 必须为 `false`。
- `overrideMode='forced_sync'` 时，`effective.enabled` 必须为 `false`。
- `overrideMode` 存在时，Devtools 展示以 override 为主语义，enabled 只作一致性校验。

## 4. Fingerprint contract

### 4.1 目标

fingerprint 用于跨运行对比，必须满足：
- 与对象 key 顺序无关。
- 不包含 `instanceId/txnSeq/opSeq` 等运行期信息。
- 同一策略输入在同一版本下产出相同 fingerprint。
- 长度可控，建议小于 80 字符。

### 4.2 Canonical 输入格式

fingerprint 的规范化输入以 `TxnLanePolicyEffective` 为准，字段顺序固定，缺失字段用空串。

```txt
v1|ov=<overrideMode>|en=<0|1>|q=<queueMode>|b=<budgetMs>|d=<debounceMs>|l=<maxLagMs>|c=<0|1>|y=<yieldStrategy>
```

输出要求：
- 必须保留 `v1|` 前缀作为版本门。
- 实施线可选择直接使用 canonical 文本，或再套一层稳定 hash。是否 hash 属于实现细节，本 contract 不强制。

### 4.3 候选层 fingerprint

`candidates[i].fingerprint` 的计算规则与 `policy.fingerprint` 相同，但输入是该候选层的规范化有效策略视图。

约束：
- `present=false` 时 fingerprint 必须缺失。
- `present=true` 时 fingerprint 必须存在。

## 5. Devtools 与证据包落点

### 5.1 Devtools 展示最小要求

Devtools 需要提供两个视图：
- 单事件详情：展示 `effective`，同时展示 `explain.candidates` 表格。
- 聚合摘要：按 `moduleId + instanceId` 聚合最近 N 条，展示 `policy.fingerprint` 的漂移次数与最后一次 `explain.scope`。

单事件详情最小字段：
- `effective.overrideMode` 与 `effective.enabled`
- `explain.scope`
- `candidates` 至少显示 `scope/present/fingerprint`，可选显示 `writes`
- 若存在 `resolvedBy`，以字段级列表展示

### 5.2 离线证据包稳定性门

离线 export 必须保留 `trace:txn-lane` 的 `meta`，并满足：
- `candidates.length === 5`
- 五层 scope 都出现一次
- 顺序固定按覆盖优先级从高到低

## 6. 实施落点与门禁（可直接开线）

### 6.1 改动面（文件落点）

1. `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
   - 变更 `TxnLaneEvidence.policy` 为 `TxnLaneEvidencePolicyV2`。
   - 删除 `configScope`，引入 `effective/explain/fingerprint`。
2. `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
   - 将 scope 拆分为五层，构建 `explain.candidates` 与可选 `resolvedBy`。
   - 计算 `fingerprint`，严格遵守 canonical 规则。
3. `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
   - `trace:txn-lane` 事件写入新的 `policy` 结构。
4. `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts` 的投影链路
   - 验证新增字段不会触发 `non_serializable` downgrade。

### 6.2 最小验证命令（实施线门禁）

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.TransactionOverrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts
```

### 6.3 成功门

- 相同输入配置下，`trace:txn-lane` 的 `policy.explain` 与 fingerprint 可复现。
- 对任意 override 组合，事件本体可以回答最终生效 scope 与候选链路。
- `projectJsonValue` 投影不触发 `non_serializable` downgrade，或 downgrade 可定位且不影响 explain 主字段。

### 6.4 失败门

- `candidates` 长度或顺序不稳定，导致离线 diff 不可用。
- fingerprint 依赖对象遍历顺序或包含运行期信息，导致跨运行不可对比。
- explain 引入体积膨胀，导致频繁 `oversized` downgrade。

## 7. 与 R2-A 的边界

本 contract 不引入 `tier` 等策略语义字段，也不定义 tier 到旋钮的映射。若后续 `R2-A` 开线，需要新增策略语义字段，应通过扩展 `effective` 的可选字段实现，并保持 fingerprint 的版本门推进，不回写修改 `v1` 语义。

