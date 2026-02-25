# Contract: Runtime Consumption（运行时消费定级结果）

## Required

- 运行时 MUST 优先消费构建期已定级 selector。
- 对已定级 selector，运行时 MUST NOT 重复执行 strict gate 主判定。
- 对未定级 selector，运行时 MUST 进入显式降级路径并输出稳定原因码。

## Runtime Evidence

运行时记录至少包含：

- `moduleId`
- `instanceId`
- `txnSeq`
- `selectorId`
- `source`（`build` / `runtime_jit` / `runtime_dynamic_fallback`）
- `fallbackReason?`

## Behavioral Equivalence

- 在业务语义层面，迁移前后结果 MUST 等价。
- 允许差异：诊断触发时机从运行时迁移到构建期。

## Forbidden

- 禁止静默退化到 dynamic 且无原因码。
- 禁止在事务窗口内引入 IO/async。
