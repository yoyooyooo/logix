# Contract: Errors（结构化诊断字段）

**Branch**: `029-i18n-root-resolve`

## 1. MissingRootProviderError（root/global 解析失败）

来源：`Logix.Root.resolve(Tag)`（以及语法糖 `$.root.resolve(Tag)`）。

必须满足：

- `err.name === "MissingRootProviderError"`
- `err.tokenId: string`
- `err.entrypoint: "logic.root.resolve" | "logic.$.root.resolve"`
- `err.mode: "global"`
- `err.startScope: { kind: "root" }`
- `err.fix: string[]`（dev 环境至少 2 条可执行修复建议）

## 2. InvalidI18nMessageTokenError（token 预算/序列化违规）

当 message token 不满足 `contracts/message-token.md` 约束时必须抛出该错误。

必须满足：

- `err.name === "InvalidI18nMessageTokenError"`
- `err.reason: "keyTooLong" | "tooManyOptions" | "optionKeyInvalid" | "optionValueInvalid" | "optionValueTooLong" | "numberNotJsonSafe" | "languageFrozen"`
- `err.details`：包含失败字段与预算（例如 `{ field: "options.userName", maxLen: 96, actualLen: 120 }`）
- `err.fix: string[]`：至少 2 条可执行修复建议

> 说明：token 创建应是纯函数路径；错误属于开发期“数据不合约”问题，必须可直接定位并修复。
