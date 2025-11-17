# Contracts: 029 国际化接入与 `$.root.resolve(Tag)`

本目录固化 029 的对外行为契约，作为实现与测试的单一事实源。

- `contracts/resolution.md`：strict 默认 + 显式 root/global；新增 `$.root.resolve(Tag)` 的语义边界
- `contracts/i18n.md`：I18nDriver 最小形状注入、I18n Service + I18nModule、快照订阅、ready 两档语义（含默认等待上限）、语言切换请求、失败降级与多 tree 隔离
- `contracts/message-token.md`：message token 的结构、预算、可序列化约束与推荐用法
- `contracts/errors.md`：本特性相关错误的结构化字段与诊断口径
