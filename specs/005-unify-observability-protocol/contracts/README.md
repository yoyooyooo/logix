# Contracts: 统一观测协议与聚合引擎

本目录存放本特性的“契约层”产物：用于跨宿主（组件/插件/Worker）交换观测数据与控制命令的协议定义。

- `observability-protocol.md`：消息形状、版本策略与兼容/降级语义（面向实现与测试）。
- `schemas/*`：JSON Schema 裁决源（用于工具/测试做结构校验）。
  - 传输层统一入口：`schemas/transport-message.schema.json`
