# 8) `@logix/i18n`（Feature Kit：root 单例 i18n + message token）

## 你在什么情况下会用它

- 希望把外部 i18n（如 i18next）作为 Runtime 注入能力，并让“要翻译什么”可序列化/可回放。

## 核心概念

- `I18n.layer(driver)` 注入外部 driver。
- Logic 用 `$.root.resolve(I18nTag)` 获取 root 单例服务（不会被局部 Provider.layer 覆写影响）。
- `token(key, options)` 产出 message token（建议写入 state）；UI 再 render。
- 可选：`I18nModule.impl` 把 snapshot 暴露为模块状态（便于订阅/Devtools）。

## 示例入口

- 文档：`apps/docs/content/docs/guide/patterns/i18n.md`
- 示例：`examples/logix-react/src/demos/I18nDemoLayout.tsx`、`examples/logix/src/i18n-message-token.ts`
