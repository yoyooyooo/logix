# Research Notes: 统一观测协议与聚合引擎

> 目标：把 “组件 + Chrome 扩展（P1 离线导入 / P2 实时） + core 打底” 的关键不确定点收敛为可实现的约束与决策，避免进入实现后大范围返工。

## Decision 1: 统一协议采用 “事件信封（Envelope）” 分层

- **Decision**: 定义统一的 `ObservationEnvelope` 作为跨宿主传输与证据包的最外层结构（必须携带 `protocolVersion/runId/seq`）；具体事件内容（Debug/Log/Trace/UIIntent/RunLifecycle 等）作为 `payload` 放入信封。
- **Rationale**: 现有运行时与 Sandbox 已有各自事件模型；用 Envelope 包一层，可以最小化侵入式改动，同时满足跨宿主一致的 runId/seq/version 需求。
- **Alternatives considered**:
  - 直接改写现有 `Debug.Event`/`SandboxEvent` 成为统一 union：侵入性大，迁移成本高。
  - 仅在 UI 侧补齐 runId/seq：会违反 “查看器不得补造” 的一致性约束。

## Decision 2: 稳定顺序以 `{ runId, seq }` 为权威（seq 在运行环境生成）

- **Decision**: 同一 `runId` 内事件的主排序键为 `seq`，由运行环境侧的 Sequencer 生成；`timestamp` 仅作展示/聚合辅助。
- **Rationale**: 仅依赖时间戳在高频/并发/跨线程情况下不可稳定复现；`seq` 是导出/导入后保持顺序一致的最小充分条件。
- **Alternatives considered**:
  - 仅用 `timestamp`：高频事件顺序不稳定，导入后漂移。
  - 多源局部 seq + 合并规则：实现复杂且仍依赖时间戳；与当前澄清的“全序”目标不一致。

## Decision 3: Chrome 扩展分两阶段：P1 离线导入；P2 实时连接（TransportMessage v1）

- **Decision**:
  - **P1（离线）**：扩展面板只做 EvidencePackage 导入与一致视图展示，不要求连接页面会话。
  - **P2（实时）**：连接链路采用 “页面 → content-script → background → devtools panel” 的最小路径；页面侧通过 `window.postMessage` 发出观测批次消息，扩展侧按 tabId 路由；消息形状与最小语义以 `TransportMessage` v1（HELLO/SUBSCRIBE/OBSERVATION_BATCH/CONTROL/CONTROL_ACK）为裁决源（见 `contracts/schemas/transport-message.schema.json`）。
- **Rationale**:
  - P1 能先验证“跨宿主一致消费”的主线，并把复杂的实时/背压/命令回路推迟到 P2。
  - content-script 与页面 JS 运行在隔离世界，无法直接共享对象；`postMessage` 是跨世界传输的最小可行通道，且可控、可观测。
- **Alternatives considered**:
  - 直接在扩展侧“抓取页面内部状态”：受浏览器安全模型限制，不可行或需要侵入性注入。
  - 仅用 `BroadcastChannel`：在跨域/隔离场景可用性不稳定，且扩展侧监听能力受限。

## Decision 4: “原始数据保留”与“不可序列化 payload”按可预测降级处理

- **Decision**: 运行中在进程内可以保留原始对象引用；但当跨宿主传输或导出为证据包时，`payload` 必须满足 `JsonValue` 硬门：遇到不可结构化克隆/不可 JSON 化/体积超限的值，必须在边界投影/摘要为可预测表示并标记降级原因（例如 `non_serializable/oversized`），且保证导出/导入/传输不崩溃。
- **Rationale**: 不可序列化值是浏览器/Worker/扩展的物理边界；若强行“完全原样”会导致导出失败或通信通道崩溃。
- **Alternatives considered**:
  - 拒绝导出/传输：破坏主路径可用性。
  - UI 侧临时 stringify：会引入非确定性与跨宿主差异（仍属于“查看器补造”）。

## Decision 5: 聚合引擎必须是宿主无关、可纯函数化验证

- **Decision**: 聚合引擎以 “输入 Envelope 流/证据包 → 输出聚合快照” 为核心契约，并提供可在单测中纯函数验证的一致性（同输入同输出）。
- **Rationale**: 组件与插件需要共享同一套“核心结论”；聚合层纯函数化能最大化复用、降低 UI 形态差异导致的数据失真风险。
- **Alternatives considered**:
  - 让每个宿主各自聚合：会导致规则分叉与一致性不可控。

## Decision 6: 控制命令先只覆盖 “清空/暂停/恢复”，回放作为可选扩展

- **Decision**: 协议最小控制命令集合为 `clear` / `pause` / `resume`；命令回执必须用 `ControlAck`（每条命令必回执，不支持必须明确拒绝并给 reason）。回放/时间旅行只在运行环境支持时启用，且边界明确。
- **Rationale**: 这是 spec 的 FR-007 最小闭环；能尽快验证“命令面”在组件/插件之间的一致性，而不被完整回放能力拖慢。
- **Alternatives considered**:
  - 一开始就做完整 time-travel：依赖运行时更多契约与状态快照存储，容易扩大范围。

## Decision 7: 统一采用 Span-Based Timeline 与 Off-Main-Thread 渲染架构

- **Decision**: 在视觉层放弃基于 DOM 的 Density Histogram，统一转向基于 Canvas 的 Time-Span Timeline；在架构层强制采用 Worker 聚合 + 异步渲染。
- **Rationale**:
  - **视觉**: Span + Flamegraph 才能真实反映 Intent-Flow 的并发与依赖关系，旧的密度图这方面信息有损。
  - **性能**: 必须把渲染开销从主线程剥离，才能满足 FR-012/013 的硬指标，消灭观测者效应；这是 Spec 005 落地的技术基础。
- **Reference**: 详见 [Design Doc: Timeline Rendering Engine](./design-timeline-rendering.md)。
