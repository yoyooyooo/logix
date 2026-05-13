# Quickstart: Declare Run Phase Contract

## 1. 先看哪些页面和路径

- `docs/ssot/runtime/03-canonical-authoring.md`
- `docs/ssot/runtime/05-logic-composition-and-override.md`
- `packages/logix-core/src/Module.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts`
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`

## 2. 先回答哪些问题

1. 这条 API 属于 declaration 还是 run
2. 这条 API 是否会逼出第二个显式 phase object
3. 它是否只是 internal normalized descriptor 的一部分
4. 这次收口会不会让旧相位对象继续留在 canonical docs/examples
