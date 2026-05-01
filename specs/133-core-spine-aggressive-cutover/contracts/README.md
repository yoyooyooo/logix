# Contracts: Core Spine Aggressive Cutover

本 spec 不新增 HTTP / RPC 契约。
这里记录的是公开 authoring contract 与禁止项。

## Public Authoring Contract

### Canonical

```ts
const ModuleDef = Logix.Module.make('X', {
  state: ...,
  actions: ...,
})

const SomeLogic = ModuleDef.logic('some-logic', ($) => ...)

const ChildProgram = Logix.Program.make(ModuleDef, {
  initial: ...,
  logics: [SomeLogic],
})

const RootProgram = Logix.Program.make(RootModule, {
  initial: ...,
  capabilities: {
    services: [...],
    imports: [ChildProgram],
  },
  logics: [...],
})

const runtime = Logix.Runtime.make(RootProgram)
const report = yield* Logix.Runtime.trial(RootProgram, options)
```

## Forbidden Public Shapes

- `Module.implement(...)`
- `Program.make(..., { imports: [...] })` 作为 canonical 主写法
- `capabilities.imports: [ChildProgram.impl]`
- `capabilities.imports` 同时接受 `Module`
- 公开 `TrialRun*` 命名
- 在 root barrel 默认暴露未定性的 expert surface

## Root Barrel Principle

root barrel 只保留显式 allowlist。
所有 expert surface 都必须：

- 迁到更窄的 subpath import
- 或进入 allowlist ledger

## Business Mapping Principle

- `Module` 看业务边界
- `Logic` 看行为
- `Program` 看挂载与复用单元
- `Runtime` 看运行容器
