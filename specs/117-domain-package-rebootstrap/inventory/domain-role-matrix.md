# Inventory: Domain Role Matrix

## Goal

把四个领域包的唯一主输出形态、主入口和旧入口去向先钉住，避免继续混成第二套心智。

## Matrix

| Package | Primary Mode | Primary Entry | Auxiliary Entries | Legacy Entries | Notes |
| --- | --- | --- | --- | --- | --- |
| `@logixjs/query` | `program-first` | `src/Query.ts` | `src/Engine.ts`, `src/TanStack.ts`, `src/Fields.ts` | `controller` 语义只留在辅助层 | 主入口围绕 query program/module 组织 |
| `@logixjs/i18n` | `service-first` | `src/I18n.ts` | `src/Token.ts` | `src/I18nModule.ts` | `I18nModule` 继续存在，但退出默认主入口 |
| `@logixjs/domain` | `pattern-kit` | `src/Crud.ts` | `src/index.ts` | `CRUDModule` 命名只作为历史 kit 入口 | 主线强调 pattern-kit，不强调第二个 Module 体系 |
| `@logixjs/form` | `domain-layer` | `src/Form.ts` | `src/FormView.ts`, `src/Field.ts`, `src/react/**` | 直接 field-kernel expert 入口 | Form 保留领域 DSL，react 子树只是宿主邻接层 |

## Current Reading

- query 的默认消费应围绕 `make` 和 query program/module 组合
- i18n 的默认消费应围绕 `I18n` service 与 token contract
- domain 的默认消费应围绕 pattern-kit
- form 的默认消费应围绕 form DSL，不让 expert 入口回流成主写法
