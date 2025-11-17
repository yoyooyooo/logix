# 9) `@logix/domain`（Feature Kit：CRUDModule 等领域模块）

## 你在什么情况下会用它

- 想用“模块化”的方式封装通用业务模式（例如 CRUD），并通过 Layer 注入 API 实现。

## 核心概念（以 CRUDModule 为例）

- `CRUDModule.make(id, { entity, query?, id?, initial?, idField? })` 生成可组合模块。
- 需要注入 `Crud.services.api`（Layer.succeed）才能实际 list/save/remove。
- handle 扩展会暴露 `controller`（`list/save/remove/clearError`），用于业务侧调用。

## 示例入口

- demo：`packages/domain/demos/crud.business.module.ts`
- test（最推荐读的“最小闭环”）：`packages/domain/test/CrudModule.basic.test.ts`
