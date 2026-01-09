# Quickstart: 083 Named Logic Slots（具名逻辑插槽）

> 目标：让平台能看见模块的“逻辑坑位语义”（required/unique/aspect…）以及当前填充情况（slot→logic），并在非法组合时给出可解释门禁。

## 1) 产物是什么

- `slots`：挂在 `ModuleDef` 的可序列化元数据（语义坑位定义）。
- `slot→logic`：可反射导出的填充关系（用于可视化、替换与门禁）。

## 2) 怎么用（预期写法）

- 在 `Logix.Module.make(id, def)` 的 def 中声明 `slots`（见 `plan.md` 的数据模型与约束口径）。
- 以 Platform-Grade 子集方式表达“某个 logic 填充了哪个 slot”，运行时与 Manifest/IR 都能枚举该映射。

## 3) 如何验收

- 缺失 required slot / 违反 unique slot：必须失败并输出结构化错误（slotName + 冲突 logic refs）。
- slots 定义与 slot→logic 映射：必须稳定排序、可 diff、可 JSON 序列化。

