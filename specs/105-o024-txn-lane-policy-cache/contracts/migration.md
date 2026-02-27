# Contract: Migration (O-024)

## Breaking Change

- 运行中 override 不再即时覆盖当前策略。

## Migration Steps

1. 把 override 更新流程改为触发 re-capture。
2. 更新测试预期为 capture 生效模型。
3. 使用诊断事件确认 cacheHit 与 captureSeq。

## 操作示例

1. 先在控制面注入 override（仅注入不会立即改变正在执行中的策略）。
2. 显式触发一次会进入 capture 的事务（即 re-capture）。
3. 观察 `txn_lane_policy::resolved`：
   - `captureSeq` 递增；
   - `reason='cache_hit'`；
   - `cacheHit=true`；
   - `configScope`/`queueMode` 与新 override 一致。

## Forward-only Rule

- 不提供兼容层。
- 不提供弃用期。
