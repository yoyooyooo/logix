# Inventory: Domain Reuse Ledger

## Goal

登记四个领域包里已对齐主链、值得直接保留的协议、helper、fixture 和测试。

## Reuse Candidates

| Package | Path | Kind | Reuse Mode | Why |
| --- | --- | --- | --- | --- |
| `@logixjs/query` | `src/internal/engine/**`, `src/internal/tanstack/**`, `test/Query/**`, `test/Engine.combinations.test.ts` | `protocol` / `test` | `keep` | 现有 query 行为和缓存回归覆盖最有价值 |
| `@logixjs/query` | `src/TanStack.ts`, `src/Engine.ts` | `helper` | `split` | 保留集成层，但不让它们压过主入口 |
| `@logixjs/i18n` | `src/internal/driver/**`, `src/Token.ts`, `test/I18n/**`, `test/Token/**` | `protocol` / `test` | `keep` | service + token 契约已经对齐 service-first |
| `@logixjs/i18n` | `src/I18nModule.ts`, `test/I18nModule/**` | `helper` / `test` | `split` | 保留 legacy 辅助入口，不再当默认主入口 |
| `@logixjs/domain` | `src/internal/crud/**`, `test/Crud/**` | `protocol` / `test` | `keep` | 当前主要价值是 CRUD pattern-kit 素材 |
| `@logixjs/form` | `src/internal/form/**`, `src/internal/schema/**`, `src/internal/validators/**`, `test/Form/**`, `test/Rule/**`, `test/Field/**` | `protocol` / `test` | `keep` | form 主线和 schema/rules 回归覆盖都值得保留 |
| `@logixjs/form` | `src/react/**` | `helper` | `split` | react 子树保留，但不能反客为主 |

## Immediate Rule

- `keep` 的路径优先直接沿用
- `split` 的路径继续存在，但必须降到辅助层
