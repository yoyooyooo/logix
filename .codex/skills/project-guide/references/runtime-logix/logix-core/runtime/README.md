# `@logix/core` · Runtime 内核（渐进式披露）

> **定位**：运行时执行模型与不变量（引擎作者/平台集成方按需阅读）。

## 建议阅读顺序

1. `05-runtime-implementation.md`：事务窗口、Scope、ModuleRuntime、EffectOp 总线等
2. `11-error-handling.md`：错误分层、兜底链路与诊断口径

## 相关实现入口（代码）

- ModuleRuntime：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- App/Runtime 组装：`packages/logix-core/src/Runtime.ts`、`packages/logix-core/src/internal/runtime/AppRuntime.ts`
- StateTransaction：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
