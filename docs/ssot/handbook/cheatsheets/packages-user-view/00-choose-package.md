# 0) 先选包：按职责正交分解

- **引擎（Runtime）**：`@logixjs/core`
- **宿主适配（React）**：`@logixjs/react`
- **调试 UI（Devtools 面板）**：`@logixjs/devtools-react`
- **Alignment Lab 基础设施（Worker/Sandbox）**：`@logixjs/sandbox`
- **工具链（CLI / 门禁 / 锚点写回）**：`@logixjs/cli`
- **测试工具（把 Runtime 变成可断言的执行）**：`@logixjs/test`
- **业务能力包（Feature Kits）**：`@logixjs/form` / `@logixjs/query` / `@logixjs/i18n` / `@logixjs/domain`
