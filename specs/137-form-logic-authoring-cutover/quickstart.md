# Quickstart: Form Logic Authoring Cutover

## 1. 先看哪些页面和路径

- `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- `packages/logix-form/src/index.ts`
- `packages/logix-form/src/internal/form/impl.ts`
- `examples/logix-react/src/demos/form/**`

## 2. 先回答哪些问题

1. 哪条入口是 Form 的唯一默认写法
2. `Form.make + Form.from(schema).logic(...)` 是否已经被所有口径同时承认
3. 哪些能力属于 Form 领域层，哪些只属于 expert route
4. package root、docs、examples、tests 是否在讲同一套话
