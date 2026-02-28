# Contracts

本目录定义 feature 103 在 plan 阶段固化的契约边界：

- `scenario-suite.schema.json`：场景矩阵注册契约（suite/axes/metrics/budgets）
- `gate-policy.schema.json`：门禁策略契约（profile、可比性规则、失败策略）

说明：

- 这些契约用于约束“测试资产与门禁配置”而非对外 HTTP API。
- 执行期报告结构继续复用 `@logixjs/perf-evidence/assets/schemas/*`（统一真相源）。
