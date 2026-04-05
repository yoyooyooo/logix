# 契约/Schema/Workflow 生态：Diff / Gate / Mock / Workflow Spec

目标：补齐“contract/schema 驱动”这条成熟赛道中，最接近 intent-flow 未来产品形态（Checks/Diff/Gate/Explain/Asset）的代表工具与标准。

## 1) OpenAPI diff / breaking changes：oasdiff

定位：对 OpenAPI 做 diff / breaking / changelog，并支持多种报告格式与 CI 集成。

可追溯入口：

- 仓库：https://github.com/oasdiff/oasdiff
- README（features/commands）：https://github.com/oasdiff/oasdiff
- 破坏性规则说明：`docs/BREAKING-CHANGES.md`  
  https://github.com/oasdiff/oasdiff/blob/main/docs/BREAKING-CHANGES.md

对 intent-flow 的启示：

- “把 diff 解释成 breaking/non-breaking + 输出可消费报告”是可复用的产品形态；
- 同样的形态可以迁移到 `Logix IR + Trace`（而不是 OpenAPI）。

## 2) 从真实流量/测试生成并校验 OpenAPI：Optic

定位：通过代理捕获测试流量来生成/更新 OpenAPI；并提供 diff、lint、schema testing（防止 drift）。

可追溯入口：

- 仓库：https://github.com/opticdev/optic
- 关键文档：`docs/generate-openapi.md`  
  https://github.com/opticdev/optic/blob/main/docs/generate-openapi.md

对 intent-flow 的启示：

- Optic 的“用真实 traffic 反推 spec 并保持同步”的思路，可类比为：用 runtime trace 反推/校验 IR 与 spec 的一致性。

## 3) 多协议 mock + contract testing 平台：Microcks（开源）

定位：围绕 API 标准资产（OpenAPI/AsyncAPI/gRPC/GraphQL…）做 mocks 与 contract testing，面向 CI/CD 自动化。

可追溯入口：

- 官网（概览与能力）：https://microcks.io/
- 组织/仓库入口（需进一步落到具体实现文件时再补）：https://github.com/microcks

对 intent-flow 的启示：

- “以标准资产为中心，覆盖多协议/多形态的 mock+test”是一个成熟平台化方向；
- 但其资产仍是“接口/消息契约”，而 intent-flow 的资产可以是“业务流程/行为 IR + trace”。

## 4) Workflow Spec：Arazzo（OpenAPI Initiative）

定位：补齐 OpenAPI 的“单 endpoint 描述”，用标准化方式表达多步骤 API workflow（可用于文档与测试）。

可追溯入口：

- 规范仓库：https://github.com/OAI/Arazzo-Specification
- 规范发布（latest）：https://spec.openapis.org/arazzo/latest.html
- OAI 介绍页（Arazzo/Overlay/OpenAPI 三件套）：https://www.openapis.org/arazzo-specification

对 intent-flow 的启示：

- Arazzo 把“流程”变成机器可读规范，是把“spec”向可执行/可验证推进的重要信号；
- 但它仍然是“API 调用序列”的 workflow，缺少对内部状态/副作用/诊断协议的统一表达。

## 5) Spec augmentation：OpenAPI Overlay（OpenAPI Initiative）

定位：以独立文档表达“对 OpenAPI 的可重复变换/补丁”，避免直接改源 OpenAPI（支持在不同消费方之间做差异化视图）。

可追溯入口：

- 规范仓库：https://github.com/OAI/Overlay-Specification
- OAI 博客（1.0.0 发布说明）：https://www.openapis.org/blog/2024/10/22/announcing-overlay-specification

对 intent-flow 的启示：

- “主资产 + overlays”是解决“多消费者、多视图、多环境差异”的一个优雅范式；
- 类比到 intent-flow：可以把 `IR` 视为主资产，把“环境约束/平台差异/调试视图”做成 overlays。

## 6) SaaS 平台化趋势：Contract test generation / Arazzo workflow tests

例：Speakeasy 的 contract test generation（OpenAPI 驱动 + 允许 Arazzo 做 E2E workflow）。  
https://www.speakeasy.com/blog/release-contract-testing

对 intent-flow 的启示：

- 市场正在把“测试”从手写变成“由 spec 驱动自动生成 + 作为持续门禁”，并开始拥抱“workflow spec”（Arazzo）。

