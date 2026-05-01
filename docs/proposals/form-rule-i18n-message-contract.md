---
title: Form Rule I18n Message Contract
status: consumed
owner: form-rule-i18n-message-contract
target-candidates:
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/ssot/form/02-gap-map-and-target-direction.md
  - docs/ssot/form/03-kernel-form-host-split.md
  - docs/ssot/runtime/08-domain-packages.md
  - docs/ssot/runtime/09-verification-control-plane.md
last-updated: 2026-04-16
---

# Form Rule I18n Message Contract

## 角色

- 本页已被消费，只保留 adopted delta
- rule x i18n 的 authority 已回写到目标 SSoT
- 本页不再承载 exact contract、writeback routing、review focus 或并列 carrier 选择

## Adopted Delta

- 校验失败先产出 locale-neutral message intent
- 人类文案只在展示边界或显式 render 边界生成
- Form state、reason contract、trial、compare 不把当前语言的最终字符串当 canonical truth
- Form 继续持有 validation semantics
- `@logixjs/i18n` 继续持有 token contract 与 render service
- rendered string 退出 compare 主轴
- message token 只影响 evidence summary 的归一化

## Authority Refs

- [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
- [02-gap-map-and-target-direction.md](../ssot/form/02-gap-map-and-target-direction.md)
- [03-kernel-form-host-split.md](../ssot/form/03-kernel-form-host-split.md)
- [08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
- [09-verification-control-plane.md](../ssot/runtime/09-verification-control-plane.md)
- [2026-04-16-form-rule-i18n-message-contract-review.md](../review-plan/runs/2026-04-16-form-rule-i18n-message-contract-review.md)

## Allowed Reopen Surface

- 若 future 要冻结 i18n render boundary exact contract，可单独 reopen i18n domain planning
- 若 control plane 未来要冻结 report shell 或 materializer exact shape，单独 reopen `runtime/09`

## Residue Pointer

当前 residual 继续只指向：

- i18n domain 自己的实现缺口
- control plane exact shell 仍待 living `runtime/09` 单点收口

## 当前一句话结论

这轮已经把 Form 与 i18n 的主边界收成 locale-neutral token truth 与 render-boundary 文案生成；任何更细的 report shell、materializer 或 repair carrier，后续统一回到 living `runtime/09` 或 i18n domain 单点裁决。
