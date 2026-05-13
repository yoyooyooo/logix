# Data Model: React Runtime Scope Unification

## Core Entities

### Runtime Scope

- `runtime`
- `policy`
- `fallback`
- `layer overlay`
- 表示一棵 React 子树当前可见的 runtime 边界

### Program Blueprint

- `module`
- `initial`
- `capabilities`
- `logics`
- `blueprint identity`
- 用来定义如何实例化或组合

### ModuleRuntime Instance

- `moduleId`
- `instanceId`
- `state`
- `dispatch`
- `imports scope`
- 表示真实运行中的实例

### ModuleTag Binding

- `module tag`
- `scope`
- `bound runtime`
- 在某个 scope 下必须单值

### Imported Binding Slot

- `parent runtime`
- `child module tag`
- `child runtime`
- 表示 parent scope 下 child 实例的解析表

### Host Projection Policy

- `mode`
- `preload`
- `syncBudgetMs`
- `yield`
- 属于 `RuntimeProvider` 的 host-only policy

## Boundary Rules

- `RuntimeProvider` 提供 `Runtime Scope`
- `Program Blueprint` 可以生成多个 `ModuleRuntime Instance`
- `ModuleTag Binding` 只在当前 `Runtime Scope` 下解析唯一实例
- `Imported Binding Slot` 只在 parent instance scope 下解析 child

## Example: 同模块双 Program

### Inputs

- `CounterModule`
- `CounterListProgram`
- `CounterEditorProgram`

### Expected Shape

- `CounterListProgram` 与 `CounterEditorProgram` 拥有不同 blueprint identity
- 它们各自可以生成自己的 `ModuleRuntime Instance`
- `CounterModule.tag` 不能在同一个 scope 下同时指向这两个实例
- 若用户需要同时访问它们，必须显式经过不同 parent scope 或不同显式 handle
