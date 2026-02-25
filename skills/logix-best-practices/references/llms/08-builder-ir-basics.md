---
title: Builder / IR / Codegen 基线（LLM 版）
---

# Builder / IR / Codegen 基线（LLM 版）

## 1) 边界

- Builder 负责静态读取与结构化产物。
- Runtime 负责执行语义。
- 不引入 builder 专用并行语义。

## 2) 解析与降级

- 先匹配白盒可解析子集。
- 不可解析片段显式降级（保留 sourceKey/原因码）。
- 禁止静默吞掉黑盒片段。

## 3) IR 与 Trace

- Static IR：可比较、可审阅。
- Dynamic Trace：可解释、可回放。
- 通过稳定锚点做静态/动态回链。

## 4) 验收

- 同输入同版本产物稳定。
- 关键事件可回链到静态节点。
- 输出可被平台与工具消费，不依赖内存私有对象。
