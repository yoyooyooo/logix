---
title: I18n Exact Surface Contract
status: living
owner: i18n-exact-surface
target-candidates:
  - docs/ssot/runtime/08-domain-packages.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-18
---

# I18n Exact Surface Contract

## 目标

冻结 `I1` 这组 i18n exact surface 的最终去向。

本页要裁三件事：

- `@logixjs/i18n` root 到底还配继续保留哪些 noun
- `./I18n`、`./Token` 与当前 `./*` wildcard 是否还配继续存在
- 哪些能力若未来还要活，只配去 supporting residue，不再占 exact surface

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `I1` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `I1`
- 本页不再回到已 `consumed` 的 i18n 提案当 authority target
- 本页只审 `@logixjs/i18n` exact root 与 subpath

## 当前 authority baseline

- [../ssot/runtime/08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)

## north-star-only freeze

本页 review 只把北极星当作固定前提：

- AI Native first
- Agent first runtime
- 更小、更一致、更可推导的公开面优先

除此之外，下面这些点全部允许被挑战：

- `I18n / I18nTag / I18nSnapshotSchema / token / InvalidI18nMessageTokenError` 的全部公开价值
- `./I18n` 与 `./Token` 的继续公开资格
- `./*` wildcard 的继续存在
- service-first 这条 package 身份如何落到 exact surface

## 当前 challenge override

下面这些 live 语句在本页只算 prior baseline witness，不算默认结论：

- package root 当前继续保留 `I18n / I18nTag / I18nSnapshotSchema / token contract exports`
- `./I18n` 与 `./Token` 继续通过 wildcard 隐式公开
- `InvalidI18nMessageTokenError` 继续默认占 root

原因：

- 这些对象大多只是当前 `package.json`、当前 root barrel 与现有 boundary tests 的存活 witness
- 在零存量用户前提下，这组对象都必须重新证明 `why-public / why-root-or-subpath / why-not-internal`

## 当前 scope

- root:
  - `I18n`
  - `I18nTag`
  - `I18nSnapshotSchema`
  - `token`
  - `InvalidI18nMessageTokenError`
- subpath:
  - `./I18n`
  - `./Token`
  - `./*`

## 目标论点

当前待审目标论点固定为：

> `I1` 应冻结为 root-minimized service-first contract。
> `@logixjs/i18n` root 默认不自动保留过宽 type / error / wildcard surface。
> 除非能证明 `why-public / why-root-or-subpath / why-not-internal`，否则默认继续收口。

## adopted candidate

本轮 adopted candidate 已冻结为：

- `I1 I18n-Tag-Token Minimal Contract`

冻结结果如下：

- `@logixjs/i18n` root 只保留：
  - `I18n`
  - `I18nTag`
  - `token`
  - token contract types
- `I18nSnapshotSchema`
- `InvalidI18nMessageTokenError`
- 其余 driver / snapshot / error 辅助类型

这组对象全部退出 exact public surface。

subpath 与 wildcard 规则固定为：

- `./I18n` 删除
- `./Token` 删除
- `./*` 删除

概念回收规则固定为：

- `I18n` 继续承接 service-first root
- `I18nTag` 继续承接 service injection anchor
- `token(...)` 与 token contract types 继续承接 semantic token contract
- `I18nSnapshotSchema / I18nService / I18nSnapshot / I18nInitState / I18nRenderHints` 全部回收到 internal driver layer
- `InvalidI18nMessageTokenError / InvalidI18nMessageTokenReason / JsonPrimitive` 全部回收到 internal token layer

## Row Sheet

| surface | current-reach | candidate-disposition | main challenge |
| --- | --- | --- | --- |
| `I18n` | root + `./I18n` | `keep-canonical-default` | service-first root 是否仍以 `I18n` 为中心 |
| `I18nTag` | root via `.` | `delete-first` | 是否必须继续作为 root noun 暴露 |
| `I18nSnapshotSchema` | root via `.` | `delete-first` | schema export 是否必须继续停在 root |
| `token` | root + `./Token` | `keep-canonical-default` | token contract 是否仍是最小公开锚点 |
| `InvalidI18nMessageTokenError` | root via `.` | `delete-first` |显式 error class 是否还必须继续公开 |
| `./I18n` | explicit or wildcard-resolved subpath | `delete-first` | root 保留后是否还需要独立 subpath |
| `./Token` | explicit or wildcard-resolved subpath | `delete-first` | root 保留后是否还需要独立 subpath |
| `./*` | wildcard subpath | `delete-first` | wildcard 是否应改成显式 exports |

## 当前一句话结论

`I1` 已冻结为 `I18n-Tag-Token Minimal Contract`：root 只保留 `I18n / I18nTag / token(...)` 与 token contract types；`./I18n`、`./Token`、`./*` 全部退出 public surface。
