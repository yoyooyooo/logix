# Inventory: Boundary Notes

## Query

- 主入口停在 `Query.ts`
- `Engine.ts`、`TanStack.ts`、`Fields.ts` 继续作为辅助集成层

## I18n

- 主入口停在 `I18n.ts`
- `Token.ts` 和 driver 契约属于 service-first 主链
- `I18nModule.ts` 继续保留为 legacy 辅助入口

## Domain

- `Crud.ts` 视为 pattern-kit 主入口
- `CRUDModule` 命名允许存在于 kit 内部实现语境，不再占主叙事

## Form

- `Form.ts` 是领域主入口
- `FormView.ts`、`Field.ts`、`react/**` 都是辅入口
- field-kernel expert 继续停在边界外，不回默认作者面
