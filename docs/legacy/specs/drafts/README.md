# Logix Drafts & Topics

> **Status**: Experimental / Incubating
> **Context**: `v3/ai-native`

这里存放 Logix 的所有草稿文档。

完整清单与当前落点以 `docs/specs/drafts/index.md` 为准。

## 1. Topics (Consolidated Drafts)

按特定主题整理的、相对完整的草稿集合。

推荐从以下入口开始读（其余 Topic 请直接看 `index.md`）：

- **[Runtime v3 Core](./topics/runtime-v3-core/README.md)**：Runtime 核心不变量与性能门禁（事务/锚点/Diagnostics/React ModuleCache/014 跑道）。
- **[Runtime Middleware & EffectOp](./topics/runtime-middleware-and-effectop/README.md)**：EffectOp 中间件总线与边界模型。
- **[Runtime Observability](./topics/runtime-observability/README.md)**：Debug/TraceBus/可观测性插件与接线。
- **[React Adapter](./topics/react-adapter/README.md)**：React 适配层（hooks、SSR、测试、配置模型）。

## 2. Tiered Drafts (L1~L9)

按成熟度分级的草稿体系（用于新想法孵化）。

*   **L1**: 几乎稳定，可直接视为正式规范候选
*   **L2**: 结构清晰、主要矛盾已解决，后续以细节调整为主
*   **L3**: 有完整章节结构与 TODO，方向明确但实现/权衡尚在演化
*   **L4**: 问题定义和部分方案较清楚，仍有明显空白或待决问题
*   **L5**: 以对比/调研为主，有初步结论但未形成系统方案
*   **L6**: 思路梳理、问题拆解为主，结论弱、问题强
*   **L7**: 散碎灵感、会议记录、长对话摘录，已有一定分组
*   **L8**: 一次性调研/探索结果，未来可能被合并或丢弃
*   **L9**: 生草稿，新产生但未整理的想法/对话/外部启发

> 详细分级说明请参考 `.codex/skills/drafts-tiered-system/SKILL.md`。
