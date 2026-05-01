# Research: Runtime Final Cutover

## Decision 1: `130` 不是局部修补 spec，而是总控 final cutover spec

- `122/123/124` 已把公开主链、kernel hot path、verification control plane 的方向分别收口
- 继续分散做“第三波小修小补”只会把剩余过渡层再拖长一个周期
- 因此 `130` 直接承担总控职责：统一裁决 surviving surface、shell residue、control plane 一级入口和 direct consumers

## Decision 2: 最终策略采用“删除优先，allowlist 例外”

- 任何 forwarding shell、legacy wrapper、旧命名、limbo capability，默认都不是“先留着”
- 只有满足以下条件才允许进入 allowlist：
  - 当前确有不可替代的用户或测试价值
  - 有明确 owner
  - 有明确退出条件
  - 不构成第二真相源

## Decision 3: control plane 的一级公开心智必须统一到 `runtime.check / runtime.trial / runtime.compare`

- `ControlPlane` 继续作为 contract owner
- `Observability`、`Reflection` 中现有 trial/evidence 能力应被视为 backing / expert 路径，而不是 canonical 一级入口
- direct consumers 不允许继续自己决定是走 `Observability` 还是 `Reflection`

## Decision 4: canonical capability 不允许继续 limbo

- canonical docs 中出现的 capability 必须满足二选一：
  - 落地为稳定语义
  - 退出 canonical docs/examples/contracts
- 当前 `roots` 就属于必须在 `130` 里解决的代表性 limbo 项

## Decision 5: 如果 final cutover 命中超大文件，先拆解再做语义切换

- `ModuleRuntime.impl.ts`、`WorkflowRuntime.ts`、`StateTransaction.ts` 都已超过 constitution 的规模门槛
- 若实现阶段必须触及这些文件，先做互斥子模块拆解
- 不允许在超大文件中继续堆叠“最后一轮过渡逻辑”

## Decision 6: perf 结论继续只认 comparable evidence

- shell 删除、入口收口、旧壳层清理不能只靠“看起来更简单”来宣称更快
- 命中 steady-state runtime core 时，必须复用 `123/115` 路线或落新 evidence
- 只覆盖 diagnostics=on 的收益，不构成 final cutover 的性能结论

## Decision 7: allowlist 默认预算为 0

- allowlist 只允许承接少量经证明不可立即删除的例外项
- placeholder、待定条目、无 owner 条目都不允许进入实现阶段
- final gate 时的非空 allowlist 必须自带退出条件和风险说明

## Decision 8: control-plane-adjacent surface 必须逐个定性

- `ControlPlane`、`Observability`、`Reflection`、sandbox client/service、CLI adapters、root barrel 导出不能继续停留在模糊状态
- 每个 surface 都必须落到 `canonical facade / expert alias / internal-backing-only / remove` 之一
- 未定性状态本身就是 final cutover 的阻断项
