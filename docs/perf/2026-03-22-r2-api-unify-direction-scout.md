# 2026-03-22 · R-2 API unify direction scout（docs-only）

> 后续状态更新（2026-03-22 同日）：`R2-U` 已补齐 dated design package，当前结论更新为 `implementation-ready=false`；当前真正缺的是 `SLA-R2-*`、`Gap-R2-*`、`Gate-E` 开线裁决包，见 `docs/perf/2026-03-22-r2-u-policyplan-design-package.md`。

> worktree: `v4-perf.scout-r2-api-unify`  
> branch: `agent/v4-perf-scout-r2-api-unify`  
> scope: `docs/perf/**` + `specs/103-effect-v4-forward-cutover/perf/**`  
> do-not-touch: `packages/**` implementation

## 0. 任务目标与边界

本轮目标是从 `public API / control surface / runtime contract` 全局视角，给出一个比继续微优化更可能带来大收益的 `R-2` 类方向。

本轮硬约束：
- 不重做 `R2-A/R2-B` 已完成项。
- 不重复旧的 policy surface/diagnostics contract 包装。
- 不做“只解释 gate、没有架构收缩”的旧路线。
- 只提案，不实现。

## 1. 现状归因（为什么需要新的 R-2 方向）

基于以下已落盘事实：
- `docs/perf/2026-03-20-r2-public-api-proposal.md`
- `docs/perf/2026-03-21-r2-public-api-staging-plan.md`
- `docs/perf/archive/2026-03/2026-03-20-r2a-policy-surface-impl.md`
- `docs/perf/archive/2026-03/2026-03-20-r2-rollout-widening.md`
- `docs/perf/archive/2026-03/2026-03-20-r2-controlplane-synergy.md`

当前仍有三类结构税：

1. API 双族并存税  
`txnLanes*` 与 `txnLanePolicy*` 仍并存，runtime 通过 normalize + metadata 才能把两族输入拼回同一解析链路。

2. 运行期覆盖解析税  
覆盖优先级虽已标准化，但“候选层判断 + 字段级归因 + explain 构建”仍依赖运行期解析路径。

3. 契约传播税  
public 配置、resolver 中间态、diagnostics 事件三层契约仍需同步演进，后续每次扩展都要多点对齐。

这三类税共同决定：继续做小常数微调，收益天花板低；从契约层做收缩更有概率拿到跃迁收益。

## 2. 候选比较与唯一裁决

| 候选 | 核心动作 | 预期收益 | 风险 | 结论 |
| --- | --- | --- | --- | --- |
| A | 继续 widening（补更多 tier/resolvedBy 字段） | 中 | 维持双族输入和运行期解析税 | 不推荐 |
| B | 继续 gate 等待，不提供新的契约收缩方案 | 低 | 无法形成下一线 implementation 目标 | 不推荐 |
| C | `PolicyPlan` 契约重排，收缩 API 并前移解析到编译期 | 高 | 破坏性 API 迁移成本高 | **唯一推荐** |

唯一建议方向：`R2-U PolicyPlan contract reorder`。

## 3. `R2-U` 提案（只提案，不实现）

### 3.1 Public API 收缩

建议把对外入口收敛为单一契约：

```ts
type TxnLanePolicyPlanInput = {
  readonly profiles: Readonly<Record<string, TxnLanePolicyInput>>
  readonly binding: {
    readonly runtimeDefault: string
    readonly runtimeByModuleId?: Readonly<Record<string, string>>
    readonly providerDefault?: string
    readonly providerByModuleId?: Readonly<Record<string, string>>
  }
}

stateTransaction: {
  readonly txnLanePolicyPlan: TxnLanePolicyPlanInput
}
```

forward-only 假设下的 API 收缩目标：
- 移除 `txnLanes`
- 移除 `txnLanesOverridesByModuleId`
- 移除 `txnLanePolicy`
- 移除 `txnLanePolicyOverridesByModuleId`

### 3.2 Runtime contract 重排

把覆盖解析从热路径前移到启动期：

1. `Runtime.make` 编译 `PolicyPlan`，生成稳定编译产物：
   - `moduleId -> profileId`
   - `profileId -> effective policy`
   - `profileId -> explain/fingerprint`
2. 事务热路径只做 O(1) 查表，不再执行字段级 merge。
3. diagnostics 直接引用编译产物，避免每次事件重复归因计算。

### 3.3 Diagnostics contract 对齐

维持 `Slim + serializable`，同时把解释链路固定为：
- `effective`
- `scope`
- `profileId`
- `fingerprint`

`resolvedBy` 继续保留为可选增强字段，其来源改为编译产物，不在热路径重算。

## 4. 受影响模块（后续 implementation line 的主要落点）

- `packages/logix-core/src/Runtime.ts`
- `packages/logix-core/src/internal/runtime/core/env.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- `docs/ssot/runtime/logix-core/**` 与 `docs/perf/**` 的契约文档

## 5. 为什么值得后续单开实现线

1. 它直接针对结构税  
目标是消除双族输入与运行期覆盖解析税，不是继续加字段或做局部常数优化。

2. 它同时改善性能与可诊断性  
热路径查表更轻，诊断链路来源更稳定，二者由同一编译产物驱动。

3. 它适配 forward-only 与零存量用户假设  
可以一次性做破坏式收缩，用迁移说明替代兼容层，减少长期维护分叉。

## 6. 开线前门禁（沿用现有 R-2 gate）

仍保持 `Gate-A..E`：
1. `Gate-A` 新产品级 SLA 触发。
2. `Gate-B` widening 无法承接解释目标的证据触发。
3. `Gate-C` 可比 probe。
4. `Gate-D` 迁移材料冻结。
5. `Gate-E` 按 `09` 模板完成开线裁决并锁定单提交收口门。

## 7. 本轮结论

- 本轮为 docs-only scout，未进入实现。
- `R-2` 给出唯一推荐下一刀：`R2-U PolicyPlan contract reorder`。
- 当前状态维持 watchlist，等待 Gate-A/B 触发后再单开 implementation line。
