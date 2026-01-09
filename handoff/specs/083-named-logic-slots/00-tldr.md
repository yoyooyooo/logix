# 083 · TL;DR（Named Logic Slots：具名逻辑插槽）

目标：把“逻辑坑位语义（required/unique/aspect…）”显式化为 slots，并反射导出 slot→logic 填充关系，支撑可解释组装/替换与门禁。

关键裁决（已回灌到 plan/spec/tasks）：

- 填充表达：唯一权威为 `LogicUnitOptions.slotName?: string`（配置对象→meta），不引入 `.slot()`/wrapper 作为并行真相源。
- 校验阶段：在 mount/implement 阶段执行（不在 `Module.make` 定义时抛错）。
- slotName 约束：`/^[A-Za-z][A-Za-z0-9_]*$/`；未赋槽逻辑不进入 default slot。

下一步：实现落点在 `packages/logix-core/src/Module.ts` + `packages/logix-core/src/internal/runtime/core/LogicUnitMeta.ts` + `packages/logix-core/src/internal/reflection/manifest.ts`（见 `specs/083-named-logic-slots/tasks.md`）。

