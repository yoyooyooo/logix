---
title: Layered Map
status: living
version: 10
---

# Layered Map

## 目标

给当前 AI Native runtime-first 主线定义一份最小分层图。

## 当前总分层

```text
surface / domain kit / react-facing authoring
  -> authoring kernel
    -> declaration compiler
      -> field-kernel
      -> runtime core

runtime control plane
  -> runtime assembly / override / trial / replay / evidence

UI projection
  -> host adapter / scoped runtime wiring
```

## 当前规则

- 分层的作用，是减少耦合、压缩公开面、稳定诊断与性能边界
- 分层不是为了证明“平台必须存在”
- 所有 surface、domain kit、React facade 都必须降到同一个 authoring kernel、declaration compiler 与 runtime core
- `runtime control plane` 只负责装配、治理、验证与证据，不反向长出第二套 authoring surface
- `UI projection` 只表达 package-local host 语义，不承载新的运行时真相源，也不进入公开主链
- 命名后置项继续只在 naming bucket 处理，本页不重开命名争论
- 若某一层不能直接改善 Agent authoring、runtime clarity、performance 或 diagnostics，默认不提升它的存在感

## layer-to-code ownership

| Layer | Primary Code Roots | Owner Spec |
| --- | --- | --- |
| `surface / authoring` | `packages/logix-core/src/*.ts`、`packages/logix-form/**`、`packages/logix-query/**`、`packages/i18n/**`、`packages/domain/**` | `122`、`125`、`127` |
| `declaration compiler` | `packages/logix-core/src/Program.ts`、`packages/logix-core/src/internal/authoring/**`、`packages/logix-core/src/internal/runtime/core/ModuleFields.ts` | `122`、`125` |
| `field-kernel` | `packages/logix-core/src/internal/field-kernel/**`、`packages/logix-form/src/internal/form/**`、`packages/logix-query/src/internal/**` | `125` |
| `runtime core` | `packages/logix-core/src/internal/runtime/core/**` | `123` |
| `runtime control plane` | `packages/logix-core/src/{Runtime,ControlPlane}.ts`、`packages/logix-core/src/internal/{debug,observability,reflection,verification}/**`、`packages/logix-cli/**`、`packages/logix-test/**`、`packages/logix-sandbox/**` | `124` |
| `UI projection` | `packages/logix-react/**`、`examples/logix-react/**` | `126` |

当前仓内的可执行审计落点：

- `packages/logix-core/src/internal/platform/layeredMapPolicy.ts`
- `packages/logix-core/test/Contracts/PlatformLayeredMapPolicy.test.ts`

## 最小 Walkthrough 摘要

可以用一条最短链路理解当前分层：

1. 作者面用 `Program.make(Module, config)` 组织 `initial / capabilities / logics`
2. declaration asset 在 `Program.make(...)` 编译成可执行装配资产
3. React 宿主面只在 package-local host adapter 中承接投影语义
4. 验证与治理通过 `runtime.check / runtime.trial / runtime.compare` 停留在 `runtime control plane`

读法约束：

- `surface / authoring kernel / declaration compiler / field-kernel / runtime core` 是主实现链
- `runtime control plane` 是治理与验证链
- `UI projection` 是宿主投影链
- `field-kernel` 只是一层内部实现，不抬升成独立公开 family

## 层级抬升门槛

只有满足以下任一条件，某一层才值得被明确抬升：

- 能直接减少作者分叉
- 能直接稳定 runtime 边界
- 能直接换来性能收益
- 能直接换来诊断收益

默认拒绝的抬升理由：

- 只是为了平台叙事更完整
- 只是为了给局部 helper 找一个更大的名字
- 没有明确 code roots 和 owner spec

当前不把这三条链重新混成一个“平台主对象”。

## 来源裁决

- [../../adr/2026-04-05-ai-native-runtime-first-charter.md](../../adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../adr/2026-04-12-field-kernel-declaration-cutover.md](../../adr/2026-04-12-field-kernel-declaration-cutover.md)

## 相关规范

- [../runtime/01-public-api-spine.md](../runtime/01-public-api-spine.md)
- [../runtime/04-capabilities-and-runtime-control-plane.md](../runtime/04-capabilities-and-runtime-control-plane.md)
- [./02-anchor-profile-and-instantiation.md](./02-anchor-profile-and-instantiation.md)
- [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)

## 当前一句话结论

当前分层只服务于 AI Native runtime-first 主线；任何层级若只是为了平台叙事存在，默认删除或后置。
