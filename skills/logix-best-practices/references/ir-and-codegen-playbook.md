---
title: IR 与 Codegen 手册（Static/Dynamic 双层）
---

# IR 与 Codegen 手册（Static/Dynamic 双层）

## 0) 适用场景

- 你在设计/修改 IR 结构。
- 你在做 codegen、diff、回放或解释链路。
- 你要验证“这次改动有没有引入并行真相源”。

## 1) 基础口径

- `Static IR`：可比较、可解释、可审阅的静态工件。
- `Dynamic Trace`：运行证据（事件序列、锚点、可回链上下文）。
- 两者必须分层，不能互相冒充。

## 2) 稳定标识（必须可复现）

- 静态层：nodeId/edgeId/digest/sourceKey。
- 动态层：instanceId/txnSeq/opSeq/tickSeq/linkId。
- 禁止把随机数/墙钟时间作为主锚点。

## 3) 编译与出码流程

1. DSL/规则输入先收敛到白盒可解析子集。
2. 编译产出 Static IR（含 fail-fast 校验）。
3. 运行时产出 Dynamic Trace（事件 Slim 化）。
4. 通过稳定锚点做 Static↔Dynamic 回链。
5. 生成代码与 IR 保持一一对应，不做隐藏语义分叉。

## 4) 漂移高发点与防线

- 同输入跨环境产出不同 IR。
  - 防线：稳定序列化 + digest + golden snapshot。
- Trace 无法回链到静态节点。
  - 防线：事件补齐 instance/txn/op + 规则锚点。
- 业务绕过 DSL 直写 runtime 私有逻辑。
  - 防线：明确标记违规并进入诊断报告。

## 5) 必做验收

- 同输入、同版本、同配置下 digest 稳定。
- 关键事件能回链到对应 Static IR 节点。
- 导出产物可被平台/Devtools消费，不依赖内存对象。
- 回放至少能复现关键控制决策，不只复现最终结果。

## 6) 延伸阅读（Skill 内）

- `references/llms/01-core-glossary.md`
- `references/llms/04-runtime-transaction-rules.md`
- `references/llms/06-diagnostics-perf-basics.md`
- `references/llms/08-builder-ir-basics.md`
