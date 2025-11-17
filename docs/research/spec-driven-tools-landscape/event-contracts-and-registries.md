# 事件/消息契约与 Schema Registry：Compatibility / Evolution / Catalog

目标：补齐“事件驱动系统”的规范资产与治理工具链（更接近真实 ToB 场景的规模化痛点），并提炼可迁移到 intent-flow 的产品形态。

## 1) 为什么这条赛道重要

在事件驱动架构里，最常见的“spec drift”不是 REST API，而是：

- topic/event 的 payload 结构演进无人治理（字段增删改导致下游静默出错）
- producer/consumer 升级顺序不一致（灰度/回滚/多版本共存）
- schema 没有“权威源头 + 兼容性门禁”，导致“并行真相源漂移”

这条赛道已经把“规范资产化 + 兼容性门禁”做成了成熟产品形态（类 Buf/Apollo Checks），对 intent-flow 的 `IR/Trace Checks` 是强参照。

## 2) Confluent Schema Registry（Kafka 生态事实标准之一）

能力核心：按 subject 版本化 schema，提供多种兼容性策略，并支持“transitive（对所有历史版本检查）”。

可追溯入口：

- Schema evolution & compatibility（兼容性类型、默认 BACKWARD、transitive 等解释）：  
  https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
- 开源仓库（API 示例：兼容性检查、按 subject 更新等）：  
  https://github.com/confluentinc/schema-registry

可迁移模式（对 intent-flow）：

- `compatibilityLevel`（BACKWARD/FORWARD/FULL + TRANSITIVE）≈ “变更允许的兼容窗口”与“回滚能力”的产品化表达；
- “按 subject/按域设置规则”≈ `Logix Checks` 按 module/trait/flow 设 rule set；
- “compatibility check API”≈ `logix check`（CI gate）+ PR annotation。

## 3) Apicurio Registry（更偏“多制品类型”的治理仓库）

特点：不仅存 Avro/JSON Schema/Protobuf，也能存 OpenAPI/AsyncAPI 等“API/事件规范制品”；并提供规则（validation/compatibility/integrity）治理演进。

可追溯入口：

- Intro（capabilities：多格式、规则、存储、console/CLI/Maven/plugin/SDK 等）：  
  https://www.apicur.io/registry/docs/apicurio-registry/3.1.x/getting-started/assembly-intro-to-the-registry.html

对 intent-flow 的启示：

- 这类 Registry 的“制品类型多样化”很接近 intent-flow 未来要面对的现实：spec 不止一种（UI/Flow/Policy/API/Schema），需要一个统一落点或至少统一治理面；
- “规则先行（上传新版本必须过规则）”对应 intent-flow 的“核心路径强约束必须 gate”。

## 4) AWS Glue Schema Registry（云厂商的“托管型 registry”路线）

特点：把 schema 作为“生产者/消费者之间的合同”，并内建兼容性模式（含 FULL_ALL / BACKWARD_ALL 等对全历史检查）。

可追溯入口：

- 总览（兼容性模式、SerDe、Kafka/Kinesis/Flink/Lambda 集成）：  
  https://docs.aws.amazon.com/glue/latest/dg/schema-registry.html
- 工作机制（serializer/缓存/注册与兼容性检查）：  
  https://docs.aws.amazon.com/glue/latest/dg/schema-registry-works.html

对 intent-flow 的启示：

- “serializer 在生产侧就做 schema 验证”是把治理前置到运行时边界的典型做法；
- intent-flow 若要做强约束（例如事务窗口禁止 IO），也需要类似“运行时边界”做可选/强制 gate。

## 5) CloudEvents（事件元数据的跨平台互操作规范）

定位：统一事件 envelope（id/source/type/specversion 等），并定义多协议 binding（HTTP/Kafka/NATS…）。

可追溯入口：

- 规范仓库与文档索引：https://github.com/cloudevents/spec

对 intent-flow 的启示：

- CloudEvents 解决的是“跨系统事件外形一致性”；intent-flow 的 IR/Trace 解决的是“过程与状态演化一致性”。两者可互补：CloudEvents 可作为外部事件的稳定锚点/输入契约，IR/Trace 作为内部执行与解释锚点。

## 6) 事件 Catalog（把 schema registry 从“存”升级到“可发现/可理解”）

代表：EventCatalog（集成 OpenAPI/AsyncAPI、Confluent/Apicurio/AWS Glue 等 registry，并可接入 Backstage）。

可追溯入口：

- Integrations 列表（覆盖 Confluent/Apicurio/AWS Glue/Backstage/OpenAPI/AsyncAPI 等）：  
  https://www.eventcatalog.dev/integrations
- Backstage 插件入口页（插件导航）：  
  https://www.eventcatalog.dev/docs/backstage
- Confluent Schema Registry integration（可作为具体例子）：  
  https://www.eventcatalog.dev/integrations/confluent-schema-registry

对 intent-flow 的启示：

- Registry 解决“兼容性与版本化”，Catalog 解决“语义化/归属/可视化/可发现”；intent-flow 的 Devtools/Studio 可以借鉴这种“资产 → 语义 → 视图”的产品分层。

