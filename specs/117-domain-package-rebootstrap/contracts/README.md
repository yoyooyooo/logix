# Contracts: Domain Package Rebootstrap

## 1. Output Mode Contract

- query 只认 program-first
- i18n 只认 service-first
- domain 只认 pattern-kit
- form 维持领域层表达

## 2. Boundary Contract

- 领域包不得自带第二套 runtime、事务、DI、诊断事实源
- field-kernel 停在 expert 边界

## 3. Reuse Contract

- 已对齐主链的领域协议、helper、fixtures、测试资产优先保留或平移
- 只有默认入口、命名或边界失配的部分进入重组

## 4. Template Contract

- 公开层保持尽量小
- internal 层承接共享实现
- 特殊子树，如 form 的 `react/`，必须明确角色

## 5. Current Route Contract

- `@logixjs/query`、`@logixjs/i18n`、`@logixjs/domain`、`@logixjs/form` 当前都按 `freeze-and-rebootstrap` 处理
- 这四个包都保留 canonical 包名
- 旧入口只允许降到 legacy helper 或 expert 边界
- `I18nModule` 若继续存在，只允许通过 `@logixjs/i18n/I18nModule` 显式导入
- `CRUDModule` 若继续存在，只允许通过 `@logixjs/domain/Crud` 显式导入
