# Inventory: Domain Package Templates

## `@logixjs/query`

- route:
  - `freeze-and-rebootstrap`
- public layer:
  - `src/index.ts`
  - `src/Query.ts`
- auxiliary layer:
  - `src/Engine.ts`
  - `src/TanStack.ts`
  - `src/Fields.ts`
- internal layer:
  - `src/internal/engine/**`
  - `src/internal/logics/**`
  - `src/internal/tanstack/**`

## `@logixjs/i18n`

- route:
  - `freeze-and-rebootstrap`
- public layer:
  - `src/index.ts`
  - `src/I18n.ts`
  - `src/Token.ts`
- legacy helper:
  - `src/I18nModule.ts`
- internal layer:
  - `src/internal/driver/**`
  - `src/internal/token/**`
  - `src/internal/module/**`

## `@logixjs/domain`

- route:
  - `freeze-and-rebootstrap`
- public layer:
  - `src/index.ts`
  - `src/Crud.ts`
- internal layer:
  - `src/internal/crud/**`
- template note:
  - 继续围绕 pattern-kit 组织，不再扩张第二套 module 主叙事

## `@logixjs/form`

- route:
  - `freeze-and-rebootstrap`
- public layer:
  - `src/index.ts`
  - `src/Form.ts`
- auxiliary layer:
  - `src/FormView.ts`
  - `src/Field.ts`
  - `src/react/**`
- internal layer:
  - `src/internal/form/**`
  - `src/internal/schema/**`
  - `src/internal/validators/**`
  - `src/internal/dsl/**`
