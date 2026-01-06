# `@logix/react` · 规范索引（渐进式披露）

> **定位**：React 适配层的 SSoT（行为约束 + 推荐 API 形状），用于把 Logix Runtime 接入 React 组件树。

## 建议阅读顺序

1. `01-react-integration.md`：**对外契约主线**（hooks / RuntimeProvider / 多实例与 imports scope 的推荐用法与错误口径）
2. `90-adapter-runtime-integration.md`：更细的实现视角与演进说明（Draft，按需阅读）

## 代码落点（用于深挖）

- Provider：`packages/logix-react/src/RuntimeProvider.ts`（public） / `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`（impl）
- Hooks：`packages/logix-react/src/Hooks.ts`（public） / `packages/logix-react/src/internal/hooks/*`（impl）
- 订阅桥接：`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`（RuntimeStore 单订阅 facade）

## 上游依赖（先建立心智模型）

- Module/Logic/Flow：`../logix-core/api/02-module-and-logic-api.md`、`../logix-core/api/03-logic-and-flow.md`
- Debug/诊断：`../logix-core/observability/09-debugging.md`
