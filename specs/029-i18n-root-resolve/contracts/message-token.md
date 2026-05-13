# Contract: Message Token（Slim & 可序列化 & 可回放）

**Branch**: `029-i18n-root-resolve`

## 1. Token 结构（受限、可稳定对比）

推荐结构（i18next-like 的可序列化子集）：

```ts
type JsonPrimitive = null | boolean | number | string

type I18nTokenParams = Readonly<Record<string, JsonPrimitive>>

type I18nMessageToken = {
  readonly _tag: "i18n"
  readonly key: string
  readonly params?: I18nTokenParams
}
```

约束：

- `params` 只允许 `JsonPrimitive`；禁止嵌套对象/数组/函数（保证可序列化）。
- render fallback 不进入 token；兜底文案只允许在 `render(...) / renderReady(...)` 的 hints 里声明。
- `params` 不允许出现语言冻结类字段（例如 `lng` / `lngs`），避免 token 把语言“写死”导致无法随语言切换自动更新。
- `params` 必须被规范化（canonicalize）后再写入 state/事件：去掉 `undefined`，并按 key 字典序重建 `params`，保证稳定对比与稳定序列化。

### 1.1 参数类型安全（编译期优先）

- `token(key, params)` 的对外类型 SHOULD 显式限制 `params` 为 `I18nTokenParams`，尽可能在编译期阻止传入复杂对象。
- 运行时仍 MUST 校验并拒绝任何不可序列化输入（防止 `any/unknown` 泄漏污染可回放状态与诊断载荷）。

## 2. 预算（建议：先 soft，后续可升级为 hard）

预算用于保证 token “Slim 且可进事件/可回放”，但在早期可先作为 **soft 约束**（dev 下告警/诊断），待 Evidence/Devtools 需要更强成本控制时再升级为 **hard 拒绝**。

示例预算（可调整）：

- `key.length <= 96`
- `params` 中 string value：`value.length <= 96`
- `params` 键数量 `<= 8`
- 任意情况下不允许出现 `Infinity/NaN` 等不可 JSON 化数字（必须拒绝）

> 说明：以上是结构化预算（不依赖 JSON.stringify），用于保障性能与确定性；如需更强保证，可在 dev 下额外校验序列化长度。

## 3. 错误口径

当 token 不满足“可序列化”硬约束时，必须稳定拒绝，并抛出结构化错误（见 `contracts/errors.md`）：

- 错误必须包含：失败原因（哪一条约束）、具体字段、以及修复建议（例如“不要传对象/数组”“把兜底文案放到 render hints”“去掉 lng”）。

当 token 超出 “Slim” soft 预算时：

- 默认 SHOULD 产出可诊断信号（dev 侧可见），并仍然返回 token（避免在早期阻断 DX）。
- 当运行时开启严格模式（或显式配置）时，MUST 升级为稳定拒绝（避免成本失控）。

## 4. 推荐用法（与 field/form 场景）

- 表单校验错误、后端错误码映射等：优先存 token（key + params），避免存最终字符串。
- 若接入第三方校验器（例如返回 string message），建议在边界把它映射为 token（例如使用错误码/字段名作为变量），并把兜底展示文案留在 render hints。
