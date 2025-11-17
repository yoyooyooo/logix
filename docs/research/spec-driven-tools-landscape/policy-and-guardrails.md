# Policy / Authorization / Guardrails：把“组织规则”产品化

目标：补齐“policy/workflow 驱动”赛道中，与 intent-flow 的“全局约束、守卫、合规证明”最相关的代表工具。

## 1) Policy-as-Code：OPA + Conftest（规则引擎 + 配置测试）

定位：OPA 用 Rego 表达策略；Conftest 将策略应用到结构化配置（K8s/IaC/CI 配置等），形成 gate。

可追溯入口：

- Conftest 仓库：https://github.com/open-policy-agent/conftest

可复用模式（对 intent-flow）：

- `policy repo` + `PR review` + `CI gate` 是“组织规范可执行化”的最成熟落地路径之一。

## 2) Kubernetes-native policy：Kyverno（规则用 YAML 表达）

定位：K8s 生态里用 YAML（而非 Rego）表达 policy，提供 CLI/测试/报告/例外管理，适合平台工程治理。

可追溯入口：

- 官网（能力索引：Shift-left/Testing/Policy Reports/Exceptions）：https://kyverno.io/

可复用模式（对 intent-flow）：

- “例外（exceptions）”与“报告（reports）”是产品化必备能力：不只是拦截，还要解释、审计、可操作地放行。

## 3) Authorization spec：Zanzibar 系（关系型权限模型）与 Cedar

定位：把权限模型从业务代码抽离，成为独立的 schema/数据与查询服务。

可追溯入口（举例）：

- SpiceDB（Zanzibar inspired）：https://github.com/authzed/spicedb
- Cedar / Verified Permissions（迁移文章示例）：https://aws.amazon.com/blogs/security/migrating-from-open-policy-agent-to-amazon-verified-permissions/

对 intent-flow 的启示：

- 权限/策略领域已经证明：把规则做成“可审计资产 + 可复用引擎”是成立的；
- 但这些系统大多不提供“过程性行为/trace”的统一解释层，这给 intent-flow 的 IR/Trace 路线留出空间。

