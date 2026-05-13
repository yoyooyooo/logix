# Contracts: I18n Logic Contract Cutover

## 1. Service-First Contract

- I18n 默认主身份是 `services.i18n + token contract`
- package root 只保留 service-first 表面
- projection 不回默认主叙事
- keep or move or remove ledger 已冻结 root exports

对应 ledger：

- `root-surface-ledger.md`

## 2. Driver Lifecycle Contract

- ready、reset、初始化接线走 shared declaration contract
- 包内不再长出独立 lifecycle 家族

对应 ledger：

- `lifecycle-wiring-ledger.md`

## 3. Expert Route Contract

- fixed root / global 解析语义只停在 expert route
- auxiliary projection 只停在辅助层

对应 ledger：

- `projection-ledger.md`
