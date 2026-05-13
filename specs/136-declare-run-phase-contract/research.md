# Research: Declare Run Phase Contract

## Decision 1: 公开作者面先收口到 declaration 与 run 语义

- runtime 已经天然区分注册性工作与运行性工作
- 继续把 `{ setup, run }` 暴露成 canonical form 只会放大旧相位心智
- 具体公开拼写应当延后到实现选择，先把单一 builder 与无第二 phase object 写死

## Decision 2: 内部允许保留两段执行计划

- runtime 的真实执行仍需要先收集注册，再启动运行
- 这层只能停在 internal normalized descriptor，不再当公开对象

## Decision 3: `$.lifecycle.*` 与 `$.fields(...)` 共享 declaration contract

- 两者本质上都是注册动作
- 若继续分散在多套 phase model，中间层会不断长厚

## Decision 4: `Module.make({ fields })` 退出 canonical path

- direct field-kernel path可以保留为 expert route
- canonical docs/examples/package defaults 需要把它降级

## Decision 5: `setup` 只保留为 internal normalized carrier

- runtime 和 workflow 仍可继续使用 `setup + run` 承载安装顺序
- 公开作者面、错误文案与 docs 不再把 `setup` 讲成 phase object
- `ModuleFactory` 统一把单阶段 logic 归一化到 internal `setup: Effect.void`

## Decision 6: Bound API 内部显式切成 declaration-only 与 run-only 两组能力

- `$.lifecycle.*` 与 `$.fields(...)` 统一走 declaration-only 注册链
- `$.root.resolve`、`$.fields.source.refresh(...)` 等运行期能力走 run-only 能力链
- phase guard 与 diagnostics 继续以 declaration/run 词汇解释

## Validation Note

- 验证期间曾命中过 `proto 0.50.2` shim 的系统代理探测崩溃
- 当前已升级到 `proto 0.56.0`，常规 `pnpm typecheck` 恢复可用
