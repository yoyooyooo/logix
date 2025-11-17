# 内部 Config Service 约定（Tag + layer）

在运行时实现层，对“运行期行为参数”（如 React 集成中的 `gcTime`、初始化超时等）统一采用 **Config Service** 模式：

- 为每类配置定义一个 Shape 接口与 Tag：
  - `interface XxxConfigShape { /* 完整配置字段 */ }`
  - `class XxxConfigTag extends Context.Tag('XxxConfig')<XxxConfigTag, XxxConfigShape>() {}`
- 提供一个最小的 helper Namespace，至少包含：
  - `XxxConfig.tag`：导出 Tag 本体（lowerCamelCase，便于与 effect 风格对齐）；
  - `XxxConfig.replace(partial: Partial<XxxConfigShape>)`：在当前 Env 中已有的配置基础上叠加 partial，若不存在则以 `DEFAULT_CONFIG` 为初始值，返回一个新的 Layer。
- 使用约束：
  - 运行时代码通过 `yield* XxxConfigTag` / `Effect.service(XxxConfigTag)`（可选配置用 `Effect.serviceOption`）读取配置；`DEFAULT_CONFIG` 仅作为“缺省基线”存在；
  - 调用方若需要覆盖默认行为，通过 Runtime 或 Provider 的 `layer` 合成额外的 `XxxConfig.replace({...})` 覆写（语义类似 Logger.replace）；
  - 是否从 `Effect.Config` / 环境变量补齐默认值，由 Config Service 内部实现决定，不向业务暴露细节。

`ReactRuntimeConfigTag` + `ReactRuntimeConfig.replace`（见 `packages/logix-react/src/internal/provider/config.ts`）是这一模式的参考实现；同时该实现也演示了“优先 runtime override（Tag）→ 再读 ConfigProvider（Config keys）→ 最后落到 DEFAULT”的三段式决策。
