---
title: LLM 资料包索引（llms-ready）
---

# LLM 资料包索引（llms-ready）

这组文档用于“直接喂给 LLM”，目标是让模型只依赖 skill 内规则就能写出可执行、可解释的 Logix 代码。

## L0/L1 默认资料包

用于业务代码生成、API shape 评审、Form/React 常规接入。弱模型默认只喂这一组：

1. `01-core-glossary.md`
2. `02-module-api-basics.md`
3. `04-runtime-transaction-rules.md`
4. `05-react-usage-basics.md`
5. `07-testing-basics.md`
6. `../agent-first-api-generation.md`（当前 API 形状）

默认包只包含上面六份。不要把 `../logix-react-notes.md`、`../form-domain-playbook.md`、`../observability-and-replay-playbook.md` 或 `../platform-integration-playbook.md` 混进弱模型默认输入。

## L2/L3 按需追加资料包

只在任务明确触及核心路径、诊断、性能、IR、codegen、Sandbox、Playground 或对齐实验时追加：

- `03-long-running-coordination-basics.md`
- `06-diagnostics-perf-basics.md`
- `08-builder-ir-basics.md`
- `../diagnostics-and-perf-gates.md`
- `../observability-and-replay-playbook.md`
- `../platform-integration-playbook.md`

## 目录说明

- L0/L1 默认资料包：稳定生成公开 API 主链，避免提前吸收 Static IR、Dynamic Trace、evidence、scenario、platform、advanced scope 等观测层或高级宿主词汇。
- L2/L3 按需资料包：只服务核心路径、诊断、性能、IR 和对齐实验。
- `../agent-first-api-generation.md`：当前 Logix API shape 的 Agent-facing 生成规则。

## 转换为 llms.txt 的建议

- 默认只拼接 L0/L1 默认资料包，标题保留，示例保留最小片段。
- 只有任务明确要求 L2/L3 时，再追加对应专题资料。
- 保持“规则优先、示例其次”的结构，避免把 llms.txt 变成仓库导航页。
