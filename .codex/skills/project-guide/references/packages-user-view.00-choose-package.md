# 0) 先选包：按职责正交分解

- **引擎（Runtime）**：`@logix/core`
- **宿主适配（React）**：`@logix/react`
- **调试 UI（Devtools 面板）**：`@logix/devtools-react`
- **Alignment Lab 基础设施（Worker/Sandbox）**：`@logix/sandbox`
- **测试工具（把 Runtime 变成可断言的执行）**：`@logix/test`
- **业务能力包（Feature Kits）**：`@logix/form` / `@logix/query` / `@logix/i18n` / `@logix/domain`
