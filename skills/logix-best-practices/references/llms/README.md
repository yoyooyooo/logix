---
title: LLM 资料包索引（llms-ready）
---

# LLM 资料包索引（llms-ready）

这组文档用于“直接喂给 LLM”，目标是让模型不依赖仓库私有路径也能写出可执行、可解释的 Logix 代码。

## 推荐阅读顺序

1. `01-core-glossary.md`
2. `02-module-api-basics.md`
3. `03-flow-process-basics.md`
4. `04-runtime-transaction-rules.md`
5. `05-react-usage-basics.md`
6. `06-diagnostics-perf-basics.md`
7. `07-testing-basics.md`
8. `08-builder-ir-basics.md`

## 目录说明

- `01~08`：通用基础，不绑定具体仓库路径。
- `99-project-anchor-template.md`：可选，用于把目标项目的 SSoT/源码路径映射进来。

## 转换为 llms.txt 的建议

- 按 `01~08` 顺序拼接，标题保留，示例保留最小片段。
- 若有目标项目上下文，再追加 `99` 的已填充版本。
- 保持“规则优先、示例其次、路径可选”的结构，避免把 llms.txt 变成仓库导航页。
