# Contract: Migration (O-025)

## Staged Migration

1. consumer 先适配 degraded 语义。
2. 验证矩阵全绿。
3. 默认策略切换到 light。

## 三端迁移口径（Devtools / Replay / Evidence）

- Devtools（`@logixjs/devtools-react`）：
  - 读取 `snapshot.projection` 并展示 `degraded + reason.code`；
  - `light` 档位下将 `latest*` 缺失解释为“投影降级”而非异常。
- Replay（基于快照的回放消费者）：
  - 若 `hiddenFields` 命中 replay 依赖字段，必须显式提示切换 `projectionTier=full`；
  - 禁止在 `light` 档位伪造/推断缺失字段（禁止“撒谎补齐”）。
- Evidence（导出/导入链路）：
  - 导出载荷保持 Slim + 可序列化；
  - 消费端在导入后继续遵守 `degraded` 语义，不把 summary-only 误判为损坏。

## Forward-only Rule

- 不提供长期兼容分支。
