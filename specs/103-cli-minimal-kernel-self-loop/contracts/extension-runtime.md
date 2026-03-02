# Extension Runtime Contract

## 设计边界

- CLI 仍是纯命令工具，不变成 Agent 本体。  
- 扩展只影响策略层，不修改控制协议核。

## 生命周期

1. `resolve manifest`
2. `validate schema`
3. `api version negotiate`
4. `load entry`
5. `setup`
6. `onEvent`
7. `snapshot/restore`
8. `teardown`

## 热重载

`preflight -> shadow start -> restore -> healthcheck -> atomic swap`。

失败策略：

- shadow 失败：不切流，保留旧实例。  
- swap 后观察窗失败：自动回滚。

## 安全要求

- capability allowlist（hostApis/net/fs）。
- 禁止 internal import。
- 限流与超时预算必须启用。
